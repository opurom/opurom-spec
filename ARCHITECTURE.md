# OPUROM Architecture (v0.1 baseline)

## Four layers

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

CLI, IDE plugins and examples are separate projects (own repos), never part of the four layers.

## Data flow

```
.opu ──frontend──▶ IR JSON ──backend──▶ target source ──platform compiler──▶ binary/bundle
                     │
                     ├──▶ kernel runtime (state + patches)
                     ├──▶ renderer (layout + RGBA frame + dirty rects)
                     └──▶ adapter (input normalization + present)
```

IR is JSON, so CLI/IDE tooling (Node) and the Rust layers share one contract without FFI.

## Quality bar (measured, not asserted)

| Property | v0.1 check |
| --- | --- |
| Pixel consistency | golden RGBA hash, same IR + viewport → identical bytes |
| Incremental render | no state change → zero dirty rects; one change → bounded dirty rect |
| Fault isolation | panicking plugin is disabled; kernel keeps serving; no process abort |
| Type safety | negative compile tests for each LANG_SPEC error class |
| Lowering correctness | golden `counter.opu` → golden IR, deep-equal |
| Target validity | generated JS passes `node --check`; native output builds and runs |
| Hot reload | `opurom dev` recompiles on file change and notifies connected clients |
| Repo hygiene | each project has its own git repo, English Conventional commits, clean tree |

Benchmarks (fps, cold start, binary size) get real numbers only when there is a real GPU
backend and a real device matrix; v0.1 reports no invented figures.

## Round roadmap

- **R1 (this round)**: frozen spec, five parallel workstreams, end-to-end golden slice, CLI,
  IDE grammar, docs, per-project git history.
- **R2+**: WASM emitter + wasm32 build, GPU backend, animation/theme system, component library,
  native adapters per OS with real conformance runs, LSP + debugger, plugin sandboxing, perf
  harness. Each round keeps `opurom test` green and updates the status table.

## Honest scope

v0.1 is a working framework skeleton with real, tested mechanisms — not a shipping SDK for
every OS. Platform columns marked `Scaffold`/`Planned` mean exactly that. This is intentional:
a verifiable narrow path beats twelve untested claims.
