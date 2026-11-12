# OPUROM LSP scope (R2, normative)

New independent project `opurom-lsp`, zero npm dependencies, Node builtins only. Entry:
`node opurom-lsp/bin/server.mjs --stdio`. Framing is standard LSP `Content-Length: N\r\n\r\n<JSON>`.
No third-party `vscode-languageserver` package.

## Supported methods

| Method | Behaviour |
| --- | --- |
| `initialize` | returns `capabilities`: textDocumentSync=1 (full), hoverProvider, completionProvider, definitionProvider, diagnosticProvider |
| `initialized`, `shutdown`, `exit` | lifecycle; `exit` ends the process with 0 if shutdown was seen |
| `textDocument/didOpen`, `didChange` | writes document to a temp `.opu` file, runs `opuromc check`, parses `path:line:col: error: msg` / `help:` lines, publishes `textDocument/publishDiagnostics` |
| `textDocument/hover` | returns Markdown for a known state name (`type`, initializer) or node kind (its props) |
| `textDocument/completion` | returns the 24 node kinds, keywords, canonical props and declared state names |
| `textDocument/definition` | on a state name, returns the location of its `state` declaration in the same document |

Unknown methods get a proper JSON-RPC error (`-32601`), never a crash. Malformed frames produce a
parse error response, not a process exit. `opuromc` absence is reported once as a
`window/showMessage` warning plus empty diagnostics; the server stays alive.

## Diagnostics mapping

`severity`: 1 for `error`, 2 for `warning`. `range` uses the 1-based `line:col` from the compiler
converted to 0-based, with a 1-character span extended to the token when available. The `help:`
line becomes `diagnostic.message` on a second line.

## Conformance

`opurom-lsp/test/lsp.test.mjs` (node:test) spawns the server, performs a real JSON-RPC session
(initialize → didOpen with a bad program → diagnostics → hover → completion → definition →
shutdown → exit), asserts each response, and runs with a stub compiler on PATH so it is
self-contained. A second test uses the real `opuromc` when available.

## Scope

R2: diagnostics, hover, completion, definition. R3+: formatting, rename, references, code actions,
semantic tokens, workspace symbols, debugger adapter protocol (DAP), profiler views.
