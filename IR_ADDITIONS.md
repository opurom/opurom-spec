# OPUROM IR — interactive UI additions (normative)

`ir` stays `"0.1"`. The interactive UI layer adds **optional** fields only. Every v0.1 IR file
remains valid and every v0.1 consumer must keep working. A consumer that does not implement an
interactive UI feature MUST ignore the corresponding optional field (forward-compatible
degradation), never reject the file.

## 1. Multi-action events

`events.<name>` is either one action object (v0.1) or:

```json
{ "actions": [ { "op": "add", "target": "count", "value": 1 },
               { "op": "set", "target": "count", "value": 9 } ] }
```

Actions execute in order, atomically. Patches are emitted in the same order, one per resulting
state change. An empty `actions` array is legal (no-op handler).

## 2. State-to-state actions

An action may use `"valueFrom": "<otherState>"` instead of `"value"`:

```json
{ "op": "set", "target": "a", "valueFrom": "b" }
{ "op": "add",  "target": "a", "valueFrom": "b" }
{ "op": "sub",  "target": "a", "valueFrom": "b" }
```

`valueFrom` reads the current value of that state at execution time. Both states must have the
same declared type; `add` and `sub` require `int`. `sub` subtracts the `value` or `valueFrom`
from the target where `add` adds it. `toggle` never has a value field.

## 3. Conditional nodes

A node MAY carry `"when": "<boolStateName>"`. The node and its subtree are visible only while that
bool state is true. Missing `when` means always visible. Consumers that cannot hide subtrees ignore
it (still correct v0.1 behaviour, just less expressive).

## 4. Canonical style props

The compiler lowers atomic shortcuts to these canonical prop names. Numeric literals stay JSON
numbers; `true`/`false` stay JSON booleans; colors are `#RRGGBB` strings.

| Canonical | Source shortcut | Type | Effect |
| --- | --- | --- | --- |
| `padding` | `p` | number | inner spacing |
| `margin` | `m` | number | outer spacing |
| `color` | `bg` | color | background / text color by kind |
| `radius` | `rounded` | number | corner radius |
| `shadow` | — | number | soft shadow strength |
| `gradient` | — | `"#RRGGBB,#RRGGBB"` | two-stop linear gradient |
| `glass` | — | bool | liquid-glass lamina over the refracted backdrop |
| `opacity` | — | number 0..1 | alpha |
| `border` | — | color | 1px border |
| `animate` | — | `"spring"\|"ease"\|"none"` | entry animation |

Unknown props remain legal and are ignored by consumers that do not support them.

## 5. Particle field

Any node MAY carry an optional `props.particles` object. It is a static spatial primitive, not a
simulation: dots do not move, and nothing advances over time.

| Field | Range | Default | Meaning |
| --- | --- | --- | --- |
| `count` | 0..512 | required | number of dots |
| `seed` | 0..4294967295 | 1 | integer hash seed |
| `radius` | 0..32 | 2 | dot radius in integer pixels |
| `alpha` | 0..1024 | 1024 | fixed-point dot alpha, 1024 fully opaque |
| `color` | `#RRGGBB` | node accent | optional dot color |

Dot `i` is placed at the pure integer hash of `(seed, i)` reduced modulo the node rectangle, so the
same object paints the same bytes on every host. `count` is required; the other fields keep their
defaults when absent and `color` is emitted only when declared. The renderer records one display-list
command `{"kind":"particles","rect":...,"clip":...,"count":...,"seed":...,"radius":...,"color":...}`
with the same bounds, and the GPU backend parses and evaluates that command with identical unsigned
integer arithmetic. The accessibility tree carries exactly one node per IR node: dots are decorative
texture and never expand into per-dot entries. A consumer that does not render particle dots MUST
ignore the object (forward-compatible degradation), never reject the file.

## 6. Theme tokens

`theme` MAY carry `"tokens": { "surface": "#RRGGBB", "onSurface": "#RRGGBB",
"stage": "#RRGGBB", "font": "<name>", "contrast": "normal"\|"high" }`.
Missing tokens fall back to the theme's `mode`/`accent`/`radius`. `surface` and `onSurface`
remain the contrast reference for on-surface ink; `stage` is the flat tinted page backdrop
that a `glass` lamina refracts, and falls back to `surface` when absent so documents that
declare no stage stay byte-identical. Deterministic rendering MUST NOT depend on a host font:
text is drawn with the renderer's built-in bitmap font.

A `glass: true` node without an explicit `effects` glass or liquid entry expands into the
native effect pipeline: a blurred refraction of the backdrop plus a specular edge band. The
software framebuffer and the display-list commands both carry the expansion, so every backend
renders the same lamina without new IR fields. IR that declares no glass emits no effect
commands and keeps the pixel-consistency guarantee unchanged.

## 7. Node kind catalog (24 kinds)

v0.1 eight: `Column, Row, Container, Text, Button, Input, Image, Spacer`.

The interactive UI layer adds sixteen: `Card, Divider, Icon, Badge, Progress, Switch, Slider,
Checkbox, Radio, Dialog, Tabs, List, Grid, Scroll, Avatar, Spinner`.

Required props for the new kinds (all others optional):

| Kind | Required | Bind semantics |
| --- | --- | --- |
| `Card` | — | container |
| `Divider` | — | — |
| `Icon` | `name` | — |
| `Badge` | `label` | — |
| `Progress` | `value` | — |
| `Switch` | `bind` | bool state → `tap` emits `toggle` |
| `Slider` | `bind`, `min`, `max` | int state → `input` emits `set` |
| `Checkbox` | `bind` | bool state → `tap` emits `toggle` |
| `Radio` | `bind`, `value` | string state → `tap` emits `set` |
| `Dialog` | `title` | container |
| `Tabs` | `labels` | string state via `bind`, `tap` emits `set` |
| `List` | — | container |
| `Grid` | `columns` | container; fluid column count |
| `Scroll` | `height` | container; clipped viewport |
| `Avatar` | `label` | — |
| `Spinner` | — | — |

Consumers that do not know a new kind render it as a `Container` (with children) or a `Text`
(label/value/title/name) rather than failing. This is the documented fallback, not an error.

## 8. Gestures, navigation and implicit animation

A node MAY carry `"gesture": "<name>"` with name in `tap | doubleTap | longPress | drag`. The
handler bound to that gesture is stored under the same event key: `events.longPress`,
`events.drag`, and so on. A gesture with no handler lowers to `{"actions": []}`. Consumers that
only understand `tap`/`input` ignore the other gesture keys, which keeps gesture IR forward
compatible.

A program MAY declare top-level routes, each owning its own content tree (see the multi-page
section below). A handler statement `push: Page` lowers to the navigation action:

```json
{ "op": "push", "target": "Page" }
```

`push` has no `value`, and `pop` (below) has neither `target` nor `value`. The renderer's
navigation stack applies a `push` and runs the configured page transition; `Theme.transition`
(`slide | fade | scale`) selects the transition kind. A kernel that dispatches the IR emits the
reserved navigation patch `{"name":"@nav","value":"Page"}` for each `push` and leaves state
unchanged: the renderer owns the stack. The patch still advances the runtime version, and
consumers must not treat `@nav` as a state name.

A node with `"animate": "<curve>"` runs a deterministic entry animation; the optional integer
`"duration"` (ms, 0..=10000) and `"delay"` (ms, 0..=10000) tune it. When a numeric style prop
(`radius`, `padding`, `shadow`, `color`, `opacity`) changes between two renders the value
interpolates over `duration` after `delay`, using integer half-up rounding. At settle every value
equals its target, so a settled animated node is field-identical to the same node with `animate`
removed and the frames are byte-identical.

## 9. Media, typography, repetition and validation

An `Image` node reads a packed PNG through `src`, resolved against the process working directory.
The decoder accepts 8-bit grayscale, RGB and RGBA, non-interlaced, all five row filters, with
bounded dimensions and decoded size. `fit` is `contain` by default, with `cover` and `fill`
selectable; a missing or unreadable source draws a deterministic rounded-cross placeholder rather
than failing the frame. The browser emitter lowers the same node to a void `img` with escaped
`src`, `alt`, `width`, `height`, `loading="lazy"` and `object-fit`.

A `Text` node MAY carry `maxLines` (truncating with an ellipsis) and `align`
(`left | center | right`). Both integrate with the existing word wrap and stay integer-only.

A `for item in list { ... }` block lowers to one synthetic `Column` carrying
`"repeat": {"item": "<name>", "list": "<state>"}`; its children remain the template and `{item}`
is substituted by the consumer. A `for item in state.list` form is also accepted. The
compile-time parenthesized unroll is unchanged.

`Input` nodes accept `required`, `minLength`, `maxLength` and `pattern` props, which lower to
same-named `props`. A `form.validate()` handler statement lowers to
`{"op":"validate","target":"form"}`. All three shapes are additive: programs that do not use them
emit byte-identical IR. A kernel dispatching a `validate` action emits the reserved patch
`{"name":"@validate","value":"form"}` and leaves state unchanged, mirroring `@nav`; consumers
must not treat `@validate` as a state name.

A model MAY declare `"indexes": [{"name":"...","columns":["a","b"],"unique":true}]` (`unique`
defaults to false). Index DDL runs in the same migration transaction as the table creation. A
pure query planner selects the index with the longest matching leading-column prefix, tie-broken
by name, and reports `TableScan` or `IndexScan`; a fully matched unique index bounds the estimate
to one row.

## 10. Determinism

All interactive UI rendering (gradients, glass, shadow, animation at a given tick) MUST stay
integer-only and pixel-deterministic. The v0.1 golden digest for `counter.opuir.json` must not
change: interactive UI features are opt-in through props/fields, never implied by default.

## 11. Design-system chain

The design-system layer is additive and opt-in, so an IR that declares none of its keys stays
byte-identical. `opurom-lang` accepts three new node props in `DESIGN_PROPS` and all nine target
emitters preserve them. Unknown values are diagnostics naming the prop, the value and the accepted
list:

| Prop | Allowed values |
| --- | --- |
| `state` | `default`, `hover`, `active`, `focus`, `disabled` |
| `variant` | `primary`, `secondary`, `text`, `danger`, `ghost`, `fab` |
| `tone` | `success`, `warning`, `error`, `info`, `neutral` |

`state` resolves exactly one of the five interaction states; `default` is also the meaning of an
absent prop, and an authored boolean `disabled` prop wins over `state` and over any caller override
(`NodeState::resolve`). The DOM runtime mirrors the same precedence — `disabled` > `active` >
`focus` > `hover` > `default` — with `data-state` and `opurom-state-*` classes driven by real
listeners. `opurom-render` paints each state with deterministic integer RGBA transforms
(`NodeState::color`, `NodeState::opacity`): hover is a white tint `c + (255 - c) * 3 / 16`, active
is `c * 13 / 16` plus a pressed inset, focus leaves colours unchanged and draws a two-pixel accent
ring outside the node rect, and disabled desaturates by integer luminance
`(299r + 587g + 114b) / 1000` with `alpha * 3 / 5`. All arithmetic is integer division, so results
are host-independent; `--interactive-state` applies one state to every interactive node for a
state-matrix screenshot without changing default stdout.

`variant` and `tone` resolve through the semantic palette tokens `primary`, `secondary`, `success`,
`warning`, `error`, `info` and `neutral` (measured `#0A71FC`, `#0DB2FF`, `#1FB14C`, `#FD960E`,
`#F62B35`, `#0A71FC` and `#132C5A`). An explicit `theme.tokens.*` override wins; a tone always wins
on the border colour, and a variant/tone default never replaces an authored `color` or `border`.
`opurom-web` lowers both into `data-variant` / `data-tone` markup in the DOM emitter and into
`semanticSpec` on the Canvas path, so both paths resolve the same palette.

The opt-in `fontMetrics` key selects text metrics: `FontMetrics::Fixed` (the default) keeps one
advance per glyph, `font::advance(scale) = (GLYPH_W + 1) * scale`, while
`FontMetrics::Proportional` derives a compact per-glyph advance from the 12x14 coverage atlas. It
may be set globally through `theme.fontMetrics` or overridden per node through `props.fontMetrics`;
a program that declares neither keeps the fixed default, so the three canonical golden frames stay
byte-identical.

The adaptive frame budget is integer-only and caller-supplied. `choose_quality` degrades particle
counts in quarters and drops expensive effects below 16 ms, and `--frame-budget <ms>` wires it into
the renderer CLI with one deterministic third stdout line. `FrameBudget::push` /
`Renderer::render_auto_at` evaluate a rolling `WINDOW_FRAMES = 20` window with an integer
nearest-rank p95: a p95 above the `FrameRate` target (Hz60 = 16 ms, Hz120 = 8 ms) degrades
`QualityTier` from `Full` to `Reduced` to `Minimal`, while promotion needs three consecutive good
windows. No clock is read inside the renderer, and the no-flag path is byte-for-byte identical.

The default path MUST leave the THREE canonical golden IR/digests unchanged: `counter.opuir.json`
at 320x240 = `8d45f412996a99c6`, at 800x600 = `318beb1dd337bc4e`, and at 800x600 with
`--state count=7` = `40073cb95c912d80`. None of `state`, `variant`, `tone` or `fontMetrics` may
appear in the golden counter IR, at the top level or in any node's props. The component catalog
stays at 260 names, including the feedback/overlay family `Modal`, `Confirm`, `Drawer`, `Toast`,
`Tooltip`, `Notification`.

Cross-layer contracts: `opurom-core` routes input editing through the kernel text-input bus
`TEXT_INPUT_BUS` ("textInput") on `PluginBus`, where `TextInputState` wraps `TextBuffer` and typed
`TextInputError` / `TextBufferError` report failures without mutating state; the `catch_unwind`
circuit breaker isolates a failing handler so the runtime keeps working, and an `Input` opts in with
`props.textBuffer`. `opurom-platform` consumes `resolve_layout(DisplayGeometry) -> LayoutDecision`
from window and `WireEvent::Geometry` events; the pure integer resolver derives `LayoutTier`,
`columns`, `gutter` and an `avoid_fold` region from `FoldRegion`, `Posture` and `WindowRole`, so the
same geometry yields the same decision on every host. `opurom-cli` broadcasts `decideReload`
decisions to multiple preview devices through `createDeviceRegistry`, assigning a monotonic
`revision` and a deterministic replayable log.

## 12. Multi-page routing

Multi-page routing is an additive v0.1 capability: it adds only optional top-level fields, so an
IR without them is the unchanged single-page program. The version string stays `"0.1"` for both
single-page and multi-page programs; there is no version bump. A single-page document keeps one
top-level `"tree"` (the only page). A multi-page document carries NO top-level `"tree"` and instead
declares an `"initialRoute"` and a `"routes"` map, where every route owns its own content tree:

```json
{
  "ir": "0.1",
  "app": "Shop",
  "state": [ { "name": "count", "type": "int", "init": 0 } ],
  "theme": { "mode": "system", "accent": "#097FEB", "radius": 12 },
  "initialRoute": "Home",
  "routes": {
    "Home":   { "tree": { "id": 0, "kind": "Column", "props": {}, "children": [], "events": {} },
                "title": "Home" },
    "Detail": { "tree": { "id": 1, "kind": "Column", "props": {}, "children": [], "events": {} },
                "title": "Detail" }
  }
}
```

Rules:

- `routes` is an object keyed by route name. Every key is a unique non-empty string, and each
  value is `{ "tree": <node>, "title": <optional string> }`. `tree` is one node shaped exactly as
  the top-level `tree` (same fields: `id`, `kind`, `props`, `children`, `events`). `title` is an
  optional non-empty string a consumer may show in a navigation bar; it is not a node prop.
- Node `id`s are u32 and UNIQUE ACROSS THE ENTIRE MULTI-PAGE PROGRAM. The compiler emits them in
  pre-order within each route tree, continuing across routes in declaration order (for example
  `Home` owns `0..n` and `Detail` continues at `n+1`); ids never restart per route. Consumers
  validate global uniqueness — a duplicate id (the same id in two route trees) fails IR validation
  with a readable diagnostic — without demanding ordering or contiguity, mirroring the single-page
  rule. Globally unique ids keep node-id-only tap dispatch and every emitter's node-keyed identity
  unambiguous without changing the event signature.
- `initialRoute` is REQUIRED when `routes` is present and MUST name a declared route key. A document
  that omits it, or names an undeclared route, fails IR validation with a readable diagnostic.
- When `routes` is present a legacy top-level `pages` array (retired names-only form) is rejected;
  `routes` supersedes it. When `routes` is absent the document is a single-page program and the
  top-level `tree` is the only page.
- A consumer that does not implement multi-page routing rejects an IR whose `routes` it cannot
  honour with a readable diagnostic rather than rendering one page and dropping the rest; it MUST
  still accept and render every IR without `routes` byte-identically.

### Navigation ops: push and pop

The action union gains `pop`:

```json
{ "op": "push", "target": "Detail" }
{ "op": "pop" }
```

- `push` keeps `{"op":"push","target":"Detail"}`; `target` is a string and MUST name a declared
  route when `routes` is present. `push` has no `value`.
- `pop` has neither `target` nor `value`; it pops the current route, and is ignored when the stack
  is already at `initialRoute` (popping the root is a no-op).
- The older `nav` op remains a transition-only navigation signal (accepted for compatibility) and
  is a no-op relative to the routes stack.
- Runtime patches are reserved and leave declared state unchanged: `push` emits
  `{"name":"@nav","value":"Detail"}` and `pop` emits `{"name":"@nav","value":".."}` (the `..`
  sentinel names a pop). Each patch still advances the runtime version, and consumers must not treat
  `@nav` as a state name.
- `Theme.transition` (`slide | fade | scale`) selects the transition kind the renderer runs on each
  `push` and `pop`; a document that declares no route emits no navigation patches and stays
  byte-identical.
