# OPUROM Full-Stack Contract (normative)

One `.opu` source file defines the UI, the data model, and the HTTP API. One IR carries all three.
Frontend and backend types therefore have a single source of truth.

## 1. Single-file syntax (additive to LANG_SPEC + LANGUAGE_ADDITIONS)

```opu
app TodoApp {
  model Todo {
    id: int primary
    title: string
    done: bool = false
  }

  api "/todos" {
    list Todo
    create Todo
  }

  api "/todos/:id" {
    get Todo
    delete Todo
  }

  state remaining = 0
  Column(p: 16) {
    Text("Remaining: {remaining}")
    Button("Refresh") { remaining += 1 }
  }
}
```

```ebnf
model_decl  = "model" IDENT "{" { field_decl } "}" ;
field_decl  = IDENT ":" ( "int" | "string" | "bool" ) [ "primary" ] [ "=" literal ] [";"] ;
api_decl    = "api" STRING "{" { handler_decl } "}" ;
handler_decl= ( "list" | "get" | "create" | "update" | "delete" ) IDENT [";"] ;
```

Exactly one `primary` field per model is allowed (zero is legal: an auto `rowid` is used).
`api` path segments may use `:name` parameters; `get`/`update`/`delete` require a path param.
A model name in a handler must be declared. Unimplemented handler verbs are a diagnostic.

## 2. IR additive fields

Top-level optional arrays, ignored by v0.1 consumers:

```json
{
  "models": [
    { "name": "Todo", "fields": [
      { "name": "id", "type": "int", "primary": true, "default": null },
      { "name": "title", "type": "string", "primary": false, "default": null },
      { "name": "done", "type": "bool", "primary": false, "default": false }
    ] }
  ],
  "api": [
    { "path": "/todos", "model": "Todo", "handlers": ["list", "create"] },
    { "path": "/todos/:id", "model": "Todo", "handlers": ["get", "delete"] }
  ]
}
```

`ir` remains `"0.1"`. Field `type` ∈ `int|string|bool`. `default` is a JSON value of that type
or `null`. Shared types are these field definitions — no separate frontend or DTO declarations.

## 3. Lowering targets (backend)

| Tool | Input | Output |
| --- | --- | --- |
| `opurom-serverc` (`opurom-server`) | full-stack IR | standalone Rust service: router, handlers, JSON, SSR route |
| `opurom-migrate` (`opurom-db`) | full-stack IR | `migrations/001_create_<model>.sql`, one file per model |
| `opurom-runtime-adapters` | full-stack IR | runtime conformance report for native/node/edge/embedded adapters |
| `opurom build --target full` | `.opu` | frontend bundle + server crate + migrations + shared types, in one command |

Generated service code is **lowered Rust**, not an IR interpreter. It uses path dependencies on
`opurom-server` and `opurom-db` rooted at the workspace (`--dep-root`, default
`<workspace>`). Generated code is a local build artifact and is never committed.

## 4. Runtime chain

```
UI event → local state / fetch(api path) → route match → handler → Database CRUD → JSON response
                                     ↑                                   │
                                     └────── state sync / SSR HTML ──────┘
```

## 5. HTTP contract of the generated service

- `GET /health` → `{"ok":true,"app":"<name>","version":"0.2.0"}`
- `GET /<path>` (`list`) → JSON array of model rows
- `POST /<path>` (`create`) → inserts from a JSON body, returns the created row
- `GET /<path>/<id>` (`get`) → one row or 404
- `PUT /<path>/<id>` (`update`) → updated row or 404
- `DELETE /<path>/<id>` (`delete`) → `{"deleted":true}` or 404
- `GET /ssr` → server-rendered HTML from the same IR (same theme tokens as the client)
- Unknown path → 404 JSON; panicking handler → 500 JSON, handler disabled after 3 failures.

Requests/responses are JSON with `Content-Type: application/json`. Body size is capped at 1 MiB.
The core contract covers routing, five CRUD verbs and SSR HTML; transport security, authentication
and streaming are provided by the backend runtime as layered features.

## 6. Non-negotiable full-stack rules

7. Frontend and backend share ONE IR and ONE type system. No separate API schema or DTO files.
8. Backend logic is compiled/lowered; no IR interpreter runs in production.
9. The data model in business code is the only source for types, ORM definitions and migrations.
10. Server plugins and handlers are fault-isolated: a panic disables one component, not the process.

## 7. Scope of this round

Implemented and verified: HTTP routing (5 verbs), model CRUD against SQLite via FFI, an embedded
KV driver, migrations generated from IR, a Rust-native service run, SSR HTML, and a Todo example
that is exercised end to end (start server → POST → GET → DELETE).

Not implemented: PostgreSQL/MySQL drivers, Node.js runtime deployment, Serverless adapters
beyond a conformance stub, full middleware/auth, TLS, connection pooling, real device benchmarks.
