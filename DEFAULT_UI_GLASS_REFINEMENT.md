# OPUROM Default UI System — Liquid Glass Refinement (normative supplement)

## 1. Scope and authority

This document is a mandatory override of the flat-color and low-detail clauses of `opurom-spec/DEFAULT_UI_SYSTEM.md`. It governs every elevated default UI component. The v2 custom properties in Section 2 are the authoritative token contract for `opurom-web/lib/design.mjs` and are being implemented in that layer in parallel with this supplement; where the base specification's v1 values differ, the values below govern. No backend requirement in Section 3 is a CSS declaration, and none is emitted as CSS by the DOM emitter.

Overridden clauses, by base specification section number:

| Base clause | Override |
| --- | --- |
| 2.1 Primary and brand provenance | `--opurom-color-primary-gradient` and the derived hover, active, and soft-glow values |
| 2.4 Typography | Font-smoothing declarations, strict weights, no synthesized faces, 4.5:1 body-text contrast |
| 2.6 Elevation and focus | Flat elevation on elevated components replaced by the layered glass shadow; `--opurom-shadow-focus` remains in force |
| 2.8 Motion | `150ms ease-out` and `250ms ease-out` replaced by the v2 motion token set |
| 2.9 Glass lamina | The four v1 glass tokens replaced by the v2 glass token set |
| 2.12 Layout, interaction, and derived-value constants | `INTERACTION_TRANSITION`, `INTERACTION_PANEL_TRANSITION`, `GLASS_EDGE_LIGHT`, `GLASS_EDGE_DARK`; `COMPONENT_BORDER_WIDTH` is drawn inside the shape |
| 3.1 Required interaction states | Glass-channel state composition and motion resolution |
| 3.2 State vectors | `F_AC`, `F_GL`, `B_GL`, `S_GLASS`, `R_FULL`, `M_STATE`, `M_PANEL`, `M_NONE` |
| 4.1 Buttons | All 8 component rows |
| 4.2 Input/Form | All 12 component rows |
| 4.3 Data Display | All 13 component rows |
| 4.4 Navigation | All 8 component rows |
| 4.5 Feedback/Overlay | All 7 component rows |
| 4.6 Other | All 5 component rows |
| 5 Dark mode | Glass, depth, overlays, and contrast rows |
| 7 Interaction rules | The state-transitions row and the no-bounce clause, replaced by the bounded overshoot in Section 7 |

Sections 2.2, 2.3, 2.5, 2.7, 2.10, 2.11, 3.3, 6, and 8 of the base specification are not overridden. All other clauses of the base specification remain in force; base Section 8 is extended, not replaced, by Section 11 below.

## 2. Liquid glass material

| Token | Authoritative v2 value |
| --- | --- |
| `--opurom-glass-blur-desktop` | `blur(20px) saturate(160%)` |
| `--opurom-glass-blur-compact` | `blur(12px) saturate(140%)` |
| `--opurom-glass-highlight` | `inset 0 1px 0 rgba(255, 255, 255, 0.75)` |
| `--opurom-glass-thickness` | `inset 0 -1px 0 rgba(0, 0, 0, 0.06)` |
| `--opurom-glass-border-light` | `rgba(255, 255, 255, 0.5)` |
| `--opurom-glass-border-dark` | `rgba(255, 255, 255, 0.12)` |
| `--opurom-glass-shadow` | `0 2px 8px rgba(17, 24, 39, 0.06), 0 8px 24px rgba(17, 24, 39, 0.08)` |
| `--opurom-glass-glow` | `0 0 1px rgba(37, 209, 255, 0.4)` |
| `--opurom-glass-fill-light` | `rgba(255, 255, 255, 0.42)` |
| `--opurom-glass-fill-dark` | `rgba(30, 35, 46, 0.38)` |
| `--opurom-glass-tier1` | Composed value built only from `--opurom-glass-blur-desktop`, `--opurom-glass-fill-light` or `--opurom-glass-fill-dark`, `--opurom-glass-shadow`, `--opurom-glass-highlight`, `--opurom-glass-thickness`, and `--opurom-glass-border-light` or `--opurom-glass-border-dark` |
| `--opurom-glass-tier2` | Composed value built only from `--opurom-glass-blur-compact`, the same fill, `--opurom-glass-shadow`, `--opurom-glass-highlight`, `--opurom-glass-thickness`, and the same border token |
| `--opurom-glass-tier3` | Composed value built only from `--opurom-glass-blur-compact`, the same fill, the inset shadow channel `--opurom-glass-highlight` plus `--opurom-glass-thickness`, and the same border token; no outer drop shadow |

Each tier token is a shorthand for the `backdrop-filter`, `background`, `border`, and `box-shadow` channels composed from the atomic tokens above. No tier introduces a color literal outside this table. This supplement introduces no CSS custom property outside the v2 table in this section and Sections 4, 5, and 7; the names `--opurom-radius-full`, `--opurom-shadow-focus`, `--opurom-state-hover`, `--opurom-state-press`, `--opurom-state-focus`, `--opurom-state-disabled`, and `--opurom-color-elevated-dark` used elsewhere are existing base-specification tokens that remain in force.

Application rules:

| Tier | Applied to | Composition |
| --- | --- | --- |
| Tier 1 (heavy) | Dock, modal, drawer, and dropdown-class surfaces | `--opurom-glass-blur-desktop` plus fill, `--opurom-glass-shadow`, `--opurom-glass-highlight`, `--opurom-glass-thickness`, and the inside border |
| Tier 2 (medium) | Cards, FAB, inputs, and default buttons | `--opurom-glass-blur-compact` plus fill, `--opurom-glass-shadow`, `--opurom-glass-highlight`, `--opurom-glass-thickness`, and the inside border |
| Tier 3 (light) | Icon buttons, tags, and badges | `--opurom-glass-blur-compact` plus fill, the inset `--opurom-glass-highlight` and `--opurom-glass-thickness` channel, and the inside border |

Material constraints:

| Constraint | Normative behavior |
| --- | --- |
| Translucent base fill | Elevated components use only `--opurom-glass-fill-light` (alpha 0.42) or `--opurom-glass-fill-dark` (alpha 0.38); a 100% opaque base fill is not permitted on a glass surface |
| Inside border | The 1px border is drawn inside the element box with `box-sizing: border-box`; `--opurom-glass-highlight` and `--opurom-glass-thickness` are inset shadows, so every edge layer sits inside the shape |
| Edge glow | `--opurom-glass-glow` is applied only to primary or accent-filled elements and to focus-visible on those elements; neutral glass surfaces never carry the glow |
| Light-mode border | `--opurom-glass-border-light` = `rgba(255, 255, 255, 0.5)` with `--opurom-glass-fill-light` |
| Dark-mode border | `--opurom-glass-border-dark` = `rgba(255, 255, 255, 0.12)` with `--opurom-glass-fill-dark` |
| Unchanged channels | Blur, `--opurom-glass-highlight`, `--opurom-glass-thickness`, and `--opurom-glass-shadow` are not replaced by dark-mode values |

## 3. Rendering precision

### CSS/DOM declarations

| Declaration | Normative behavior |
| --- | --- |
| Font smoothing | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;` on the document body and on text-bearing glass nodes. The DOM emitter already declares `-webkit-font-smoothing` and `text-rendering`; `-moz-osx-font-smoothing` is added by this supplement. |
| Weights and synthesis | Only weights `400`, `500`, `600`, and `700` from base Section 2.4 are used. `font-synthesis: none` forbids faux bold and faux italic; no synthesized face is painted. |
| Baseline alignment approximation | Optical vertical centering uses a fixed `line-height` token with `display: inline-flex; align-items: center`. This is an approximation; exact baseline-grid centering is a backend requirement in the subsection "Rendering backend requirements (not CSS declarations)" below. |
| Whole-pixel stroke widths where CSS permits | A `1px` border with `box-sizing: border-box` is declared for glass shapes and separators. CSS can declare one CSS pixel, but it cannot guarantee one physical pixel at every device pixel ratio; that guarantee is a backend requirement. |
| Contrast | Body text meets at least 4.5:1 against the effective composited glass fill, not against the fill token in isolation. |

### Rendering backend requirements (not CSS declarations)

The following items are FORWARD REQUIREMENTS shared by the software raster `opurom-render` and the GPU backends, and they are NOT yet implemented in the default rendering path. They are NOT CSS declarations, cannot be expressed as CSS custom properties, and are NOT emitted as CSS by the DOM emitter `opurom-web/lib/emit.mjs`. No clause in this supplement states that these items are implemented in CSS. The software raster is expected to implement them behind an OPT-IN path, so the pinned golden RGBA digests of the default path remain unchanged; the default path cannot change because its output is pinned to those digests under a byte-identical output contract.

Current baseline in the software raster: integer-snapped straight edges, 6x6 bilinear coverage of a 12x14 4-bit coverage atlas on text edges, and 4x4 point-sampled coverage on icon edges. Box rounded corners, circles, rings, and line edges currently have no coverage in the default path. Gradients are 10-bit fixed point (`UNIT=1024`) with RGBA8 output, with no dithering and no 16-bit framebuffer; no MSAA sample count is present in the GPU backend. The display list `opurom-render/src/display.rs` carries high-level solid, rounded, and gradient geometry that a GPU backend can raster analytically.

| Requirement | Attribution |
| --- | --- |
| 4x MSAA full-scene anti-aliasing | Forward requirement; not yet implemented |
| 16-bit smooth gradient transitions, no banding | Forward requirement; not yet implemented |
| Cubic-Bezier smoothing of all vector paths | Forward requirement; no cubic-Bezier evaluator is present in either backend |
| Whole-pixel snapping of straight edges with subpixel curves | Integer-snapped straight edges are the current baseline; subpixel curves are a forward requirement |
| Baseline-grid vertical centering of text | Geometric band centering is the current baseline; baseline-grid alignment is a forward requirement |
| One physical-pixel strokes at 1x | Forward requirement; the renderer works in logical pixels |
| 60fps floor | Forward requirement; `choose_quality` / `--frame-budget` provide deterministic adaptive degradation tiers |

## 4. Geometric precision

| Rule | Normative behavior |
| --- | --- |
| Capsule | CSS `border-radius: 50%` on a non-square rectangle produces an ELLIPSE, which is forbidden. A capsule is declared as `border-radius: <height/2>px`, or with `--opurom-radius-capsule: 999px`, or with the existing `--opurom-radius-full: 999px`; all three clamp to semicircular ends on a rectangle. |
| Circle | A circle requires equal width and height plus `border-radius: 50%`. This form applies to the switch thumb, avatar, FAB, and progress ring. |
| Four-corner consistency | All four corners of a component resolve to one radius token. No per-corner override and no mixed radii are permitted. |
| Inner corners proportional | For an outer radius `R` and inset `d`, the inner corner radius is `R - d`, never `R + d`; nested concentric corners share the same center. Inset highlight and thickness layers inherit the parent radius rather than defining a second shape. |

Switch geometry is strict:

| Token | Value | Role |
| --- | --- | --- |
| `--opurom-switch-track-width` | `48px` | Track width; 2:1 with the height |
| `--opurom-switch-track-height` | `24px` | Track height; capsule via `--opurom-radius-capsule` |
| `--opurom-switch-thumb-size` | `20px` | Thumb width and height; perfect circle with `border-radius: 50%` |
| `--opurom-switch-thumb-inset` | `2px` | Inset on all four track edges |

The track is `48px` by `24px`, an exact 2:1 ratio. The `20px` by `20px` thumb is a perfect circle. The thumb slides horizontally only, from `2px` to `26px` (a `24px` translate); no vertical translation is permitted. The track clips the thumb with `overflow: hidden`.

## 5. Color and gradient refinement

| Token | Authoritative v2 value | Role |
| --- | --- | --- |
| `--opurom-color-primary-gradient` | `linear-gradient(180deg, #2DD8FF 0%, #006EFF 100%)` | Default emphasis and active gradient; overrides the base 135deg gradient |
| `--opurom-color-primary-gradient-hover` | `linear-gradient(180deg, #4EE0FF 0%, #1A7BFF 100%)` | Hover; +8% brightness |
| `--opurom-color-primary-gradient-active` | `linear-gradient(180deg, #29C2E6 0%, #005FD9 100%)` | Pressed; approximately 10% darker |
| `--opurom-color-primary-soft-glow` | `rgba(37, 209, 255, 0.15)` | 1px inner glow color |
| `--opurom-color-primary-soft` | `rgba(0, 122, 255, 0.08)` | Soft fill, unchanged in value, with an added 1px inner glow |

The soft background keeps `rgba(0, 122, 255, 0.08)` and adds `inset 0 0 0 1px var(--opurom-color-primary-soft-glow)`. The `180deg` direction is top-to-bottom physical light from above; `--opurom-glass-highlight` occupies the top edge and `--opurom-glass-thickness` the bottom edge. The gradient is calm cyan-to-blue only: no rainbow, neon, or full-bleed gradients. The no-banding requirement is the 16-bit smooth gradient transition assigned to the backend in Section 3, "Rendering backend requirements (not CSS declarations)", not a CSS declaration.

## 6. Per-component upgrades

Legend. Tier codes: `T1` = `--opurom-glass-tier1`, `T2` = `--opurom-glass-tier2`, `T3` = `--opurom-glass-tier3`. Token codes: `BD` = `--opurom-glass-blur-desktop`; `BC` = `--opurom-glass-blur-compact`; `FL` = `--opurom-glass-fill-light`; `FD` = `--opurom-glass-fill-dark`; `HI` = `--opurom-glass-highlight`; `TH` = `--opurom-glass-thickness`; `BL` = `--opurom-glass-border-light`; `BK` = `--opurom-glass-border-dark`; `SH` = `--opurom-glass-shadow`; `GO` = `--opurom-glass-glow`; `PG` = `--opurom-color-primary-gradient`; `PH` = `--opurom-color-primary-gradient-hover`; `PA` = `--opurom-color-primary-gradient-active`; `PS` = `--opurom-color-primary-soft`; `SG` = `--opurom-color-primary-soft-glow`; `FR` = `--opurom-shadow-focus`; `HV` = `--opurom-state-hover`; `PV` = `--opurom-state-press`; `FV` = `--opurom-state-focus`; `DV` = `--opurom-state-disabled`; `FAST` = `--opurom-motion-fast`; `MED` = `--opurom-motion-medium`; `LARGE` = `--opurom-motion-large`; `COL` = `--opurom-motion-color`; `SC` = `--opurom-motion-press-scale`; `LF` = `--opurom-motion-hover-lift`; `NONE` = no transition.

State column order is `D / H / A / F / X`. `base` is the tier composition from the layered-token column; `LF(-1px)` is the button lift and `LF(-2px)` the card or FAB lift; `1.25x` is dock magnification; `n/a` marks a state omitted by the base specification state mask; `none` removes transitions. Dark mode substitutes `FL` with `FD` and `BL` with `BK` in every row (Section 8). Every row declares the layered tokens inside the shape with `box-sizing: border-box`.

### 6.1 Buttons (8)

| Component | Tier | Layered CSS tokens | D / H / A / F / X | Motion |
| --- | --- | --- | --- | --- |
| Primary | T2 | `BC+FL+HI+TH+BL+SH+GO+PG` | `base / PH+LF(-1px) / PA+SC / FR+FV+GO+SG / DV+none` | `FAST, COL, SC, LF` |
| Secondary/Outlined | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV+LF(-1px) / PV+SC / FR+FV / DV+none` | `FAST, COL, SC, LF` |
| Dashed/Ghost | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV+LF(-1px) / PV+SC / FR+FV / DV+none` | `FAST, COL, SC, LF` |
| Text | T3 | `BC+FL+HI+TH+BL+PS+SG` | `base / HV / PV / FR+FV+SG / DV+none` | `FAST, COL` |
| Danger | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV+LF(-1px) / PV+SC / FR+FV / DV+none` | `FAST, COL, SC, LF` |
| Icon | T3 | `BC+FL+HI+TH+BL`, circle | `base / HV / PV / FR+FV / DV+none` | `FAST, COL, SC` |
| Button Group | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV+LF(-1px) / PV+SC / FR+FV / DV+none` | `FAST, COL, SC, LF` |
| FAB | T2 | `BC+FL+HI+TH+BL+SH+GO+PG`, circle | `base / PH+LF(-2px) / PA+SC / FR+FV+GO / DV+none` | `MED, COL, SC, LF` |

### 6.2 Input/Form (12)

| Component | Tier | Layered CSS tokens | D / H / A / F / X | Motion |
| --- | --- | --- | --- | --- |
| Text Input | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV+SG / DV+none` | `FAST, COL` |
| Textarea | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV+SG / DV+none` | `FAST, COL` |
| Search | T2 | `BC+FL+HI+TH+BL+SH`, capsule | `base / HV / PV / FR+FV+SG / DV+none` | `FAST, COL` |
| Password | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV+SG / DV+none` | `FAST, COL` |
| Number | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV+SG / DV+none` | `FAST, COL` |
| Select/Dropdown | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Radio | T3 | `BC+FL+HI+TH+BL`, circle | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Checkbox | T3 | `BC+FL+HI+TH+BL` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Switch | T2 | `BC+FL+HI+TH+BL+PG+GO`, switch geometry | `base / HV / PV / FR+FV+GO / DV+none` | `MED, COL` |
| Slider | T2 | `BC+FL+HI+TH+BL+PG`, capsule track | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Date/Time Picker | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| File Upload | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |

### 6.3 Data Display (13)

| Component | Tier | Layered CSS tokens | D / H / A / F / X | Motion |
| --- | --- | --- | --- | --- |
| Tag | T3 | `BC+FL+HI+TH+BL`, capsule | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Badge | T3 | `BC+FL+HI+TH+BL+PG+GO`, circle | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Avatar | T3 | `BC+FL+HI+TH+BL`, circle | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Image Frame | T2 | `BC+FL+HI+TH+BL+SH` | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Card | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV+LF(-2px) / PV+SC / FR+FV / DV+none` | `FAST, COL, SC, LF` |
| List Item | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Table | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Pagination | T3 | `BC+FL+HI+TH+BL` | `base / HV+LF(-1px) / PV+SC / FR+FV / DV+none` | `FAST, COL, SC, LF` |
| Progress Bar | T3 | `BC+FL+HI+TH+BL+PG`, capsule | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Progress Ring | T3 | `BC+FL+HI+TH+BL+PG`, circle | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Spinner | T3 | `BC+FL+HI+TH+BL+PG` | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Skeleton | T3 | `BC+FL+HI+TH+BL` | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |
| Empty State | T2 | `BC+FL+HI+TH+BL+SH` | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |

### 6.4 Navigation (8)

| Component | Tier | Layered CSS tokens | D / H / A / F / X | Motion |
| --- | --- | --- | --- | --- |
| Top Bar | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Side Bar | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Tabs | T3 | `BC+FL+HI+TH+BL+PS+SG` | `base / HV / PV / FR+FV+SG / DV+none` | `MED, COL` |
| Breadcrumb | T3 | `BC+FL+HI+TH+BL` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Desktop Dock (frosted glass) | T1 | `BD+FL+HI+TH+BL+SH+GO` | `base / HV+1.25x / PV / FR+FV+GO / DV+none` | `MED, COL` |
| Mobile Bottom Tab Bar | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Dropdown Menu | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Context Menu | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |

### 6.5 Feedback/Overlay (7)

| Component | Tier | Layered CSS tokens | D / H / A / F / X | Motion |
| --- | --- | --- | --- | --- |
| Modal | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Drawer | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Tooltip | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Toast | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Notification Card | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV+LF(-2px) / PV / FR+FV / DV+none` | `FAST, COL, LF` |
| Popconfirm | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Loading Mask | T1 | `BD+FL+HI+TH+BL+SH` | `base / n/a / n/a / FR+FV / DV+none` | `NONE` |

### 6.6 Other (5)

| Component | Tier | Layered CSS tokens | D / H / A / F / X | Motion |
| --- | --- | --- | --- | --- |
| Divider | T3 | `BL` as a 1px inside stroke; no lamina | `base / n/a / n/a / n/a / DV+none` | `NONE` |
| Collapse/Accordion | T2 | `BC+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `LARGE, COL` |
| Steps | T3 | `BC+FL+HI+TH+BL+PG+GO`, circle | `base / HV / PV / FR+FV+GO / DV+none` | `MED, COL` |
| Timeline | T3 | `BC+FL+HI+TH+BL`, circle nodes | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |
| Toolbar | T1 | `BD+FL+HI+TH+BL+SH` | `base / HV / PV / FR+FV / DV+none` | `FAST, COL` |

## 7. Motion system

| Token | Authoritative v2 value | Role |
| --- | --- | --- |
| `--opurom-motion-fast` | `120ms cubic-bezier(0.4, 0, 0.2, 1)` | Control state changes |
| `--opurom-motion-medium` | `220ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounded overshoot for switch, tabs, steps, and dock |
| `--opurom-motion-large` | `280ms cubic-bezier(0.22, 1, 0.36, 1)` | Panels, drawers, menus, and decelerated slides |
| `--opurom-motion-color` | `180ms ease` | Fill, gradient, and glow color changes |
| `--opurom-motion-press-scale` | `0.97` | Pressed button scale |
| `--opurom-motion-hover-lift` | `-1px` for buttons; `-2px` for cards and FAB | Hover displacement |

These tokens override the base `150ms ease-out` and `250ms ease-out` state and panel transitions for every elevated component. The disabled state resolves to no transition.

Seven mandatory micro-interactions:

| Interaction | Token and behavior |
| --- | --- |
| Button press | `--opurom-motion-press-scale` = `0.97` with `--opurom-motion-fast` |
| Switch overshoot | Horizontal thumb slide with `--opurom-motion-medium`; overshoot is bounded by that curve |
| Hover sheen | `--opurom-glass-highlight` opacity fade with `--opurom-motion-color` |
| Dock magnification | `1.25x` adjacent-item scale with `--opurom-motion-medium` |
| Input focus fade | `--opurom-color-primary-soft-glow` inner glow fades in with `--opurom-motion-color` |
| Card lift | `--opurom-motion-hover-lift` = `-2px` on cards and FAB with `--opurom-motion-fast`; buttons use `-1px` |
| Toast slide | Decelerated entry with `--opurom-motion-large` |

The 60fps floor is a backend requirement in Section 3, "Rendering backend requirements (not CSS declarations)", not a CSS declaration. No exaggerated bounce is permitted: the only overshoot is the bounded `cubic-bezier(0.34, 1.56, 0.64, 1)` in `--opurom-motion-medium`; spring amplitudes beyond that curve are not used.

## 8. Dark mode glass

| Channel | Dark-mode token | Behavior |
| --- | --- | --- |
| Fill | `--opurom-glass-fill-dark` | `rgba(30, 35, 46, 0.38)`, never opaque |
| Border | `--opurom-glass-border-dark` | `rgba(255, 255, 255, 0.12)`, drawn inside the shape |
| Blur | `--opurom-glass-blur-desktop` or `--opurom-glass-blur-compact` | Unchanged by mode |
| Highlight, thickness, shadow, glow | `--opurom-glass-highlight`, `--opurom-glass-thickness`, `--opurom-glass-shadow`, `--opurom-glass-glow` | Unchanged by mode |
| Depth | `--opurom-color-elevated-dark` | Elevated surfaces replace extra shadow layers; `--opurom-glass-shadow` is not stacked |
| Contrast | WCAG AA | Body text at least 4.5:1, large text and UI boundaries at least 3:1, measured against the composited dark glass fill |

Dark mode does not add a second shadow stack. The elevated-surface token and the single glass shadow carry depth, and the base specification's dark palette and contrast rule remain in force.

## 9. Reference alignment

The visual target is the effect and atmosphere of the supplied reference renders: a cool, clean premium cyan-blue atmosphere across component state matrices, form controls, data display, feedback/overlays, dark mode, design tokens, desktop workspace, mobile UI, navigation, and application shell. The intended result is the visual effect of those images, not a measured pixel identity; the checklist in Section 10 is a general guideline for direction, while conformance is defined by the token, geometry, motion, and component contracts above. No automated per-pixel comparison was performed and no per-pixel equality is claimed.

| Characteristic | Objective contract |
| --- | --- |
| Lighting from top | `180deg` top-to-bottom gradient, top `--opurom-glass-highlight`, bottom `--opurom-glass-thickness`, downward soft shadow |
| Soft shadows | The two low-alpha layers in `--opurom-glass-shadow`; no hard drop edges |
| Translucent layers | Alpha 0.42 light or 0.38 dark fills over `blur(20px)` or `blur(12px)` backdrops, with inside borders |
| Restrained cyan-blue accent | `#2DD8FF` to `#006EFF` reserved for emphasis and active elements; neutral single-hue surfaces elsewhere |
| Consistent geometry | Capsules, circles, and the switch geometry of Section 4 across all state matrices |

Only the workspace files listed in Section 11 are cited as artifacts.

## 10. Validation checklist

Backend items in this checklist are forward requirements shared by the software raster `opurom-render` and the GPU backends; the software raster is expected to implement them behind an OPT-IN path so the pinned golden RGBA digests of the default path remain byte-identical.

| # | Checklist item | Attribution (CSS/DOM implementation; forward backend requirement) |
| --- | --- | --- |
| 1 | No flat solid-color fills on elevated components; all have liquid-glass layering | CSS/DOM: Section 2 glass token table and three tier rules, and Section 6 layered-token columns with `--opurom-glass-fill-light`, `--opurom-glass-fill-dark`, `--opurom-glass-blur-desktop`, `--opurom-glass-blur-compact`, `--opurom-glass-highlight`, `--opurom-glass-thickness`, `--opurom-glass-shadow`, `--opurom-glass-border-light`, and `--opurom-glass-border-dark`; declared in `opurom-web/lib/design.mjs` (`FOUNDATION`, `designCss`) and emitted by `opurom-web/lib/emit.mjs` (`styleFor`) |
| 2 | No jagged edges, no pixelated curves; all shapes are smooth and anti-aliased | Partially implemented. CSS/DOM: Section 3, "CSS/DOM declarations" supplies the `1px` inside border where CSS permits, and Section 4 supplies the shape rules, emitted by `opurom-web/lib/emit.mjs` (`styleFor`). Current software-raster baseline: 6x6 coverage on text edges and 4x4 coverage on icon edges; box rounded corners, circles, rings, and line edges have no coverage in the default path. Shape-edge coverage: Forward requirement on opurom-render / GPU backend; not emitted as CSS. |
| 3 | No blurry / fuzzy text; all typography is sharp, baseline-aligned and correctly weighted | CSS/DOM: Section 3, "CSS/DOM declarations": `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `text-rendering: optimizeLegibility`, `font-synthesis: none`, weights 400/500/600/700, 4.5:1 contrast, and the baseline alignment approximation; token layer in `opurom-web/lib/design.mjs` (`FOUNDATION`, `designCss`) and body rules in `opurom-web/lib/emit.mjs` (`cssFor`). Software-raster text placement is geometric band centering, not baseline-grid alignment. Exact baseline-grid vertical centering of text: Forward requirement on opurom-render / GPU backend; not emitted as CSS. |
| 4 | No malformed rounded shapes; all capsules and circles are mathematically correct | CSS/DOM: Section 4 ELLIPSE caveat, `border-radius: <height/2>px` capsule rule, equal width/height circle rule, four-corner consistency, proportional inner corners; `--opurom-radius-capsule`, `--opurom-radius-full`, `--opurom-switch-track-width`, `--opurom-switch-track-height`, `--opurom-switch-thumb-size`, `--opurom-switch-thumb-inset`, declared in `opurom-web/lib/design.mjs` (`FOUNDATION`) and emitted by `opurom-web/lib/emit.mjs` (`styleFor`) |
| 5 | No plain blue blocks; all primary elements use gradient + highlight + shadow layering | CSS/DOM: Section 5 `--opurom-color-primary-gradient`, `--opurom-color-primary-gradient-hover`, `--opurom-color-primary-gradient-active`, `--opurom-color-primary-soft`, `--opurom-color-primary-soft-glow`; Section 2 `--opurom-glass-highlight`, `--opurom-glass-shadow`, `--opurom-glass-glow`, declared in `opurom-web/lib/design.mjs` (`FOUNDATION`) and emitted by `opurom-web/lib/emit.mjs` (`styleFor`). The 16-bit no-banding gradient transition: Forward requirement on opurom-render / GPU backend; not emitted as CSS. |
| 6 | All interactive states have smooth, refined motion transitions | CSS/DOM: Section 7 `--opurom-motion-fast`, `--opurom-motion-medium`, `--opurom-motion-large`, `--opurom-motion-color`, `--opurom-motion-press-scale`, `--opurom-motion-hover-lift`, seven micro-interactions, and bounded overshoot; Section 6 `D / H / A / F / X` columns; declared in `opurom-web/lib/design.mjs` (`FOUNDATION`, `designCss`). The 60fps floor: Forward requirement on opurom-render / GPU backend; not emitted as CSS. |
| 7 | Overall visual quality matches the 13 reference preview renders in detail and atmosphere | Section 9 reference alignment: the target is the visual effect and atmosphere, with lighting from top, soft shadows, translucent layers, and a restrained cyan-blue accent. No automated per-pixel comparison was performed; no measured pixel equality is claimed. |
| 8 | Every component from the original specification has received the above upgrades | Section 6, subsections 6.1 to 6.6: all 53 component forms (8 + 12 + 13 + 8 + 7 + 5), each with a tier, layered tokens, five state slots, and a motion token |

## 11. Implementation mapping

Only workspace-relative files verified to exist are cited.

| File | Responsibility in this supplement |
| --- | --- |
| `opurom-web/lib/design.mjs` | Token layer: foundational `FOUNDATION` values, `designCss`, and `semanticCss`; the target for the v2 custom properties in Sections 2, 4, 5, and 7 |
| `opurom-web/lib/emit.mjs` | DOM emitter: `styleFor` emits per-node `backdrop-filter`, `background`, `box-shadow`, `border`, and `border-radius` CSS for glass nodes; `cssFor` emits the body font-smoothing and `box-sizing` rules. It does not emit any Section 3 backend requirement. |
| `opurom-render/src/raster.rs` | Backend source to which the Section 3 forward requirements apply and in which they are NOT yet implemented; it currently performs integer pixel writes, rounded-rect gradient fills, and sub-sampled glyph rasterization, and emits no CSS. An opt-in coverage flag is the intended mechanism for the remaining coverage requirements. |
| `opurom-spec/DEFAULT_UI_SYSTEM.md` | Base specification with the overridden clauses listed in the scope statement above and the 53 component forms used in Section 6 |
| `opurom-spec/assets/ui/*.svg` | Eight verified SVG assets: `preview-buttons.svg`, `preview-data-display.svg`, `preview-feedback.svg`, `preview-inputs.svg`, `preview-navigation.svg`, `preview-other.svg`, `token-architecture.svg`, `token-overview.svg` |
