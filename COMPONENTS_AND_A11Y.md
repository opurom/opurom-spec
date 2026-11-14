# OPUROM Component Catalog and Accessibility Addendum (normative)

The component catalog targets ecosystem scale and production ergonomics. Everything here is
**additive**: all earlier IR files stay valid, golden digests stay unchanged, and all existing
tests stay green.

## 1. Component catalog (100+ components)

[components.json](components.json) is the single source of truth: an array of
`[name, primitive, category, defaultProps]` tuples. `name` is a capitalized identifier used in
source; `primitive` is one of the 24 interactive UI node kinds; `category` groups the docs;
`defaultProps` are merged into the node's props at lowering time.

Rules:

- A source `Kind` may be a catalog component name. The compiler resolves it to its `primitive`
  and merges `defaultProps` under explicitly written props (explicit wins).
- The lowered IR node keeps `kind` = primitive and gains an optional `"component"` field with the
  original name. Consumers that do not know `component` ignore it; the IR stays backward-compatible.
- Unknown kinds remain a diagnostic. Catalog names are validated at compile time; duplicate
  names, unknown primitives, and invalid props are rejected.
- Expansion is deterministic and compile-time only: no component registry ships in a build.
- `opuromc components` prints the catalog (name, primitive, category); the count MUST be >= 100.

## 1.1 Flutter-aligned named components (additive)

The catalog carries an additive set of 24 Material 3 and Cupertino **named components**.
Each is a plain catalog tuple; it maps onto one of the existing 100 drawn primitives and
adds no new drawn primitive, renderer change, theme key, font glyph or IR action op.

- Material 3: `Scaffold`, `AppBar`, `FloatingActionButton`, `NavigationBar`,
  `NavigationRail`, `NavigationDrawer`, `InputChip`, `SnackBar`, `BottomSheet`,
  `ModalBottomSheet`, `SegmentedButton`, `DividerVertical`, `ListTile`, `ExpansionTile`,
  `TooltipCard`.
- Cupertino-style: `CupertinoButton`, `CupertinoSwitch`, `CupertinoSlider`,
  `CupertinoTextField`, `CupertinoNavigationBar`, `CupertinoAlertDialog`,
  `CupertinoTabBar`, `CupertinoPicker`, `CupertinoSegmentedControl`.

The names and their default props are taken from Flutter's Material 3 and Cupertino
component vocabulary; the defaults (radius, padding, elevation-like `shadow` and the
brand accent `#097FEB` where the component uses an accent) are deliberate and not
placeholders. Each `defaultProps` object is structurally validated with the rest of the
catalog, and any prop a program writes against one of these names is checked against the
resolved primitive, so an unknown prop is rejected with the standard friendly
`unknown prop '<name>' on <Component>` diagnostic instead of being silently dropped. Because the names resolve to existing primitives, `Scaffold` lowers to
`Column`, `AppBar` to `Row`, `FloatingActionButton`/`CupertinoButton` to `Button`,
`NavigationBar`/`SegmentedButton`/`CupertinoTabBar` to `Tabs`, `InputChip` to `Badge`,
`NavigationRail` to `NavRail`, `NavigationDrawer` to `Sidebar`, `SnackBar` to `Card`,
`BottomSheet`/`ModalBottomSheet`/`CupertinoAlertDialog` to `Dialog`,
`SegmentedControl`-like forms to `Tabs`/`SegmentedInput`, `DividerVertical` to
`Divider`, `ListTile` to `Row`, `ExpansionTile` to `Card`, `TooltipCard` to `Tooltip`,
`CupertinoSwitch` to `Switch`, `CupertinoSlider` to `Slider`, `CupertinoTextField` to
`Input`, `CupertinoNavigationBar` to `Row`, `CupertinoPicker` to `SelectBox`, and
`CupertinoSegmentedControl` to `SegmentedInput`.

## 2. Accessibility (renderer + SSR)

Optional props/theme keys, all deterministic:

| Key | Type | Effect |
| --- | --- | --- |
| `fontScale` | number 0.5..3.0 | scales text size in integer logical pixels |
| `theme.fontScale` | number 0.5..3.0 | global text scale for nodes without a local `fontScale` |
| `highContrast` | bool | forces black/white text and stronger borders |
| `label` | string | accessible name for non-text nodes |
| `role` | string | `button`, `text`, `image`, `checkbox`, `slider`, `heading`, `none` |
| `theme.tokens.contrast` | `"normal"\|"high"` | theme-level high contrast |

`opurom-render <ir> <w> <h> <out.ppm> --a11y <out.json>` writes a JSON accessibility tree:
`[{id, role, label, bounds:[x,y,w,h], hidden}]`, pre-order, integer coordinates, deterministic.
Hidden nodes (`when` false) appear with `hidden: true`. V0.1 golden digests MUST NOT change when
these props are absent. No screen-reader OS integration here: the tree is data, not a claim of
platform API coverage.

## 3. Optimizer / tree shaking

`opuromc optimize <ir> -o <out.json>` is a **semantics-preserving** IR pass:

1. Remove state entries never referenced by interpolation, `bind`, event targets, `when`, or
   `valueFrom` (dead state elimination).
2. Drop props whose value is `null` and empty `children`/`events` objects stay (schema requires).
3. Never remove nodes, never fold `when`, never change ids, never reorder state.

`opurom build --optimize` applies it before emitters and prints measured byte counts (input vs
output). A golden IR with no dead state optimizes to a deep-equal IR. Optimization is opt-in;
default builds stay byte-identical to the earlier compiler output.

## 4. Cooperative async scheduler (kernel)

`AsyncScheduler` in `opurom-core`: deterministic single-threaded cooperative scheduler with
`spawn(priority, task)`, `sleep_until(tick)`, `tick(delta_ms) -> Vec<TaskId>` (ready tasks),
`cancel(id)`, `pending()`, and `drain()`. No wall-clock, no threads, no randomness — the same
spawn/tick sequence always yields the same ready order. It is a schedulable coroutine queue,
NOT OS async IO, NOT a claim about network concurrency. Documented as such.

## 5. Debugger (DAP subset)

New independent project `opurom-debug`: zero-dependency Node DAP server over stdio with
Content-Length framing. Supported requests: `initialize`, `launch`, `setBreakpoints`
(state-change breakpoints, e.g. `count == 3`), `configurationDone`, `threads`, `stackTrace`,
`scopes`, `variables`, `continue`, `next`, `pause`, `disconnect`. Events: `initialized`, `stopped`,
`continued`, `terminated`. The server drives the real `opurom-core` state runtime via its stdin
command protocol, so `variables` returns actual state values and breakpoints fire on real patches.
A self-contained `node:test` suite drives a full DAP session. No DAP client GUI is tested.

## 6. Terminal platform adapter

`opurom-platform` gains a fully implemented `Terminal` adapter implementing the existing
`PlatformAdapter` trait: `present` converts an RGBA `FrameView` into deterministic truecolor
ANSI half-block text (two pixel rows per character row), `poll_event` accepts parsed key inputs,
`capabilities` reports `gpu:false, native_embed:false`. It is a real, verifiable new host added
with a thin adapter and zero kernel changes — the platform-boundary demonstration. It is NOT a
Metal/Vulkan/ANGLE backend.


