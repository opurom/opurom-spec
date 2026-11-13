# OPUROM Browser and Native Surfaces Addendum (normative)

The visual fidelity layer closes the gaps that do not require a device farm: deterministic advanced
visual effects, a real two-engine browser matrix, Windows/Linux native-window adapters and macOS
screen-reader integration, mutual TLS with certificate revocation, a MySQL wire client, and
multi-device sync debugging over WebSocket.

Everything is additive: all earlier IR versions stay valid, golden digests stay unchanged, and existing tests
stay green. All work must be verifiable on this host or explicitly SKIP with a concrete reason.
No invented numbers.

## 1. Advanced deterministic visual effects (`opurom-render`)

- Five real software effects driven by optional IR effect props: box `blur`, `shadow`, `glow`,
  frosted `glass` (alpha compositing) and `liquid` glass (specular highlight). Integer
  fixed-point maths only; no crate, no wall clock, no GPU.
- Identical IR + viewport + state + theme MUST give byte-identical pixels. Effects absent MUST
  leave the three V0.1 golden digests unchanged: 320x240 `c87bf023a6c01f9d`, 800x600
  `8cc3021fa80749b5`, 800x600 --state count=7 `e7aad51c98d9cf21`.
- `--commands` output for an IR with no effects MUST stay byte-identical to the platform delivery
  layer output so the Metal display-list equality proof keeps working.
  real-time 120fps claim.

## 2. Real cross-browser matrix (`opurom-web`)

- A second REAL browser engine: WebKit (Safari's engine) through `WKWebView` on macOS. Load the
  same generated hybrid page, evaluate `canvas.getImageData`, and read back the digest plus DOM
  roles/computed styles. Chromium (Microsoft Edge) stays the first engine.
- `verify --matrix` reports BOTH engines' measured digests and states whether each equals the
  independent Node CPU reference. A single-engine mismatch is a FAIL, not an average.
- Off macOS, or with an engine unavailable, report a documented SKIP naming the missing engine;
  never fake a second-engine PASS.

## 3. Native OS surfaces (`opurom-platform`)

- A Win32 window adapter using `windows-sys` FFI (`CreateWindowExW`, message pump, `WM_PAINT`,
  `BitBlt`/`StretchDIBits`) behind `#[cfg(target_os = "windows")]`, compile-checked with
  `cargo check --target x86_64-pc-windows-gnu`.
- An X11 adapter using raw FFI declarations (`XOpenDisplay`, `XCreateSimpleWindow`, `XPutImage`,
  `XNextEvent`) behind `#[cfg(target_os = "linux")]`, compile-checked with
  `cargo check --target x86_64-unknown-linux-gnu`.
- macOS screen-reader integration: post the accessibility tree through NSAccessibility /
  `AXUIElement` APIs. If the OS denies Accessibility permission, report a concrete SKIP.

## 4. Mutual TLS and revocation (`opurom-server`)

- `OPR_MTLS=1` plus a CA PEM requires and verifies a client certificate during the rustls
  handshake; a missing or untrusted client certificate is refused with a clear diagnostic.
- A revocation deny list (`OPR_REVOKED` fingerprints) rejects a certificate that is otherwise
  trusted. Revocation is a static deny list, NOT OCSP or a distributed CRL.
- ALPN negotiates `h2` and `http/1.1`; report the selected protocol. Plain HTTP and the
  single-sided TLS paths stay byte-identical.
  certificate transparency.

## 5. MySQL wire client (`opurom-db`)

- Pure-std MySQL protocol v10 frontend: initial handshake, `mysql_native_password` response,
  OK/ERR/EOF packets, `COM_QUERY` with column-count + column definitions + text rows, and typed
  error mapping from MySQL error codes.
- A local TCP mock server conformance test speaks the real byte sequences; no external MySQL.

## 6. Multi-device sync debugging (`opurom-cli`)

- `dev --sync --clients N` connects N real WebSocket clients to the OPUROM sync hub, dispatches
  one state event and verifies every client receives the SAME state delta, reporting measured
  delivery times per client. N defaults to 2, capped at 8.
- A client that misses the delta is a FAIL. Missing hub reports `n/a (reason)`; never fabricate.


