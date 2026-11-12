# OPUROM R8 Addendum (normative)

R8 closes gaps that do not require a device farm: deterministic advanced visual effects, a real
two-engine browser matrix, Windows/Linux native-window adapters and macOS screen-reader
integration, mutual TLS with certificate revocation, a MySQL wire client, and multi-device sync
debugging over WebSocket.

Everything is additive: R1-R7 IR stays valid, golden digests stay unchanged, and existing tests
stay green. All work must be verifiable on this host or explicitly SKIP with a concrete reason.
No invented numbers.

## 1. Advanced deterministic visual effects (`opurom-render`)

- Five real software effects driven by optional IR effect props: box `blur`, `shadow`, `glow`,
  frosted `glass` (alpha compositing) and `liquid` glass (specular highlight). Integer
  fixed-point maths only; no crate, no wall clock, no GPU.
- Identical IR + viewport + state + theme MUST give byte-identical pixels. Effects absent MUST
  leave the three V0.1 golden digests unchanged: 320x240 `c87bf023a6c01f9d`, 800x600
  `8cc3021fa80749b5`, 800x600 --state count=7 `e7aad51c98d9cf21`.
- `--commands` output for an IR with no effects MUST stay byte-identical to R6 so the Metal
  display-list equality proof keeps working.
- Honest scope: software effects only, no GPU effect kernels, no real lens refraction, no
  real-time 120fps claim.

## 2. Real cross-browser matrix (`opurom-web`)

- A second REAL browser engine: WebKit (Safari's engine) through `WKWebView` on macOS. Load the
  same generated hybrid page, evaluate `canvas.getImageData`, and read back the digest plus DOM
  roles/computed styles. Chromium (Microsoft Edge) stays the first engine.
- `verify --matrix` reports BOTH engines' measured digests and states whether each equals the
  independent Node CPU reference. A single-engine mismatch is a FAIL, not an average.
- Off macOS, or with an engine unavailable, report a documented SKIP naming the missing engine;
  never fake a second-engine PASS.
- Honest scope: two engines on one macOS host; no Firefox, no mobile browsers, no device matrix.

## 3. Native OS surfaces (`opurom-platform`)

- A Win32 window adapter using `windows-sys` FFI (`CreateWindowExW`, message pump, `WM_PAINT`,
  `BitBlt`/`StretchDIBits`) behind `#[cfg(target_os = "windows")]`, compile-checked with
  `cargo check --target x86_64-pc-windows-gnu`.
- An X11 adapter using raw FFI declarations (`XOpenDisplay`, `XCreateSimpleWindow`, `XPutImage`,
  `XNextEvent`) behind `#[cfg(target_os = "linux")]`, compile-checked with
  `cargo check --target x86_64-unknown-linux-gnu`.
- macOS screen-reader integration: post the accessibility tree through NSAccessibility /
  `AXUIElement` APIs. If the OS denies Accessibility permission, report a concrete SKIP.
- Honest scope: Windows/Linux adapters are COMPILED, not executed (no Windows host and no X
  server here); Wayland, HarmonyOS and native widget embedding remain R9+.

## 4. Mutual TLS and revocation (`opurom-server`)

- `OPR_MTLS=1` plus a CA PEM requires and verifies a client certificate during the rustls
  handshake; a missing or untrusted client certificate is refused with a clear diagnostic.
- A revocation deny list (`OPR_REVOKED` fingerprints) rejects a certificate that is otherwise
  trusted. Revocation is a static deny list, NOT OCSP or a distributed CRL.
- ALPN negotiates `h2` and `http/1.1`; report the selected protocol. Plain HTTP and the R7
  single-sided TLS paths stay byte-identical.
- Honest scope: no HTTP/2 frame implementation in R8, no OCSP/CRL fetch, no HSM, no
  certificate transparency.

## 5. MySQL wire client (`opurom-db`)

- Pure-std MySQL protocol v10 frontend: initial handshake, `mysql_native_password` response,
  OK/ERR/EOF packets, `COM_QUERY` with column-count + column definitions + text rows, and typed
  error mapping from MySQL error codes.
- A local TCP mock server conformance test speaks the real byte sequences; no external MySQL.
- Honest scope: no caching_sha2_password, no TLS negotiation, no prepared statements, no
  connection pooling, no real MySQL server tested.

## 6. Multi-device sync debugging (`opurom-cli`)

- `dev --sync --clients N` connects N real WebSocket clients to the OPUROM sync hub, dispatches
  one state event and verifies every client receives the SAME state delta, reporting measured
  delivery times per client. N defaults to 2, capped at 8.
- A client that misses the delta is a FAIL. Missing hub reports `n/a (reason)`; never fabricate.
- Honest scope: loopback clients on one host, not real devices; no visual diff, no network
  capture UI.

## 7. Honest scope

R8 implements: five deterministic software visual effects, a real Chromium + WebKit digest
matrix, compile-verified Win32/X11 adapters plus macOS accessibility posting, mutual TLS with a
static revocation deny list and ALPN, a MySQL-protocol frontend with a mock server, and N-client
WebSocket sync verification.

Still R9+: GPU effect kernels, GPU presentation, Vulkan/ANGLE/D3D, running Windows/Linux windows
and Wayland, HarmonyOS, HTTP/2 frames, OCSP/CRL, caching_sha2_password and a real MySQL server,
a public package marketplace, an IntelliJ runtime plugin, real-device conformance and measured
competitive benchmarks. No invented numbers anywhere.
