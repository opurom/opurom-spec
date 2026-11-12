# OPUROM R6 Addendum (normative)

R6 targets real platform delivery: GPU UI rasterization, a real browser DOM/Canvas hybrid with
pixel-consistency verification, real mobile native artifacts, custom components, build-size
optimization, and signed packages. Additive: R1-R5 IR stays valid, golden digests unchanged, all
existing tests stay green. Builds remain offline-capable with cached crates; no new external crate
is required.

## 1. GPU UI rasterization (`opurom-gpu` + `opurom-render`)

- `opurom-render --commands <out.json>` dumps the exact display list used for a frame: solid rects,
  rounded rects and two-stop gradients with integer bounds/colours.
- `opurom-gpu raster <commands.json> <out.ppm>` executes that display list with a Metal compute
  kernel and writes PPM. For a rect/gradient fixture, the GPU PPM MUST be byte-identical to the
  software `opurom-render` PPM for the same IR and viewport. That is the real GPU/software pixel
  consistency proof, not a self-comparison against the same code.
- Honest scope: text glyph compositing stays CPU-side in R6; no full-scene GPU text, no GPU
  presentation to a window, no Vulkan/ANGLE/D3D, no fps claims.

## 2. Web DOM/Canvas hybrid (new project `opurom-web`)

- Zero-dependency Node project reading IR JSON and emitting a real `index.html`: semantic DOM
  (`header`/`main`/`button`, ARIA roles from the a11y contract) for structure and accessibility,
  plus a `<canvas>` for gradient/effect painting. No runtime IR interpreter.
- `verify` launches headless Chromium (Microsoft Edge on this host), executes the page, and reads
  back the canvas `getImageData` digest plus DOM role/computed-style facts. The digest MUST equal
  an independent Node-side CPU reference over the same deterministic gradient. Graceful documented
  SKIP when no browser is present (Linux CI without Edge).
- Honest scope: one browser engine on one host; no cross-browser matrix, no real device, no
  automated visual regression against Flutter/React Native.

## 3. Mobile native artifacts (new project `opurom-mobile`)

- A pure-std Rust `staticlib` with a C ABI (`opu_state_new`, `opu_dispatch`, `opu_frame`,
  `opu_state_free`) built for `aarch64-apple-ios` and verified as a real arm64 archive.
- A Swift wrapper typechecked with `xcrun --sdk iphoneos swiftc -typecheck` against a module map
  and C header; a JNI header plus Java class compiled with `javac`.
- `verify` runs the cross-compile/typecheck/compile steps and skips honestly on non-macOS hosts.
- Honest scope: no Android NDK on this host (no `.so` built), no simulator/device execution, no
  App Store submission, no Harmony toolchain. Those remain R7+.

## 4. Custom components (`opurom-lang`)

- `component Card(title) { ... }` declarations with typed parameters and `Card("Hi")` use sites,
  expanded at compile time into ordinary IR children. Diagnostics for recursion/cycles, arity
  mismatch, unknown component and parameter type errors.
- Plain programs stay byte-identical; all 48 R5 tests, 9 emitters, wasm ABI, optimizer, catalog,
  async/imports, R5 `computed`/`unless`/`list` stay green.

## 5. Build-size optimization (`opurom-cli`)

- `build --minify` applies a zero-dependency JS minifier (safe comment/whitespace removal, no
  identifier mangling) and removes unused generated assets; `size` reports measured before/after
  bytes and reduction percentage. Minified JS MUST still pass `node --check` and the e2e suite.
- Honest scope: no bundler, no source maps, no Brotli/zstd, no dependency graph analysis beyond
  the emitter's own output.

## 6. Signed packages and a local registry (`opurom-pkg`)

- Ed25519 signing via Node built-in `crypto`: `sign` writes detached signatures, `verify --signed`
  rejects tampering, wrong keys and missing signatures.
- A local HTTP registry (`registry-server`, `publish`, `install`) over loopback TCP with exact
  version resolution and SHA-256 integrity; conformance tests use a real ephemeral-port server.
- Honest scope: local mock registry, no public marketplace, no TLS, no key distribution/rotation,
  no revocation. Those remain R7+.

## 7. Honest scope

R6 implements: GPU display-list rasterization with byte-identical PPM output, a real browser
DOM/Canvas hybrid with canvas digest equality, real arm64 iOS static library plus Swift/JNI
compile checks, compile-time custom components, measured JS minification, and signed packages
over a local registry.

Still R7+: full-scene GPU text/presentation, Vulkan/ANGLE/D3D, Windows/Linux/Harmony native
windows, Android `.so`/simulator/device runs, TLS, real PostgreSQL server, MySQL, a public
package marketplace, an IntelliJ runtime plugin, OS screen-reader integration, real device
conformance and measured competitive benchmarks. No invented numbers anywhere.
