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
| `glass` | — | bool | frosted-glass fill |
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

`theme` MAY carry `"tokens": { "surface": "#RRGGBB", "onSurface": "#RRGGBB", "font": "<name>" }`.
Missing tokens fall back to the theme's `mode`/`accent`/`radius`. Deterministic rendering MUST NOT
depend on a host font: text is drawn with the renderer's built-in bitmap font.

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

## 8. Determinism

All interactive UI rendering (gradients, glass, shadow, animation at a given tick) MUST stay
integer-only and pixel-deterministic. The v0.1 golden digest for `counter.opuir.json` must not
change: interactive UI features are opt-in through props/fields, never implied by default.
