# OPUROM Animation and Physics (normative)

This document specifies the animation physics added to the OPUROM renderer: an inertia curve,
wall restitution and equal-mass contact response for the particle system. Everything is
integer-only, deterministic and additive; the three golden digests `16b69e96b1534324`,
`aaf572509f15d60c` and `e5d71acb7602eab2` are unchanged by this level. Those three were
re-baselined for the brand accent, after an earlier re-baseline for text anti-aliasing: glyph
ink boxes and advance metrics did not move, so this level adds no pixel change of its own.

## 1. Units

| Name | Value | Meaning |
| --- | --- | --- |
| `ONE` | 1024 | A fully settled curve progress |
| `STEP_MS` | 16 | One animation step in milliseconds |

Progress values are fixed-point integers scaled by `ONE`. Time advances only through explicit
steps; no wall-clock reading ever changes renderer output.

## 2. Inertia curve

The `animate: "inertia"` prop selects `Curve::Inertia`. Per step the velocity `v` starts at
`FLING = 256` distance units and is reduced by `BRAKE = 32`:

- step `k` travels `FLING - k * BRAKE`;
- progress accumulates the travelled distance, clamped to `ONE`;
- velocity is a positive multiple of `BRAKE` while braking and rests at `0` after
  `FLING / BRAKE = 8` steps.

A test asserts the live curve is still below `ONE` before the settling step, equals `ONE` at the
settling step and stays at `ONE` for every later step, so the settle point is derived from the
formula and observed in the same run.

## 3. Wall restitution

A particle that crosses a field boundary reflects with
`RESTITUTION = ONE * 3 / 4` (three quarters of `ONE`):

- reflected velocity `v' = -(v * 768) / 1024` (integer division, truncating toward zero);
- the position mirrors about the boundary and is then clamped to the field;
- a positive speed of 1 truncates to 0, which keeps the system bounded.

The test asserts the observed rebound velocity equals the formula evaluated in the test.

## 4. Equal-mass contact

Two particles exchange velocity along an axis when all of the following hold:

- `|dx| < TOUCH` and `|dy| < TOUCH` where `TOUCH = 16` covers the maximum closing distance of
  one step, so a closing pair cannot tunnel through;
- the axis is closing (`dx * dvx <= 0` with `dvx != 0`, same for `y`).

Each particle compares only against the next `NEIGHBORS = 8` index neighbours, which bounds the
whole pass at `8` checks per particle and keeps the step deterministic and linear in the
particle count.

## 5. Determinism contract

A particle system is fully determined by `(seed, count, step count)`:

- the same seed and count advanced by the same number of steps produce byte-identical particle
  state (position, velocity, lifetime for every particle);
- step mode for wrap-around motion and step mode for bounce motion are separate explicit modes;
  the default mode keeps the historical wrap behaviour byte for byte;
- a fixed-seed spawn with count `0` stays empty; count `N > 0` yields `N` particles after any
  number of steps.

## 6. Verification

The renderer test suite reports:

- the measured settle step count and the measured rebound velocities, both asserted against the
  formulas above;
- an elastic pair-exchange assertion for a closing pair;
- a two-system determinism assertion over a particle population advanced for 100 steps;
- unchanged golden digests for the software renderer at 320x240, 800x600 and 800x600 with a
  state override.

No frame-rate, throughput or benchmark numbers are implied by this document; every number here
is a structural constant or a count asserted by a test.
