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
state_decl= "state" IDENT [ ":" type_name ] "=" literal [";"] ;
node      = KIND [ "(" [ props ] ")" ] ( ";" | "{" { node | statement } "}" ) ;
props     = prop { "," prop } [ "," ] ;
prop      = IDENT ":" value ;
value     = literal | IDENT ;
literal   = INT | STRING | BOOL ;
type_name = "int" | "bool" | "string" ;
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

Inferred from the initializer: `int` (i64 semantics), `bool`, `string`. A state declaration may
carry an optional type annotation - `state count: int = 0` - which the compiler checks against the
initializer; an annotation that disagrees with the initializer is an error. An annotated program
and its untyped equivalent lower to byte-identical IR.

Required checks:

1. Duplicate state names → error.
2. Interpolation / `bind` / event target refers to undeclared state → error.
3. `+=` / `-=` on non-`int`, `toggle()` on non-`bool`, assignment type mismatch → error.
   Every such diagnostic names the expected type and the found type.
4. A condition (`if` / `when` / `unless`) must be a `bool` value → error.
5. Unknown node kind, unknown prop for that kind, missing required prop → error.
6. A component parameter with a declared type is checked at every call site; an omitted type is
   inferred from the first call site and every later call site is checked against it → error.
7. Type of every state and every expression is resolved at compile time; no runtime type tags.

## Diagnostics

Format on stderr: `path:line:col: error: message` followed by `  help: how to fix it`.
Warnings use `warning:`. Exit code 1 on any error, 0 on success. Messages name the offending
token and the expected alternative; no internal panics, no stack traces for user errors.

## Lowering

`opuromc compile <src> -o <out>` writes IR per [IR_SCHEMA.md](IR_SCHEMA.md).
Node ids are assigned in pre-order starting at 0. Props keep source spelling as string keys,
numeric literals stay JSON numbers where typed as such (see schema). State order is source order.
Event handler `count += 1` lowers to `{"op":"add","target":"count","value":1}`;
`-=` with a literal lowers to `add` with a negative value, and with a state name lowers
to `{"op":"sub", ..., "valueFrom":"<name>"}`; `=` lowers to `set`; `toggle()` lowers to `toggle`.

A `theme { ... }` block accepts `mode`, `accent`, `radius` and `fontScale`.
`fontScale` is a number in 0.5..3.0 and lowers to the optional `theme.fontScale` IR key,
which sets the text scale for every node that does not declare its own `fontScale` prop.
A local prop always wins. The key is emitted only when the source declares it.

## Language levels

`v0.1` defines the core declarative syntax: app, state, component tree, events and actions.
Additive language levels extend it with `async`/`await`, module imports, `if`/`for` in UI,
theme tokens, custom components, computed and list-valued state, and animations. A compiler
targeting a later level must still compile every `v0.1` program to byte-identical IR.
