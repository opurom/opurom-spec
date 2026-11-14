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
  "theme": { "mode": "system", "accent": "#097FEB", "radius": 12 }
}
```

- `state`: source-ordered array; `type` ∈ `int|bool|string`; `init` is a JSON number/string/bool
  matching the type. Empty array is legal.
- `tree`: single root node. Every node has exactly these four fields:
  `id` (u32, pre-order from 0, unique), `kind` (string, one of the kinds in LANG_SPEC),
  `props` (object), `children` (array, possibly empty), `events` (object, possibly empty).
- `props` values are JSON numbers when the source literal was numeric, strings otherwise.
  Unknown props are preserved (forward compatibility) but consumers ignore unsupported ones.
  `props.compactColumns` on a `Grid` node is a non-negative integer declaring the
  column count the compact tier MUST keep. A Grid that is really one horizontal
  row declares it so the compact tier does not stack its cells; a Grid without
  it stacks to one column on compact widths. Wider tiers use `props.columns`.
  Mini-program targets render phone-width only and therefore prefer
  `compactColumns` when present; lacking CSS Grid support they lower the count
  to percentage-width cells in a wrapping flex row, leaving cells with an
  explicit `width` unchanged.
  `props.src` on an `Image` node is a project-relative static asset path, an
  inlined `data:image/png;base64,...` URI, or a `{state}` interpolation resolved
  from string or list state at render time. A data URI carries the pixels with
  the IR so every target decodes them without a platform asset channel.
  Emitters MUST resolve and bundle static references into their output so the
  rendered page needs no external copy step; absolute paths and `..` segments
  are outside the contract and MUST NOT be followed. `props.fit` selects
  `contain`, `cover` or `fill` placement for the decoded image.
- `events` maps an event name to exactly one action. The five accepted names are
  `tap`, `input`, `doubleTap`, `longPress` and `drag`; the set is closed and
  consumers MUST reject an undeclared name with a readable diagnostic rather
  than silently dropping the binding. A source `gesture:` prop is
  removed at lowering and selects the event name (`gesture: doubleTap` binds the
  handler under `doubleTap`); without it a tap handler binds under `tap`. Mini-program
  targets emit the three gesture events as a touch-start/move/end recognizer that
  dispatches by node id, while the other targets bind the gesture natively.
  `dragEnd` and `nav` are runtime gesture-binding aliases, not author-declarable
  IR event names.

  ```json
  { "op": "set" | "add" | "sub" | "toggle" | "nav" | "push" | "validate", "target": "count", "value": 1 }
  ```

  `toggle` has no `value`. `add` and `sub` require numeric `value` and `int` target; `sub`
  subtracts instead of adding. `set` requires the value type to match the target's declared
  type. `push` navigates to a declared page and `validate` triggers the target's form
  checks; both omit `value`. `nav` is the older transition-only navigation signal,
  accepted for compatibility with pre-`push` documents: it takes no `value` and its
  `target`, when present, is a string. `input` actions are `set` with `value` omitted: the runtime supplies the input string,
  parsed by the target's declared type (int parses with 0 on failure, bool is `true` only for
  the text `"true"`, string is taken as-is), so numeric and boolean controls bind the same way.

- `theme`: compiler-emitted defaults when the source omits theme syntax. `mode` ∈
  `light|dark|system`, `accent` is `#RRGGBB`, `radius` is a number in logical pixels.
  The optional `fontScale` is a JSON number in 0.5..3.0 and sets a global text scale;
  a node's own `props.fontScale` takes precedence over it. The optional `fontFamily`
  is a CSS font-family string that leads the platform-adaptive system stack, so a
  project can ship its own typeface while keeping OS fallbacks; programs without a
  `fontScale` or `fontFamily` declaration emit no such key, so existing IR stays
  byte-identical. The optional `tokens` object carries `surface`, `onSurface`,
  `stage`, `font` and `contrast` overrides; `stage` is the flat page backdrop a
  `glass` lamina refracts and falls back to `surface` when absent, then to white,
  `surface` and `onSurface` remain the contrast reference. Mini-program targets
  emit `stage` as the `page` background colour and MUST reject a value that is
  not a strict `#RRGGBB` or `#RRGGBBAA` literal, so an authored IR cannot inject
  CSS into the generated stylesheet. `props.glass: true` expands into the
  native effect pipeline, so the software framebuffer and display-list commands
  both render the same translucent lamina; documents without it emit no effect
  commands and stay byte-identical. Stylesheet targets MUST lower `glass` to the
  authoritative v2 channels in `DEFAULT_UI_GLASS_REFINEMENT.md` section 2,
  inlining the composed values because mini-program stylesheets cannot resolve
  the DOM emitter's custom properties: the compact or desktop backdrop blur, a
  translucent lamina, the tier2 shadow with its highlight and thickness edges,
  and the glass border. A dark theme swaps only the lamina and border; the blur
  and every other channel stay mode-independent.

### System font stack

Every emitter resolves text through one platform-adaptive CSS font-family list rather
than a fixed generic family. The list is ordered so the first installed family wins on
each host: `PingFang SC` and `Hiragino Sans GB` on macOS and iOS, `Microsoft YaHei`
and `Microsoft JhengHei` on Windows, `Noto Sans CJK SC`, `Source Han Sans SC` and
`Roboto` on Linux and Android, with `Helvetica Neue` and `Arial` as Latin fallbacks and
`sans-serif` as the final catch-all. A `theme.fontFamily` value is prepended to this
stack, so applications get native system typography by default and can override it
without a per-OS branch. Emitters that emit canvas text apply the same list to
`ctx.font`.

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
| `wechat` | `app.json`, `app.js`, `pages/index/index.wxml`, `pages/index/index.wxss`, `pages/index/index.js` |
| `alipay` | `app.json`, `app.js`, `pages/index/index.axml`, `pages/index/index.acss`, `pages/index/index.js` |
| `qq` | `app.json`, `app.js`, `pages/index/index.qml`, `pages/index/index.qss`, `pages/index/index.js` |
| `douyin` | `app.json`, `app.js`, `pages/index/index.ttml`, `pages/index/index.ttss`, `pages/index/index.js` |
| `baidu` | `app.json`, `app.js`, `pages/index/index.swan`, `pages/index/index.css`, `pages/index/index.js` |
| `kuaishou` | `app.json`, `app.js`, `pages/index/index.ksml`, `pages/index/index.css`, `pages/index/index.js` |

### Mini-program package

For all six mini-program targets, a root `app.js` is required and MUST call
`App({})`. `app.json` `pages` entries are package-root-relative paths without file
extensions. The framework resolves each path to the page `.js`, markup, style,
and optional `.json` files. When `entryPagePath` is absent, the first `pages`
entry is the entry page.

Mini-program emitters share one lowering pass with a per-platform table of file extensions,
template directives (`wx:for` / `a:for` / `s-for` / `tt:for` / `ks:for`) and binding syntax.
Generated JS must pass `node --check`. Web `app.js` must pass `node --check`. Native output must
build with `cargo build --release` and run.
