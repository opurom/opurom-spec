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
  returned, never a fake success. Dependencies are target-scoped in Cargo.toml so Linux CI builds
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
- A particle system with a fixed seed (no rand crate, no wall clock): N particles, integer
  positions/velocities, bounded lifetime; identical tick sequences give identical digests.
- Automatic degradation: given a measured frame budget in ms, the animator reduces particle count
  and disables expensive effects; the chosen quality level is deterministic for the same budget.
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


