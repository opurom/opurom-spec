# OPUROM R7 Addendum (normative)

R7 targets the gaps that require real network, real operating-system windows and real mobile
artifacts: TLS, a live native window with on-screen verification, an Android native library, a
real PostgreSQL server, WebSocket/HTTP2 readiness and honest performance measurement.

Everything is additive: R1-R6 IR stays valid, golden digests stay unchanged, existing tests stay
green. New dependencies are allowed this round because the crate registry is reachable; every new
dependency must be pinned and justified.

## 1. TLS transport (`opurom-server` + `opurom-db`)

- A pure-Rust TLS 1.2/1.3 client for the PostgreSQL wire protocol using `rustls` (no OpenSSL
  dependency). `PgConnection::connect_tls(host, port, user, database, server_name)` negotiates TLS
  before the startup message, and the protocol bytes flow inside the encrypted stream.
- The server side gets an optional TLS listener (rustls + a self-signed certificate generated at
  startup by `rcgen`) behind `OPR_TLS=1`, `OPR_TLS_CERT`, `OPR_TLS_KEY`. Plain HTTP stays the
  default and byte-identical.
- Certificate verification is real: the client rejects an untrusted certificate unless an explicit
  trust anchor is provided, and a test proves rejection with a self-signed certificate.
- Honest scope: no client-certificate mTLS, no OCSP/CRL, no certificate revocation, no HSM, no
  cipher-suite tuning beyond the library defaults.

## 2. Live native window with on-screen verification (`opurom-platform`)

- The AppKit host opens a REAL window on the Aqua session, renders an OPUROM frame into it and
  captures the window's own pixels with `cacheDisplay(in:to:)`, producing a PNG that is compared
  against the software renderer's PPM for the same IR.
- The comparison is a real pixel check over the captured region, with a documented tolerance for
  the system window background and a clear PASS/FAIL report. A window that cannot be opened on a
  headless host reports SKIP, never a fake PASS.
- `open_window()` becomes a real, tested entry point instead of an untested stub. This is the
  first on-screen verification in the project.
- Honest scope: macOS only, one window at a time in R7, no multi-display, no HiDPI color
  management beyond the system default, no Windows/Linux/Harmony native windows.

## 3. Android native library (`opurom-mobile`)

- The same pure-std C ABI is built for `aarch64-linux-android` with the Android NDK clang
  toolchain, producing a real `.so` for arm64 Android, and for `x86_64-linux-android`.
- A minimal Android app module (Gradle project, `AndroidManifest.xml`, one `Activity` in Kotlin or
  Java) loads the library through the JNI layer and renders a frame into an `ImageView`.
- The build is verified by running the real NDK clang and producing a real ELF shared object;
  `javac` compiles the app sources; `aapt2`/`d8` are used when the SDK provides them, and any
  unavailable step reports a concrete SKIP with the exact missing tool.
- Honest scope: no emulator or device execution (no system image is installed), no AAB signing, no
  Play Store submission, no HarmonyOS.

## 4. Real PostgreSQL server conformance (`opurom-db`)

- A PostgreSQL-compatible server process is started locally (a bundled pure-Rust server speaking
  the v3 protocol) so the client can be tested against a real socket server that implements
  authentication, parameter status, queries, transactions (BEGIN/COMMIT/ROLLBACK) and error
  responses — not only against a mock byte sequence.
- The client MUST handle a real multi-statement transaction and a real error code (SQLSTATE) and
  map it to a typed database error.
- Honest scope: the bundled server implements the subset of PostgreSQL the framework needs, not
  the full PostgreSQL server; it is a conformance harness, not a PostgreSQL replacement.

## 5. WebSocket and connection management (`opurom-server`)

- RFC 6455 server-side WebSocket: handshake (Sec-WebSocket-Key/Accept), text and binary frames,
  ping/pong, close frames and fragmentation. A client-side connection helper covers the same
  subset.
- HTTP/1.1 keep-alive with correct `Content-Length` reuse, plus a documented idle timeout and
  maximum in-flight connections.
- Honest scope: no permessage-deflate, no client-side masking beyond the standard requirement,
  no HTTP/2 or HTTP/3, no load-balancer integration.

## 6. Honest performance measurement (`opurom-cli`)

- `profile --repeat N` reports measured statistics for repeated identical work (warmup excluded,
  explicitly reported) with median, p95 and a stated environment description (CPU model, OS
  version, whether the run was on an idle machine).
- `bench --compare` renders the SAME scene through the software renderer and the GPU backend and
  reports both measured times plus the byte-equality result, so a speed claim is always paired
  with a correctness result.
- Honest scope: no competitor binaries are executed and no competitor numbers are estimated; the
  report compares OPUROM backends against each other only.

## 7. Honest scope

R7 implements: TLS for the PostgreSQL client and the HTTP server, a real native window whose
captured pixels are verified against the software renderer, a real arm64/x86_64 Android shared
library with an Android app module, a bundled PostgreSQL-protocol server used for transactional
conformance, WebSocket plus HTTP keep-alive, and measured repeated-work profiling with a
GPU-versus-software comparison.

Still R8+: emulator/device execution, mTLS and certificate revocation, PostgreSQL/MySQL parity,
HTTP/2 and HTTP/3, Windows/Linux/Harmony native windows, a public package marketplace, an
IntelliJ runtime plugin, OS screen-reader integration, cross-browser matrices, and measured
competitive benchmarks against other frameworks. No invented numbers anywhere.
