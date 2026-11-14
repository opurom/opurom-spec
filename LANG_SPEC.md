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

`particles` is accepted on every node kind. It is a comma-separated `name=value` field list in one
string: `count` is required and must be an integer 0..512, `seed` must be an integer
0..4294967295 (default 1), `radius` an integer 0..32 (default 2), `alpha` an integer 0..1024
(default 1024, fixed point with 1024 fully opaque), and `color` an optional `#RRGGBB`. A missing
`=`, a duplicate field, an unknown field, a non-integer value or a value outside its range is an
error naming the field. The prop lowers to the bounded `props.particles` object of
[IR_ADDITIONS.md](IR_ADDITIONS.md).

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

A `particles` field list lowers to the bounded object in [IR_ADDITIONS.md](IR_ADDITIONS.md), with
the documented defaults applied for omitted fields; the `color` key is emitted only when the
source declares it.

## Responsive layout and project files

`opurom-render` selects a layout tier with `Breakpoint::from_width(width: u32)` from the
viewport width in logical pixels. The five `Breakpoint` variants have these exact boundaries:

| Tier | Width (logical px) |
| --- | --- |
| `Compact` | `< 600` |
| `Medium` | `< 900` |
| `Expanded` | `< 1200` |
| `Wide` | `< 1600` |
| `Ultra` | `>= 1600` |

- `Row` uses `Direction::Horizontal` except at `Breakpoint::Compact`, where `direction`
  returns `Direction::Vertical` and the children stack vertically.
- `Grid` calls `fluid_grid` when the tier is `Expanded` or higher and the node declares no
  `columns` prop. The function sets `columns = clamp(width / MIN_COLUMN_WIDTH, 1, MAX_GRID_COLUMNS)`
  with `MIN_COLUMN_WIDTH = 120` and `MAX_GRID_COLUMNS = 12`, plus
  `margin = clamp(width / 40, 8, 32)` and `gutter = clamp(width / 60, 8, 24)`. At
  `Breakpoint::Compact` a `Grid` stacks to one column unless it declares `compactColumns`,
  which sets the compact column count for a node that is really one horizontal row.
  In every other case `Grid` uses the declared `columns` prop (default 2, minimum 1)
  with zero gutter. Mini-program targets lower `Grid` to a wrapping flex row with
  percentage-width cells, preferring `compactColumns` when declared, because their
  stylesheets have no CSS Grid. They emit `theme.tokens.stage` as the `page`
  background colour (falling back to `surface`, then white), and lower `glass`
  to the normative liquid-glass lamina with its light and dark tints. All terms
  are integer divisions of a non-negative width.

A project is one `main.opu` plus the modules it reaches through `import "models/todo.opu"`.
`opuromc compile` resolves each import relative to the importing file or a `moduleRoots` entry in
`opurom.json`, requires the `.opu` extension, and rejects absolute paths, `..` traversal, targets
that escape the project root and import cycles. An imported module may declare only
state, model, api, theme and imports; the compiler merges those declarations into one `Program`
before lowering. Viewport width is a render-time input: the same IR reflows at every tier and
lowers to each emitter without changes to the source tree.

## Icon names

`Icon` requires a `name` prop. The compiler checks a literal `name` against the built-in icon
set at compile time and rejects an unknown name with a diagnostic that names the node and the
valid set; the renderer's icon module mirrors the same set so the compiler and the renderer agree
on every accepted name. The set has 31 names: `home`, `settings`, `star`, `search`, `plus`,
`minus`, `check`, `close`, `arrow_back`, `arrow_forward`, `refresh`, `lock`, `user`, `bell`,
`heart`, `info`, `warning`, `chevron_right`, `chevron_down`, `download`, `upload`, `play`,
`pause`, `edit`, `delete`, `eye`, `calendar`, `location`, `folder`, `mail`, `chat`.

`IconButton` lowers to `Button` and carries no icon name. `SVGIcon` and `MaterialIcon` lower to
`Icon` and are validated against the same set. `color` and `border` are generic props accepted on
every node; `size` is not a prop of `Icon`. A name that interpolates state is resolved by the
emitter at view time and is passed through unchanged.

## Language levels

`v0.1` defines the core declarative syntax: app, state, component tree, events and actions.
Additive language levels extend it with `async`/`await`, module imports, `if`/`for` in UI,
theme tokens, custom components, computed and list-valued state, and animations; a list-valued
state is read by position with `{items[i]}`, where the subscript is an integer literal or a
`for` count loop variable that resolves at compile time. A compiler
targeting a later level must still compile every `v0.1` program to byte-identical IR.
