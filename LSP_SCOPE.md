# OPUROM LSP scope (normative)

New independent project `opurom-lsp`, zero npm dependencies, Node builtins only. Entry:
`node opurom-lsp/bin/server.mjs --stdio`. Framing is standard LSP `Content-Length: N\r\n\r\n<JSON>`.
No third-party `vscode-languageserver` package.

## Supported methods

| Method | Behaviour |
| --- | --- |
| `initialize` | returns `serverInfo` (`opurom-lsp` 0.1.0) and `capabilities`: textDocumentSync=1 (full), hoverProvider, completionProvider with trigger characters `:`, `"` and space, definitionProvider, diagnosticProvider, documentSymbolProvider, referencesProvider, renameProvider with `prepareProvider: true`, documentFormattingProvider, codeActionProvider |
| `initialized`, `shutdown`, `exit` | lifecycle; `exit` ends the process with 0 if shutdown was seen, 1 otherwise |
| `textDocument/didOpen`, `didChange` | stores the full document text, writes it to a temp `.opu` file, runs `opuromc check`, parses `path:line:col: error: msg` / `help:` lines, publishes `textDocument/publishDiagnostics`; a check superseded by a newer edit does not publish |
| `textDocument/didClose` | drops the document and publishes empty diagnostics for its URI |
| `textDocument/hover` | Markdown for a declared state (type, initializer, declaration line), a model (fields), a node kind (props, children, handler), a canonical prop (type, shortcut), an `animate` preset or a keyword |
| `textDocument/completion` | the 24 node kinds with their props, keywords, canonical props and shortcuts, `animate` presets, API verbs, model field types, plus the declared states, models, model fields, API paths and handlers of the open document |
| `textDocument/definition` | on a state or model name, the location of its declaration in the same document |
| `textDocument/documentSymbol` | hierarchical outline: the `app` as a namespace root with states, models with fields, the `api` block with its handlers, the `theme` block and the component tree; every entry carries a full range and a selection range |
| `textDocument/references` | every classified occurrence of the state under the cursor — declaration, `{state}` interpolation, `bind:`-style prop value, condition, action-body target and expression — honouring `context.includeDeclaration` |
| `textDocument/prepareRename` | validates the position before `rename`: returns the state-name range and placeholder, or error `-32602` when the position is not on a declared state occurrence |
| `textDocument/rename` | a `WorkspaceEdit` replacing every occurrence that `references` reports; rejects invalid identifiers, keywords, existing state names and non-renameable positions with `-32602` |
| `textDocument/formatting` | one whole-document `TextEdit` from a fresh token-stream emission: two-space indentation, `{` ends a line, `}` starts one, an empty block stays on one line, spacing follows the neighbouring token kinds; comments, string literals and single blank lines survive and a second pass returns identical text |
| `textDocument/codeAction` | quick fixes for the compiler's `unknown state` diagnostic: insert the declaration the `help:` line recommends after the last app-level `state` declaration, and — only when the help names exactly one existing state — replace the offending name with it |

Hover, completion, definition, document symbols, references, rename, formatting and code actions
run on the in-process parse of the open document, parsed on first use, and never invoke the
compiler. Diagnostics are the feature that runs `opuromc`, on `didOpen` and `didChange` only.

Unknown methods get a proper JSON-RPC error (`-32601`), never a crash; a non-object message or a
request without a method answers `-32600`. Malformed params for any method above answer
`-32602`, internal handler failures answer `-32603`. Malformed frames produce a parse error
response (`-32700`), not a process exit. `opuromc` absence is reported once as a
`window/showMessage` warning plus empty diagnostics; the server stays alive and every
document-derived feature keeps serving.

## Diagnostics mapping

`severity`: 1 for `error`, 2 for `warning`, and `source` is `opuromc`. `range` uses the 1-based
`line:col` from the compiler converted to 0-based, with a 1-character span extended to the token
when available. The `help:` line becomes `diagnostic.message` on a second line.

## Conformance

`opurom-lsp/test/lsp.test.mjs` (node:test) spawns the server and drives 16 framed JSON-RPC tests:
a full session with a stub compiler passed through `--compiler` (initialize → didOpen with a bad
program → diagnostics → hover → completion → definition → shutdown → exit), malformed frames, a
missing compiler, a real-compiler diagnostics session, a full-stack document with models and API
paths, the advertised provider set, one session each for document symbols, references,
prepareRename, rename, formatting and code actions, rename rejections, formatter idempotence
(format → apply → format again → identical bytes), quick fixes that clear the diagnostic, empty
action lists for ambiguous diagnostics, and `-32602` for malformed params on every new request.
The suite is self-contained through the stub compiler fixture; two further sessions run against
the real `opuromc` when it is built. All 16 tests pass.

## Scope

Core scope served today: diagnostics, hover, completion, definition, document symbols, references,
validated rename, document formatting and quick-fix code actions — exactly the set `initialize`
advertises, each one exercised by a framed test. The debugger adapter protocol (DAP) is provided
by the separate `opurom-debug` project; this server owns the language-service surface above.
