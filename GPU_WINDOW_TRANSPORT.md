# OPUROM GPU, Window and Transport Addendum (normative)

The GPU and transport layer targets real hardware acceleration, a real OS window, deeper language
expressiveness and production protocol coverage. Everything is additive: all earlier IR versions
stay valid, golden digests stay unchanged, and all existing tests stay green. Builds are
offline-capable with cached crates.

## 1. Metal GPU backend (new project `opurom-gpu`)

A genuine GPU compute path on macOS, not a stub:

- `MTLCreateSystemDefaultDevice()` via `objc2-metal`, `newLibraryWithSource` for an MSL compute
  kernel (no Xcode Metal Toolchain needed at build time), a compute pipeline, a command queue and
  an output buffer read back to the CPU.
- The kernel fills an RGBA8 buffer from the same deterministic primitives the software renderer
  uses (solid fill + two-stop gradient). The readback MUST byte-match an independent CPU reference
  for the same parameters. That is the GPU/software pixel-consistency check.
- CLI `opurom-gpu probe`: prints the real device name, the measured dispatch time (Instant) and
  the readback digest. `opurom-gpu self-test` runs the consistency assertion.
- `#[cfg(target_os = "macos")]` only; on other targets a documented `MetalUnavailable` error is
  returned. Dependencies are target-scoped in Cargo.toml so Linux CI builds
  the crate without Metal.

## 2. macOS native window adapter (`opurom-platform`)

- A real AppKit host: `NSApplication`/`NSWindow`/`NSView` with a `CAMetalLayer`-compatible
  surface descriptor, created through `objc2-app-kit` + `objc2-quartz-core`, cfg-gated to macOS.
- `present(FrameView)` converts RGBA rows into a `CGImage` (via `core-graphics`) and writes a real
  PNG using the `png` crate — verifiable output even without a GUI session.
- The live-window entry point is `open_window()`, which is NEVER called in CI. Tests cover the
  pure frame→PNG path, capability reporting, DPI scale from `NSScreen` when available, and
  `MetalUnavailable`-style fallback on non-macOS.
- Multi-window: `WindowSet` manages 2..4 independent viewports, each with its own `Size`, event
  queue and frame buffer; resize of one window must not affect the others. Deterministic tests.

## 3. Animation system (`opurom-render`)

- Page transitions (`slide`, `fade`, `scale`) and gesture-linked animation driven by integer
  fixed-point progress 0..1024, deterministic at a given tick.
- A particle field (`particles` prop): a fixed-seed, fixed-count integer scatter of dots over a
  node rectangle. `count` is required; `seed` (default 1), `radius` (default 2) and `alpha`
  (default 1024, fixed point with 1024 fully opaque) are bounded integers; `color` is an optional
  `#RRGGBB` that falls back to the node accent. Dot `i` is placed at the pure integer hash of
  `(seed, i)` reduced modulo the rect — no clock, no rand, no global state — so the same command
  paints the same bytes on every host.
- Particle rendering is a spatial primitive, not a simulation: dots are static, every dot position
  is a pure function of the seed and the dot index, and nothing advances over time. The renderer
  records one display-list `particles` command per node; `opurom-gpu` parses the same command
  (`KIND_PARTICLES`) with the same bounds and its MSL kernel evaluates the identical unsigned
  integer hash and index-order dot blending per pixel.
- A moving particle simulation exists as a caller-owned library API: `ParticleSystem` advances
  integer positions, velocities and bounded lifetimes by explicit `step()` / `step_mode()` calls,
  with `Wrap` (default) and `Bounce` modes and deterministic, formula-verified contact and
  restitution arithmetic. No tick loop or wall clock drives it; see [ANIMATION_AND_PHYSICS.md](ANIMATION_AND_PHYSICS.md).
- Quality tiers are caller-applied, not automatic: `choose_quality(budget_ms, count, effects)`
  maps a measured frame budget to a deterministic particle count and effect policy (`>=16 ms`
  full, `>=8 ms` three quarters, `>=4 ms` half, otherwise one quarter, effects disabled below the
  full tier). Callers decide whether and when to use it; nothing measures a budget on its own.
- All V0.1 golden digests MUST NOT change. No fps claims; `profile` remains the measured source.

## 4. Language expressiveness (`opurom-lang`)

- `else` after `if (boolState)` — lowers to a second `when`-style field `unless` on the child
  nodes; v0.1 consumers ignore `unless`.
- `computed NAME = EXPR` — a derived int/bool/string value recomputed from state after each event;
  IR gains optional top-level `computed` array with `{name, type, expr}`. Only `+`, `-`, `*`,
  integer literals and state names are allowed here.
- List-valued state: `state items = ["a", "b"]` and `for (item in items) { Text("{item}") }`
  unrolls at compile time against the initializer; list contents are fixed at compile times.
- Plain programs keep byte-identical IR. All existing tests and emitters stay green.

## 5. PostgreSQL wire protocol client (`opurom-db`)

- A pure-std PostgreSQL v3 frontend: startup message, `AuthenticationOk`, `ParameterStatus`,
  `BackendKeyData`, `ReadyForQuery`, simple `Query` with `RowDescription`/`DataRow`/
  `CommandComplete` parsing, and clean error handling for `ErrorResponse`.
- A conformance test spins up a local TCP mock server that speaks those messages; no external
  database is required. CRUD helpers route to either SQLite or Postgres through the `Database`
  trait where SQL is compatible.

## 6. Production HTTP features (`opurom-server`)

- Bearer-token auth with constant-time comparison (`OPR_AUTH_TOKEN`), returning `401` JSON.
- gzip response compression via `flate2` when the request sends `Accept-Encoding: gzip`.
- `ETag`/`If-None-Match` → `304 Not Modified`, and configurable CORS headers (`OPR_CORS`).
- All features are opt-in and default behaviour stays byte-identical; structured logging and rate
  limiting from the rate limiter keep working. Tests cover each header/status/body path.


