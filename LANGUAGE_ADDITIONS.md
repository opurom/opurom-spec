# OPUROM Lang — interactive UI additions (normative)

Superset of [LANG_SPEC.md](LANG_SPEC.md). Every v0.1 program keeps compiling to byte-identical
IR. The compiler version is reported by `opuromc --version` as `0.2.0`, but the emitted `ir`
string stays `"0.1"` with the optional fields of [IR_ADDITIONS.md](IR_ADDITIONS.md).

## 1. Multi-statement handlers and state expressions

```opu
Button("+2") { count += 1; count += 1 }
Button("copy") { a = b; a += b }
```

Statements are separated by `;` or newlines. `expr` may now be a literal, an INT state name, or a
STRING state name for `set`. `a = b` / `a += b` lower to actions with `valueFrom: "b"`. Both sides
must share a type; `add` needs `int`. A handler with >1 statement lowers to
`events.tap = {"actions":[...]}`; a single statement keeps the v0.1 bare-action form.

## 2. Conditional UI

```opu
if (dark) {
  Text("Dark mode on")
  Card { Text("Only visible when dark is true") }
}
```

`if` takes one bool state name in parentheses. Each direct child node receives `"when": "dark"`.
`if` blocks may appear anywhere a node may appear. Nested `if` is allowed (conditions combine by
nesting, not by logic operators). The `else` branch belongs to a later additive language level,
where it lowers to the `unless` node field.

## 3. Compile-time repetition

```opu
for (i in 3) {
  Text("Item {i}")
}
```

`for` takes an identifier and an integer literal count (0..64). The compiler unrolls the block,
substituting `{i}` in string literals with the decimal index, and emits consecutive node ids.
`for` never appears in IR. Nested `for` is allowed; the innermost `{i}` refers to the innermost
loop. Count > 64 is a diagnostic.

The iterable may also be a list-valued state: `for (item in items) { Text("{item}") }` binds
`item` to each element in initializer order. A list state is stored with `type` `"list"` and its
`init` array; its contents are fixed at compile time, so iteration and every element read unroll
into literal nodes and never reach IR.

A list element is read by position with `{items[i]}` inside a `Text` value. The subscript is an
integer literal in `0..len-1` or a `for` count loop variable, and the element resolves to its
literal string at compile time. A subscript that names a non-list state, that is not an integer,
or that is out of range is a diagnostic in the standard `path:line:col: error:` + `  help:` form.

## 4. Theme block

```opu
theme { mode: dark, accent: "#FF4D6D", radius: 8 }
```

May appear once inside `app`, before or after state declarations. Lowered into `IR.theme`; missing
keys keep the compiler defaults. Unknown keys are a diagnostic.

## 5. Atomic style shortcuts and visual effects

```opu
Card(p: 16, m: 8, bg: "#101828", rounded: 12, shadow: 2, gradient: "#097FEB,#101828", glass: true, opacity: 0.95, animate: spring) {
  Text("Hi", color: "#FFFFFF", size: 20)
}
```

Shortcuts `p/m/bg/rounded` lower to `padding/margin/color/radius`. `shadow`, `gradient`, `glass`,
`opacity`, `border`, `animate` pass through as canonical props. `animate` accepts `spring`,
`ease`, `none`. Colors must be `#RRGGBB`; opacity must be 0..1; `shadow` must be 0..8. Validation
errors use the standard `path:line:col: error:` + `  help:` form.

## 6. Particle field

```opu
Container(width: 240, height: 120, particles: "count=64,seed=7,radius=2,alpha=512,color=#101828") {
  Text("Field")
}
```

`particles` is accepted on every node kind. It is a comma-separated `name=value` field list in one
string that lowers to the bounded `props.particles` object of [IR_ADDITIONS.md](IR_ADDITIONS.md) §5:
`count` is required and must be an integer 0..512, `seed` an integer 0..4294967295 (default 1),
`radius` an integer 0..32 (default 2), `alpha` an integer 0..1024 (default 1024, fixed point with
1024 fully opaque), and `color` an optional `#RRGGBB`. Omitted fields keep their defaults and
`color` is emitted only when declared. Dots are a static spatial scatter with no motion over time.
Validation errors use the standard `path:line:col: error:` + `  help:` form: a value that is not a
string, a field without `=`, a duplicate field, an unknown field, a non-integer value, a value
outside its range and a malformed `color` each produce exit 1 with a `help:` line, no panic.

## 7. New node kinds

The 16 kinds from IR_ADDITIONS §6 become valid `KIND`s with the props listed there. `bind` on
`Switch/Checkbox/Radio/Slider/Tabs` is type-checked against the state and lowers to the event
action specified in that table. Unknown kinds remain an error (with a suggestion listing the 24
valid kinds).

## 8. Diagnostics additions

New error classes needing a negative fixture each: `else` unsupported, `for` count > 64, bad
color, opacity out of range, shadow out of range, `valueFrom` type mismatch, `when` on a non-bool
state, duplicate `theme` block, unknown theme key, unknown `animate` value, unknown kind
suggestion. All must produce exit 1 + `help:` line, no panic.

## Language level

This level defines plain state declarations, UI blocks, atomic style shortcuts, multi-action
events and theme tokens. Later language levels add `async`/`await`, module imports, custom
components, `else` branches, computed and list-valued state, and higher-level layout units.
Each level keeps every earlier program valid.
