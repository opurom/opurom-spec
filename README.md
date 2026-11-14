# OPUROM Specification v0.1 (normative)

This repo is the single source of truth for cross-layer contracts. All other projects
implement these documents; none of them may redefine them.

| Document | Defines |
| --- | --- |
| [LANG_SPEC.md](LANG_SPEC.md) | OPUROM Lang source syntax, typing, diagnostics |
| [IR_SCHEMA.md](IR_SCHEMA.md) | `*.opuir.json` interchange format, node kinds, actions |
| [ADAPTER_CONTRACT.md](ADAPTER_CONTRACT.md) | Platform adapter ABI, event model, capability registry |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Four layers, target matrix, quality bar, roadmap |
| [IR_ADDITIONS.md](IR_ADDITIONS.md) | Additive IR: multi-actions, conditionals, style, 24 kinds |
| [LANGUAGE_ADDITIONS.md](LANGUAGE_ADDITIONS.md) | Language additions: if/for/theme/effects/state expressions |
| [WASM_ABI.md](WASM_ABI.md) | 9th emitter: wasm32 C ABI + host |
| [PLUGIN_PROTOCOL.md](PLUGIN_PROTOCOL.md) | Process-isolated plugin protocol v1 + local registry |
| [LSP_SCOPE.md](LSP_SCOPE.md) | Language-server contract |
| [FULLSTACK_SPEC.md](FULLSTACK_SPEC.md) | Single-file full-stack syntax, HTTP contract, backend rules |
| [COMPONENTS_AND_A11Y.md](COMPONENTS_AND_A11Y.md) | Component catalog, a11y, optimizer, scheduler, debugger, terminal adapter |
| [TOOLCHAIN_AND_PACKAGES.md](TOOLCHAIN_AND_PACKAGES.md) | async/await, modules, packages, SVG backend, profiling, hardening |
| [GPU_WINDOW_TRANSPORT.md](GPU_WINDOW_TRANSPORT.md) | Metal GPU, AppKit window, animation, language, PostgreSQL, HTTP features |
| [PLATFORM_DELIVERY.md](PLATFORM_DELIVERY.md) | GPU raster, browser hybrid, mobile artifacts, components, minify, signing |
| [NATIVE_NETWORK.md](NATIVE_NETWORK.md) | TLS, live native window, Android library, PG server, WebSocket, measurement |
| [BROWSER_AND_NATIVE_SURFACES.md](BROWSER_AND_NATIVE_SURFACES.md) | visual effects, browser matrix, Win32/X11, mTLS, MySQL, sync |
| [PRODUCTION_BREADTH.md](PRODUCTION_BREADTH.md) | GPU effects, HTTP/2, IntelliJ plugin, marketplace, scheduler, DAP |
| [COMPONENT_LIBRARY_HARDENING.md](COMPONENT_LIBRARY_HARDENING.md) | 100+ primitives, GPU presentation, tree shaking, plugins, OCSP/CRL, caching_sha2 |
| [INTEGRATION_ADDITIONS.md](INTEGRATION_ADDITIONS.md) | mobile real rendering, GPU loop, LSP completeness, gallery |
| [TRANSPORT_AND_LANGUAGE_ADDITIONS.md](TRANSPORT_AND_LANGUAGE_ADDITIONS.md) | HTTP/3, static typing, five-tier layout, Wayland wire protocol |
| [ANIMATION_AND_PHYSICS.md](ANIMATION_AND_PHYSICS.md) | integer-only inertia curve, restitution, contact and determinism contract |
| [components.json](components.json) | 240 named components mapped to 100 distinct primitives |
| [counter.opu](counter.opu) / [counter.opuir.json](counter.opuir.json) | Golden pair: the compiler must lower the former into the latter |
| [scripts/validate.mjs](scripts/validate.mjs) | Contract validator: catalog, golden IR, emitter table, index links |

Version rule: `ir: "0.1"` in every IR file. A consumer MUST reject other versions with a
clear diagnostic. Breaking changes bump the version and are a new round's work, not a quiet edit.

## Component catalog (COMPONENT_LIBRARY_HARDENING section 1)

[components.json](components.json) is the single source of truth for the
component catalog. It extends from 116 names / 32 primitives to **240 named
components mapped onto 100 DISTINCT primitive kinds** (32 earlier kinds + 68 extended
kinds). It is vendored byte-for-byte by `opurom-lang/src/catalog.json` (enforced by CI), and
`opuromc components` prints `240 components`.

Every new primitive kind has a real, deterministic software drawing, a
documented prop schema and a default a11y role in `opurom-render`. The three V0.1
golden digests and plain counter/profile/todo IR are unchanged.

The other six component-library workstreams (GPU presentation, tree shaking, native plugins,
certificate status, MySQL caching_sha2_password) are specified in
[COMPONENT_LIBRARY_HARDENING.md](COMPONENT_LIBRARY_HARDENING.md) and implemented in their own repositories.

## Contract validator

[scripts/validate.mjs](scripts/validate.mjs) checks the published contract files against each
other: `components.json` counts, entry shape and name uniqueness; the golden IR's version, node
ids, children, node kinds and event ops against [IR_SCHEMA.md](IR_SCHEMA.md) and
[LANG_SPEC.md](LANG_SPEC.md); the target emitter table against the mini-program package section;
and the relative links in this index. `node scripts/validate.mjs` exits 0 with a summary line or
1 with a diagnostic for each violation; `npm test` runs the checks and a corruption test for
each of them.
