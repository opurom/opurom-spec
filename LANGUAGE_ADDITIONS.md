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
nesting, not by logic operators). `else` is out of scope for this language level and must
produce a friendly "not yet supported" diagnostic.

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

## 4. Theme block

```opu
theme { mode: dark, accent: "#FF4D6D", radius: 8 }
```

May appear once inside `app`, before or after state declarations. Lowered into `IR.theme`; missing
keys keep the compiler defaults. Unknown keys are a diagnostic.

## 5. Atomic style shortcuts and visual effects

```opu
Card(p: 16, m: 8, bg: "#101828", rounded: 12, shadow: 2, gradient: "#4F46E5,#101828", glass: true, opacity: 0.95, animate: spring) {
  Text("Hi", color: "#FFFFFF", size: 20)
}
```

Shortcuts `p/m/bg/rounded` lower to `padding/margin/color/radius`. `shadow`, `gradient`, `glass`,
`opacity`, `border`, `animate` pass through as canonical props. `animate` accepts `spring`,
`ease`, `none`. Colors must be `#RRGGBB`; opacity must be 0..1; `shadow` must be 0..8. Validation
errors use the standard `path:line:col: error:` + `  help:` form.

## 6. New node kinds

The 16 kinds from IR_ADDITIONS §6 become valid `KIND`s with the props listed there. `bind` on
`Switch/Checkbox/Radio/Slider/Tabs` is type-checked against the state and lowers to the event
action specified in that table. Unknown kinds remain an error (with a suggestion listing the 24
valid kinds).

## 7. Diagnostics additions

New error classes needing a negative fixture each: `else` unsupported, `for` count > 64, bad
color, opacity out of range, shadow out of range, `valueFrom` type mismatch, `when` on a non-bool
state, duplicate `theme` block, unknown theme key, unknown `animate` value, unknown kind
suggestion. All must produce exit 1 + `help:` line, no panic.

## Still out of scope

`async`/`await`, functions, modules/imports, custom components, `else`, list-valued state,
event handlers with local variables, units (`dp`/`rem`). Each must be rejected with a friendly
"not yet supported in v0.2" diagnostic.
