# OPUROM Specification v0.1 (normative)

This repo is the single source of truth for cross-layer contracts. All other projects
implement these documents; none of them may redefine them.

| Document | Defines |
| --- | --- |
| [LANG_SPEC.md](LANG_SPEC.md) | OPUROM Lang source syntax, typing, diagnostics |
| [IR_SCHEMA.md](IR_SCHEMA.md) | `*.opuir.json` interchange format, node kinds, actions |
| [ADAPTER_CONTRACT.md](ADAPTER_CONTRACT.md) | Platform adapter ABI, event model, capability registry |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Four layers, target matrix, quality bar, roadmap |
| [IR_R2_ADDENDUM.md](IR_R2_ADDENDUM.md) | R2 additive IR: multi-actions, conditionals, style, 24 kinds |
| [LANG_R2_ADDENDUM.md](LANG_R2_ADDENDUM.md) | R2 language: if/for/theme/effects/state expressions |
| [WASM_ABI.md](WASM_ABI.md) | 9th emitter: wasm32 C ABI + host |
| [PLUGIN_PROTOCOL.md](PLUGIN_PROTOCOL.md) | Process-isolated plugin protocol v1 + local registry |
| [LSP_SCOPE.md](LSP_SCOPE.md) | R2 language-server contract |
| [FULLSTACK_SPEC.md](FULLSTACK_SPEC.md) | Single-file full-stack syntax, HTTP contract, backend rules |
| [R3_ADDENDUM.md](R3_ADDENDUM.md) | Component catalog, a11y, optimizer, scheduler, debugger, terminal adapter |
| [R4_ADDENDUM.md](R4_ADDENDUM.md) | async/await, modules, packages, SVG backend, profiling, hardening |
| [R5_ADDENDUM.md](R5_ADDENDUM.md) | Metal GPU, AppKit window, animation, language, PostgreSQL, HTTP features |
| [R6_ADDENDUM.md](R6_ADDENDUM.md) | GPU raster, browser hybrid, mobile artifacts, components, minify, signing |
| [R7_ADDENDUM.md](R7_ADDENDUM.md) | TLS, live native window, Android library, PG server, WebSocket, measurement |
| [components.json](components.json) | 116 named components mapped to 32 primitives |
| [counter.opu](counter.opu) / [counter.opuir.json](counter.opuir.json) | Golden pair: the compiler must lower the former into the latter |

Version rule: `ir: "0.1"` in every IR file. A consumer MUST reject other versions with a
clear diagnostic. Breaking changes bump the version and are a new round's work, not a quiet edit.
