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
| [R8_ADDENDUM.md](R8_ADDENDUM.md) | visual effects, browser matrix, Win32/X11, mTLS, MySQL, sync |
| [R9_ADDENDUM.md](R9_ADDENDUM.md) | GPU effects, HTTP/2, IntelliJ plugin, marketplace, scheduler, DAP |
| [R10_ADDENDUM.md](R10_ADDENDUM.md) | 100+ primitives, GPU presentation, tree shaking, plugins, OCSP/CRL, caching_sha2 |
| [components.json](components.json) | 216 named components mapped to 100 distinct primitives |
| [counter.opu](counter.opu) / [counter.opuir.json](counter.opuir.json) | Golden pair: the compiler must lower the former into the latter |

Version rule: `ir: "0.1"` in every IR file. A consumer MUST reject other versions with a
clear diagnostic. Breaking changes bump the version and are a new round's work, not a quiet edit.

## R10 component catalog (R10_ADDENDUM section 1)

[components.json](components.json) is the single source of truth for the
component catalog. R10 extends it from 116 names / 32 primitives to **216 named
components mapped onto 100 DISTINCT primitive kinds** (32 R1-R9 + 68 R10). It is
vendored byte-for-byte by `opurom-lang/src/catalog.json` (enforced by CI), and
`opuromc components` prints `216 components`.

Every new primitive kind has a real, deterministic software drawing, a
documented prop schema and a default a11y role in `opurom-render`. The three V0.1
golden digests and plain counter/profile/todo IR are unchanged.

Honest scope: one deterministic software drawing per kind; no real font shaping,
no image decoding, no platform-native widgets and no frame-rate / 120fps claim.
The other six R10 workstreams (GPU presentation, tree shaking, native plugins,
certificate status, MySQL caching_sha2_password) are specified in
[R10_ADDENDUM.md](R10_ADDENDUM.md) and implemented in their own repositories.
