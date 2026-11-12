# OPUROM Specification v0.1 (normative)

This repo is the single source of truth for cross-layer contracts. All other projects
implement these documents; none of them may redefine them.

| Document | Defines |
| --- | --- |
| [LANG_SPEC.md](LANG_SPEC.md) | OPUROM Lang source syntax, typing, diagnostics |
| [IR_SCHEMA.md](IR_SCHEMA.md) | `*.opuir.json` interchange format, node kinds, actions |
| [ADAPTER_CONTRACT.md](ADAPTER_CONTRACT.md) | Platform adapter ABI, event model, capability registry |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Four layers, target matrix, quality bar, roadmap |
| [counter.opu](counter.opu) / [counter.opuir.json](counter.opuir.json) | Golden pair: the compiler must lower the former into the latter |

Version rule: `ir: "0.1"` in every IR file. A consumer MUST reject other versions with a
clear diagnostic. Breaking changes bump the version and are a new round's work, not a quiet edit.
