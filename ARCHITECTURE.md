# OPUROM Architecture (full-stack)

## Layer diagram

```
+------------------------------------------------------------------------------+
|  Contracts   opurom-spec    language / IR / ABIs / plugin / LSP protocols    |
+------------------------------------------------------------------------------+
|  Compiler    opurom-lang    one .opu -> unified OPUIR (UI + models + api)    |
|  Kernel      opurom-core    state / scheduler / plugin host / fault isolation|
+--------------------------- frontend branch ----------------------------------+
|  Renderer    opurom-render      layout / RGBA raster / dirty rects           |
|  Adapters    opurom-platform    host ABI / headless oracle / capabilities    |
+--------------------------- backend branch -----------------------------------+
|  Service     opurom-server      HTTP router / middleware / SSR / isolation   |
|  Data        opurom-db          Database trait / SQLite / KV / migrations    |
|  Runtimes    opurom-runtime-adapters   native / node / edge / embedded       |
+------------------------------------------------------------------------------+
|  Engineering   cli / lsp / ide-plugins / plugins / examples / tools          |
+------------------------------------------------------------------------------+
```

Layer boundaries: the compiler emits IR only; frontend layers consume the IR tree, backend
layers consume the `models`/`api` arrays, and neither imports the other's source. The kernel is
shared by both branches. CLI, IDE, plugins and examples are separate projects, never part of a
layer.

## Four core layers (frontend)

1. **Kernel (`opurom-core`, Rust)** — reactive state, priority scheduler over a bounded worker
   pool, plugin bus, fault isolation. No GC, no optional UI code, no platform `#cfg` in the
   core logic. Ownership-based memory safety; `catch_unwind` at every plugin boundary.
2. **Compiler (`opurom-lang`, Rust)** — `opuromc` frontend lowers `.opu` → IR; backend lowers IR
   → target-native source. No JS bridge, no interpreter, no bytecode at runtime.
3. **Renderer (`opurom-render`, Rust)** — adaptive layout (breakpoints, fluid grid), self-drawn
   RGBA raster with a built-in bitmap font, incremental dirty-rect diffing, deterministic output.
   The GPU/ANGLE/Metal/Vulkan backend is a later round; the pixel contract is fixed now so the
   backend can be swapped without touching app code.
4. **Adapters (`opurom-platform`, Rust)** — one thin ABI (see ADAPTER_CONTRACT.md) per host.
   Headless is the verified conformance oracle; other platforms are scaffolds until implemented.

## Full-stack data flow

```
todo.opu --opuromc--> OPUIR --+-- frontend lowering --> web / native / mini-program / wasm
                              |                        renderer + adapters (client UI)
                              +-- backend lowering  --> generated Rust service (opurom-server)
                              |                        routes + handlers + SSR
                              +-- data lowering     --> migrations + shared types (opurom-db)
                              +-- runtime lowering  --> native / node / edge / embedded
                                                       (opurom-runtime-adapters)

Runtime: UI event -> local state / HTTP request -> route -> handler -> Database CRUD
         -> JSON response / SSR HTML -> state sync on the client
```

IR is JSON, so CLI/IDE tooling (Node) and the Rust layers share one contract without FFI.
[FULLSTACK_SPEC.md](FULLSTACK_SPEC.md) defines the single-file syntax, the HTTP contract and the
four full-stack rules. Backend code is lowered Rust, never an IR interpreter. The data model in
business code is the only source for shared types, ORM definitions and migration SQL.

## Quality bar (measured, not asserted)

| Property | Check |
| --- | --- |
| Pixel consistency | golden RGBA hash, same IR + viewport → identical bytes |
| Incremental render | no state change → zero dirty rects; one change → bounded dirty rect |
| Fault isolation | panicking plugin/handler is disabled; process keeps serving |
| Type safety | negative compile tests for each LANG_SPEC error class |
| Lowering correctness | golden `counter.opu` → golden IR, deep-equal |
| Target validity | generated JS passes `node --check`; native/wasm output builds and runs |
| Full-stack validity | generated service builds, starts, CRUD round-trip against SQLite, SSR |
| Hot reload | `opurom dev` recompiles frontend and restarts backend on source change |
| Repo hygiene | each project has its own git repo, English-only files, Conventional commits, clean tree, version tags |

Benchmarks (fps, cold start, binary size) get real numbers only when there is a real GPU
backend and a real device matrix; no invented figures appear in this repository. `opurom bench`
reports measured elapsed times and artifact sizes for the operations that actually run here.

## Round roadmap

- **R1**: frozen spec, six parallel workstreams, end-to-end golden slice, CLI, IDE grammar,
  docs, per-project git history. Verified.
- **R2 (this round)**: full-stack backend layer (server, db, runtime adapters), single-file
  model/api syntax, wasm32 emitter, process-isolated plugins + local registry, LSP server +
  VS Code client, renderer effects/animation, CLI full-stack build/serve/bench, GitHub org with
  parallel CI + CI-gated auto-tagging and releases. All R1 checks must stay green.
- **R3+**: Metal/Vulkan/ANGLE GPU backend, OS-native adapters with real device conformance,
  PostgreSQL/MySQL drivers, production Node.js bundling, cloud deployment, 100+ component
  library with accessibility, async/await, modules/package marketplace, debugger (DAP),
  profiler, multi-device sync, build tree-shaking, real fps/size benchmarks.

## Honest scope

R2 is a working full-stack vertical slice with real, tested mechanisms — not a shipping SDK for
every OS and cloud. Platform columns marked `Scaffold`/`Planned` mean exactly that, and the
capability boundary in the umbrella README lists what is and is not implemented. This is
intentional: a verifiable narrow path beats twelve untested claims.
