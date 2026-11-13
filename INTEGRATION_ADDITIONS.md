# OPUROM Integration Addendum (normative)

The integration layer targets the last "real" gaps that are verifiable on this host: real renderer
output inside the mobile libraries, an animated multi-frame GPU render loop, a richer language
server, and honest sample apps that exercise the grown catalog. Everything is additive: all earlier
IR versions stay valid, golden digests stay unchanged, and existing tests stay green.

## 1. Real renderer inside the mobile libraries (`opurom-mobile` + `opurom-render`)

- `opurom-render` compiles cleanly for `aarch64-apple-ios` and `aarch64-linux-android` today. The
  mobile staticlib/cdylib gains `opu_frame_from_ir(ir_json, state_json, out, w, h)` which parses
  the IR JSON with the REAL renderer (`Renderer::try_new` + `pixels_at`) and writes RGBA8, so the
  Android Activity/iOS app render actual OPUROM UI, not the toy counter gradient.
- The C ABI stays stable: existing `opu_state_new/dispatch/frame/free` keep their exact semantics;
  the new entry points are additive. The Android app renders the compiled Todo IR through JNI.
- Size/perf are MEASURED and reported (library size before/after, render time per frame); no fps
  claim. If the binary size becomes unacceptable, document the number and the reason.

## 2. Animated multi-frame GPU render loop (`opurom-gpu` + `opurom-platform`)

- The GPU presentation path presents ONE frame. The integration layer adds a bounded,
  deterministic multi-frame loop: render N frames at N distinct animation ticks through the GPU
  pipeline, present each through the real CAMetalLayer drawable, and capture the window after each
  present. The captured sequence MUST equal the software renderer's sequence at the same ticks
  within the documented capture tolerance.
- This retires the "stale IOSurface" risk: layer contents are refreshed per frame from the
  drawable that was just presented.
- MEASURED per-frame GPU dispatch/present times are reported (Instant-based); no fps claim.

## 3. Language server completeness (`opurom-lsp`)

- Add `documentSymbol`, `references`, `rename` (state names only, with prepareRename validation),
  `documentFormatting` (deterministic indentation/braces normalization for OPUROM), and
  `codeAction` (quick-fixes for the compiler's friendly diagnostics where a fix is unambiguous).
- The initialize response advertises the new providers; a real Content-Length framed test suite
  covers each request including error paths. Existing 5 tests stay green.

## 4. Sample apps that exercise the grown catalog (`opurom-examples`)

- `showcase.opu` still claims "108 catalog names / 24 primitives" in comments and UI text. Replace
  it with a real gallery page rendering one instance of EVERY new primitive kind (100 kinds,
  grouped by family), compiled to all 9 targets, with a11y roles asserted through the harness.
- A new `gallery.opu` (or an extended showcase) compiles and renders deterministically; the
  cross-layer harness asserts its IR lowers, its digest is stable, and its component count.


