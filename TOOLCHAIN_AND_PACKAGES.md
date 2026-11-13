# OPUROM Toolchain and Packages Addendum (normative)

The async language layer targets language expressiveness, offline packaging and production
hardening. All changes are **additive**: all earlier IR versions stay valid, golden digests stay
unchanged, and every existing test stays green. No new external crate is required (the host
network may be unavailable; builds use cached crates with `--offline` where applicable).

## 1. Language: async/await effects

```opu
app AsyncDemo {
  state count = 0
  state payload = "idle"

  Button("Load") async {
    await delay(50)
    await fetch("/todos", payload)
    count += 1
  }
}
```

- `async` may follow a node's tap-handler block. Only `async` blocks may contain `await`.
- Two effect statements, both compile-time lowered (no runtime interpreter):
  `await delay(INT)` and `await fetch(STRING, IDENT)`. The second performs an HTTP GET to the
  given path at runtime and stores the response body in the named **string** state.
- IR: `events.<name>` gains optional `"async": true` and
  `"effects": [{"kind":"delay","ms":50},{"kind":"fetch","path":"/todos","into":"payload"}]`.
  A v0.1 consumer ignores both keys and still applies `actions` (documented degradation).
- `await` outside `async` is a diagnostic; `fetch` into a non-string state is a diagnostic;
  `delay` must be 0..60000; duplicate `async` keyword is a diagnostic.
- Emitters implement effects with each target's native async facility: web `async/await` +
  `fetch`, native a std-only deterministic sequencer (delay as a measured busy-free step,
  fetch against `OPR_BASE_URL` when set, otherwise a documented local result), mini-programs
  their `request` API, wasm via host callbacks. Per-target status is documented.

## 2. Language: modules

```opu
import "models/todo.opu"
import "ui/cards.opu"
```

- An imported file may declare `state`, `model`, `api`, `theme` and `imports` only. Declarations
  are merged into the importing program's IR; duplicate names are a diagnostic.
- Paths are relative to the importing file, must end in `.opu`, may not escape the project root
  (`..` traversal rejected), and cycles are detected with a readable diagnostic.
- IR gains optional top-level `"imports": ["models/todo.opu", ...]`. Consumers ignore it.
- `opurom.json` (project manifest, written by `opurom-pkg`) may declare `moduleRoots` and
  `dependencies`; the compiler resolves imports against those roots. Missing manifest is fine.

## 3. Offline package manager (`opurom-pkg`, new project)

- Manifest `opurom.json`: `{name, version, moduleRoots:[...], dependencies:{name:"0.1.0"}}`.
- `opurom.lock`: deterministic JSON with `{name, version, path, sha256, files}` per dependency.
- Registry is a local directory of packages (`<name>/<version>/opurom-pkg.json` + `.opu` files).
- CLI: `init`, `add <name>@<version>`, `remove`, `list`, `verify` (recomputes SHA-256 of every
  file, detects tampering, refuses traversal paths), `lock` (regenerates the lockfile).
- Zero dependencies, node builtins only. `verify` is the trust boundary: a tampered or missing
  file must fail loudly. No network marketplace, no remote resolution, no code execution.

## 4. Vector renderer backend (`opurom-render`)

- `opurom-render <ir> <w> <h> <out.ppm> --svg <out.svg>` writes a deterministic SVG 1.1
  snapshot of the same layout: rects/rounded rects, gradients as `linearGradient`, text as
  `<text>` with the built-in font metrics, a11y roles as `data-role`. Byte-identical for the
  same IR+viewport+state. No external crate.
- Eight new **distinct** primitives (drawn, not aliased): `Table`, `Chart`, `Calendar`,
  `RichText`, `Player`, `Map`, `Menu`, `Tooltip` → 32 primitives total. Each has a documented
  prop schema and a distinct deterministic raster. The 108-name catalog gains 8 names mapping
  onto them (116 total, 32 primitives).
- V0.1 golden digests MUST NOT change.

## 5. Profiling and inspection (`opurom-cli`)

- `opurom profile --src <.opu> --frames N`: renders N frames with the real renderer and reports
  **measured** p50/p95/min/max milliseconds and achieved fps from those measurements, plus a
  note that this is a software raster on this host, not a device benchmark. N defaults to 30,
  capped at 600.
- `opurom inspect <ir>`: prints a deterministic layer tree (id, kind, bounds, dirty-rect status)
  and the a11y tree side by side. Read-only; never mutates the IR.
- Both use real measured values only; unavailable measurements say `n/a (reason)`.

## 6. Server hardening (`opurom-server` + `opurom-db`)

- A `Send`-safe pooled SQLite handle (Mutex-guarded) so the generated service shares one
  connection instead of opening one per request. Add a concurrency test with N simultaneous
  requests.
- Per-route token-bucket rate limiting with a deterministic fixed-window counter, returning
  `429` JSON with `Retry-After`; configurable via `OPR_RATE_LIMIT`.
- Structured request logging: one JSON line per request (`method, path, status, elapsed_ms`) to
  stderr. Measured elapsed time only.
- All three must be opt-in-compatible: existing behaviour with no env vars stays byte-identical.

## 7. JetBrains IDE support (`opurom-ide-plugins`)

- Add a `jetbrains/` subproject inside the existing repo: a TextMate-style `.opu` grammar subset,
  an LSP client configuration stub, `plugin.xml` metadata, and a validation script that checks
  JSON/XML well-formedness, keyword coverage and the documented capability list.
- Keep `vscode-opurom/` and `scripts/validate.mjs` green.


