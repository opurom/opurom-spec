# OPUROM Lang v0.1

Goal: a beginner writes a full screen in one hour. Static strong typing with full inference,
declarative UI, language-level state, built-in async semantics reserved for v0.2.

## Source

UTF-8 text, extension `.opu`. `//` starts a line comment. Whitespace is insignificant.

```opu
// counter.opu
app Counter {
  state count = 0
  state name = "world"

  Column(gap: 8, padding: 16, align: center) {
    Text("Count: {count}", size: 24)
    Row(gap: 8) {
      Button("-") { count -= 1 }
      Button("+") { count += 1 }
    }
    Text("Hello, {name}")
    Input(placeholder: "Your name", bind: name)
  }
}
```

## Grammar (EBNF, v0.1)

```ebnf
program   = "app" IDENT "{" { decl } "}" ;
decl      = state_decl | node ;
state_decl= "state" IDENT "=" literal [";"] ;
node      = KIND [ "(" [ props ] ")" ] ( ";" | "{" { node | statement } "}" ) ;
props     = prop { "," prop } [ "," ] ;
prop      = IDENT ":" value ;
value     = literal | IDENT ;
literal   = INT | STRING | BOOL ;
statement = IDENT ( "+=" | "-=" | "=" ) expr [";"]
          | IDENT "." "toggle" "(" ")" [";"] ;
expr      = literal | IDENT ;
```

- `IDENT`: `[A-Za-z_][A-Za-z0-9_]*`. `KIND`: capitalized IDENT, restricted to node kinds below.
- A trailing block on `Button` is its `tap` handler. Blocks on containers are children.
- A block may not mix children and statements; the compiler rejects that with a diagnostic.
- `Text` strings interpolate `{name}` against state. `{{` is a literal `{`.
- `Input` with `bind: name` lowers to an `input` event that sets that state.

## Node kinds and props (v0.1)

| Kind | Props | Children | Notes |
| --- | --- | --- | --- |
| `Column` | `gap`, `padding`, `align`, `width` | yes | vertical stack |
| `Row` | `gap`, `padding`, `align`, `width` | yes | horizontal; collapses to a column in compact breakpoint |
| `Container` | `padding`, `width`, `height`, `radius`, `color` | yes | box with background |
| `Text` | `value` (positional arg 1), `size`, `color` | no | interpolation here |
| `Button` | `label` (positional arg 1) | tap handler only | `tap` event |
| `Input` | `placeholder`, `bind` | no | `input` event |
| `Image` | `src`, `width`, `height` | no | src is a resource path |
| `Spacer` | `width`, `height` | no | empty space |

Positional argument: `Text("hi")` ≡ `Text(value: "hi")`; `Button("OK")` ≡ `Button(label: "OK")`.

## Types

Inferred from the initializer: `int` (i64 semantics), `bool`, `string`. Required checks:

1. Duplicate state names → error.
2. Interpolation / `bind` / event target refers to undeclared state → error.
3. `+=` / `-=` on non-`int`, `toggle()` on non-`bool`, assignment type mismatch → error.
4. Unknown node kind, unknown prop for that kind, missing required prop → error.
5. Type of every state and every expression is resolved at compile time; no runtime type tags.

## Diagnostics

Format on stderr: `path:line:col: error: message` followed by `  help: how to fix it`.
Warnings use `warning:`. Exit code 1 on any error, 0 on success. Messages name the offending
token and the expected alternative; no internal panics, no stack traces for user errors.

## Lowering

`opuromc compile <src> -o <out>` writes IR per [IR_SCHEMA.md](IR_SCHEMA.md).
Node ids are assigned in pre-order starting at 0. Props keep source spelling as string keys,
numeric literals stay JSON numbers where typed as such (see schema). State order is source order.
Event handler `count += 1` lowers to `{"op":"add","target":"count","value":1}`;
`-=` lowers to `add` with a negative value; `=` lowers to `set`; `toggle()` lowers to `toggle`.

## v0.2+ (explicitly out of scope this round)

`async`/`await`, `if`/`for` in UI, functions, modules/imports, units/theme tokens, custom
components, animation DSL. The compiler must reject these with a friendly "not yet supported"
diagnostic rather than silently miscompiling.
