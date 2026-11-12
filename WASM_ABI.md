# OPUROM WASM target ABI (R2, normative)

`opuromc target <ir> --target wasm -o <dir>` is the 9th emitter. It produces:

| File | Content |
| --- | --- |
| `Cargo.toml` | `crate-type = ["cdylib"]`, std only, no dependencies |
| `src/lib.rs` | generated straight-line Rust implementing the ABI below |
| `index.html`, `host.js` | browser host: loads the `.wasm`, draws with Canvas 2D, forwards taps |
| `README.md` | build/run instructions |

Build: `cargo build --release --target wasm32-unknown-unknown` →
`<dir>/target/wasm32-unknown-unknown/release/<crate>.wasm`.

## Exported C ABI (all `#[no_mangle] extern "C"`)

```rust
fn opu_version() -> u32;                 // 1 for this ABI
fn opu_state_len() -> u32;              // number of int states
fn opu_state(index: u32) -> i32;        // int state by declaration order; -1 if out of range
fn opu_tap(node_id: u32) -> u32;        // applies tap action chain; returns patch count
fn opu_input(node_id: u32, v: i32) -> u32; // applies input action chain with numeric value
```

Only `int` states are exposed through this ABI in R2; bool/string states live in `host.js` as a
mirror and are applied there. `opu_tap` applies the full `actions` array (or the single v0.1
action) in order, including `valueFrom` reads, and returns the number of patches. Unknown
`node_id` returns 0. Overflow uses checked arithmetic and saturates rather than wrapping.

`host.js` must pass `node --check`. The generated `.wasm` must instantiate in Node's
`WebAssembly` runtime with an empty import object; a conformance script must assert
`opu_version() == 1`, `opu_state(0) == <init>`, `opu_tap(<plus button id>) == 1`, and
`opu_state(0) == <init + 1>`.

## Honesty

This emits real `wasm32` machine code with no JS bridge for state logic. It does **not** yet
provide DOM/WASM hybrid rendering, SIMD, threads, or a measured startup benchmark. Those are R3+.
