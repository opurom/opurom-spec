# OPUROM IR v0.1 (normative)

One JSON file (`.opuir.json`) is the entire contract between compiler, kernel, renderer,
adapters, CLI and IDE. Consumers MUST validate `ir == "0.1"` and fail with a readable diagnostic
otherwise. No layer may require fields beyond this document.

## Shape

```json
{
  "ir": "0.1",
  "app": "Counter",
  "state": [ { "name": "count", "type": "int", "init": 0 } ],
  "tree": { "id": 0, "kind": "Column", "props": {...}, "children": [...], "events": {...} },
  "theme": { "mode": "system", "accent": "#4F46E5", "radius": 12 }
}
```

- `state`: source-ordered array; `type` ∈ `int|bool|string`; `init` is a JSON number/string/bool
  matching the type. Empty array is legal.
- `tree`: single root node. Every node has exactly these four fields:
  `id` (u32, pre-order from 0, unique), `kind` (string, one of the kinds in LANG_SPEC),
  `props` (object), `children` (array, possibly empty), `events` (object, possibly empty).
- `props` values are JSON numbers when the source literal was numeric, strings otherwise.
  Unknown props are preserved (forward compatibility) but consumers ignore unsupported ones.
- `events` maps event name (`tap`, `input`) to exactly one action:

  ```json
  { "op": "set" | "add" | "toggle", "target": "count", "value": 1 }
  ```

  `toggle` has no `value`. `add` requires numeric `value` and `int` target. `set` requires the
  value type to match the target's declared type. `input` actions are `set` with `value` omitted:
  the runtime supplies the input string.

- `theme`: compiler-emitted defaults when the source omits theme syntax. `mode` ∈
  `light|dark|system`, `accent` is `#RRGGBB`, `radius` is a number in logical pixels.

## Golden pair

[counter.opu](counter.opu) lowers to [counter.opuir.json](counter.opuir.json). Both files are
checked in here; every compiler change must keep `node`-deep-equal of parsed JSON true. The
examples project runs that assertion.

## Semantics of state

State is a flat map name → typed value. An event applies its action atomically and yields a
`Patch` list: `[{ "name": "count", "value": 1 }]`. Renderers and adapters consume patches; they
never mutate state themselves. Interpolation `{name}` in `Text.props.value` is resolved against
current state at render time by whoever draws text.

## Determinism rule

Given identical IR, viewport and theme, the renderer MUST produce byte-identical RGBA output
regardless of host OS, adapter or target. This is the pixel-consistency guarantee and is enforced
by a golden hash test.

## Target emitters

`opuromc target <ir> --target <name> -o <dir>` lowers IR into native source for that target.
Emitters generate **code**, not an IR interpreter. Supported in v0.1:

| Target | Artifacts |
| --- | --- |
| `native` | `main.rs` + `Cargo.toml` (std only; builds with `cargo build --release`) |
| `web` | `index.html`, `app.js`, `ir.json` (Canvas 2D renderer, no runtime dependency) |
| `wechat` | `app.json`, `index.wxml`, `index.wxss`, `index.js` |
| `alipay` | `app.json`, `index.axml`, `index.acss`, `index.js` |
| `qq` | `app.json`, `index.qml`, `index.qss`, `index.js` |
| `douyin` | `app.json`, `index.ttml`, `index.ttss`, `index.js` |
| `baidu` | `app.json`, `index.swan`, `index.css`, `index.js` |
| `kuaishou` | `app.json`, `index.ksml`, `index.css`, `index.js` |

Mini-program emitters share one lowering pass with a per-platform table of file extensions,
template directives (`wx:for` / `a:for` / `s-for` / `tt:for` / `ks:for`) and binding syntax.
Generated JS must pass `node --check`. Web `app.js` must pass `node --check`. Native output must
build with `cargo build --release` and run.
