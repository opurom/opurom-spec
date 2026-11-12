# OPUROM Platform Adapter ABI v0.1 (normative)

The adapter is the only platform-specific code. Adding a platform implements this ABI; the
kernel, compiler and renderer do not change.

## Core trait (Rust)

```rust
pub trait PlatformAdapter {
    fn name(&self) -> &str;
    fn capabilities(&self) -> Capabilities;
    fn viewport(&self) -> Size;
    fn poll_event(&mut self) -> Option<InputEvent>;
    fn present(&mut self, frame: FrameView<'_>) -> Result<(), AdapterError>;
}
```

`FrameView` is a borrowed, platform-neutral pixel view, defined in the adapter crate so the
renderer does **not** become a compile-time dependency of adapters:

```rust
pub struct FrameView<'a> { pub width: u32, pub height: u32, pub pixels: &'a [u8] } // RGBA8
```

The renderer exposes `Frame::view() -> FrameView<'_>` with the same layout.

## Unified input

```rust
pub enum InputEvent {
    Tap { x: f32, y: f32, node_id: u32 },
    Input { node_id: u32, text: String },
    Key { code: u32, pressed: bool },
    Resize { size: Size },
    Lifecycle(Lifecycle),            // Resumed, Paused, Destroyed
}
pub enum Lifecycle { Resumed, Paused, Destroyed }
```

Adapters normalize touch/mouse/keyboard into these. Coordinates are logical pixels, origin
top-left. `node_id` is resolved by hit-testing in the host; adapters that cannot hit-test pass
`u32::MAX` and the core resolves it from layout.

## Capabilities

```rust
pub struct Capabilities {
    pub gpu: bool,            // hardware accelerated presentation available
    pub native_embed: bool,   // can host a system-native widget
    pub multi_window: bool,
    pub lifecycle: bool,
    pub dpi_scale: f32,
}
```

`registry()` returns a `Vec<PlatformSpec>` covering: android, ios, harmony-mobile,
harmony-pc, windows, macos, linux, wechat, alipay, qq, douyin, baidu, kuaishou, web. Each spec
names the platform, its target emitter, its capabilities and its **verified status**
(`Verified | Scaffold | Planned`). Only `headless` is `Verified` in v0.1. Never claim a platform
is implemented when only its scaffold exists.

## Headless reference adapter (v0.1, fully implemented)

- Queues `InputEvent`s via `push_event`, drains via `poll_event`.
- `present` copies the frame into an internal buffer and exposes `sha256`-like deterministic
  digest over RGBA bytes, so host tests can assert identical pixels across runs.
- `resize` emits a `Resize` event and updates `viewport`.
- No windowing dependency; runs on any OS. This is the conformance oracle for future adapters.

## Fault isolation

Adapter errors are values (`AdapterError`), never panics across the boundary. The kernel treats
an adapter that returns `Err` three times consecutively as degraded, switches to the headless
adapter, and keeps the app alive. See [ARCHITECTURE.md](ARCHITECTURE.md).
