# OPUROM Production Breadth Addendum (normative)

The production layer targets the remaining production-breadth gaps: GPU effect kernels, real
HTTP/2, a compiled JetBrains plugin, a public package marketplace, a real multi-threaded kernel
scheduler with fault isolation, and a full DAP debugger.

Everything is additive: all earlier IR versions stay valid, golden digests stay unchanged, and existing tests
stay green. New dependencies are allowed (the crate registry is reachable); pin every new one.

## 1. GPU visual-effect kernels (`opurom-render` + `opurom-gpu`)

- `opurom-render --commands <out.json>` GAINS optional effect commands for IR carrying visual
  effects (`blur`, `shadow`, `glow`, `glass`, `liquid`) with their integer parameters. Effect-free
  IR MUST still produce the byte-identical command stream.
- `opurom-gpu raster` executes those commands in Metal compute kernels and the resulting PPM MUST
  be byte-identical to the software renderer's PPM for the same IR/viewport/state/theme/effects.
  This is a real GPU/CPU visual-equality proof, not a self-comparison.
  Vulkan/ANGLE/D3D, no fps claims.

## 2. Real HTTP/2 (`opurom-server`)

- Using the pinned `h2` crate, serve real HTTP/2 over the existing TLS listener when ALPN selects
  `h2`: HEADERS/DATA frames, HPACK, stream multiplexing, flow control and graceful GOAWAY.
- A real h2 client test opens multiple concurrent streams over one connection and verifies each
  response body/status. HTTP/1.1 keep-alive and plain HTTP stay unchanged.

## 3. Compiled JetBrains plugin (`opurom-ide-plugins`)

- A real IntelliJ Platform plugin build: Gradle project using the IntelliJ SDK (JDK 21),
  `plugin.xml` declaring the OPUROM language, file type, grammar and an LSP client, plus Java
  sources compiled by `javac`/Gradle and packaged into a distributable plugin archive.
- Verify the built artifact is a real ZIP with the required `lib/`, `plugin.xml` and classes.
  If the SDK download is unavailable, fall back to a `javac`-compiled LSP client plus a real
  plugin ZIP and state clearly that it was NOT loaded inside a running IntelliJ IDE.

## 4. Public package marketplace (`opurom-pkg`)

- A GitHub-backed registry: `publish` uploads a signed package to a real GitHub Release asset, `search` and
  `install` read it back over HTTPS, verify the Ed25519 signature and SHA-256 integrity, and
  reject tampering/wrong key/missing signature.
- A local HTTP mock covers the same flows for offline CI; the real-API path is exercised once
  against the `opurom` org and documented. Graceful SKIP when no token/network is available.

## 5. Parallel kernel scheduler (`opurom-core`)

- A real multi-threaded work-stealing scheduler (`std::thread`, no external crate): N worker
  threads, a bounded task queue, `spawn`/`join`, and MEASURED parallel speedup on a CPU-bound
  workload (report the measured numbers, never an estimate).
- Panic isolation: a panicking task must not kill the scheduler; `catch_unwind` maps it to a
  typed error. A circuit breaker trips after a configurable number of consecutive failures and
  recovers after a cooldown. Deterministic round-robin fallback for single-worker mode.

## 6. Full DAP debugger (`opurom-debug`)

- Extend the DAP subset with `setExceptionBreakpoints` awareness, `evaluate` expressions over
  live state, `setVariable`, `stepIn`/`stepOut`, `source` breakpoints with verified hits,
  `variables` paging, and a `disconnect` that cleans up all sessions. Real Content-Length
  framed tests over stdio.


