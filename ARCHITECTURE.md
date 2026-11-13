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
backend and a real device matrix. `opurom bench`
reports measured elapsed times and artifact sizes for the operations that actually run here.

## One source, two viewports, two targets

`opuromc` compiles one `.opu` file into one IR. That IR is the only input to viewport rendering
and to target lowering: `opurom-render <ir.json> <width> <height>` selects a width breakpoint
(compact below 600, then medium, expanded, wide and ultra), and
`opuromc target <ir.json> --target <name> -o <dir>` lowers the same file to each of the nine
emitters. No source or feature-code change accompanies a viewport or target change.

`scripts/adaptive.mjs` verifies this mechanically. It compiles one example source once, renders
that IR at 360x740 and 1440x900, and requires the two frame digests to differ; differing digests
at distinct breakpoints demonstrate layout reflow rather than scaling. It then lowers the same IR
to `web` and `native` and requires every artifact declared by `opuromc targets` to be present
and non-empty. The IR digest is compared before and after these steps, so the run also checks
that the single IR was not rewritten between consumers. Run it with `npm run adaptive` in
`opurom-spec`; `npm test` includes the same proof.

