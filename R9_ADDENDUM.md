# OPUROM R9 Addendum (normative)

R9 targets the remaining production-breadth gaps: GPU effect kernels, real HTTP/2, a compiled
JetBrains plugin, a public package marketplace, a real multi-threaded kernel scheduler with fault
isolation, and a full DAP debugger.

Everything is additive: R1-R8 IR stays valid, golden digests stay unchanged, and existing tests
stay green. New dependencies are allowed (the crate registry is reachable); pin every new one.
No invented numbers.

## 1. GPU visual-effect kernels (`opurom-render` + `opurom-gpu`)

- `opurom-render --commands <out.json>` GAINS optional effect commands for IR carrying R8 visual
  effects (`blur`, `shadow`, `glow`, `glass`, `liquid`) with their integer parameters. Effect-free
  IR MUST still produce the byte-identical R6 command stream.
- `opurom-gpu raster` executes those commands in Metal compute kernels and the resulting PPM MUST
  be byte-identical to the software renderer's PPM for the same IR/viewport/state/theme/effects.
  This is a real GPU/CPU visual-equality proof, not a self-comparison.
- Honest scope: compute kernels only, no GPU presentation to a window, no GPU text, no
  Vulkan/ANGLE/D3D, no fps claims.

## 2. Real HTTP/2 (`opurom-server`)

- Using the pinned `h2` crate, serve real HTTP/2 over the existing TLS listener when ALPN selects
  `h2`: HEADERS/DATA frames, HPACK, stream multiplexing, flow control and graceful GOAWAY.
- A real h2 client test opens multiple concurrent streams over one connection and verifies each
  response body/status. HTTP/1.1 keep-alive and plain HTTP stay unchanged.
- Honest scope: no HTTP/3/QUIC, no server push, no priority tree, no connection coalescing.

## 3. Compiled JetBrains plugin (`opurom-ide-plugins`)

- A real IntelliJ Platform plugin build: Gradle project using the IntelliJ SDK (JDK 21),
  `plugin.xml` declaring the OPUROM language, file type, grammar and an LSP client, plus Java
  sources compiled by `javac`/Gradle and packaged into a distributable plugin archive.
- Verify the built artifact is a real ZIP with the required `lib/`, `plugin.xml` and classes.
  If the SDK download is unavailable, fall back to a `javac`-compiled LSP client plus a real
  plugin ZIP and state clearly that it was NOT loaded inside a running IntelliJ IDE.
- Honest scope: no marketplace publication, no runtime IDE verification, no debugger UI.

## 4. Public package marketplace (`opurom-pkg`)

- A GitHub-backed registry: `publish` uploads a signed package to a real GitHub Release asset
  (using `OPR_GITHUB_TOKEN` from the environment only, never from a tracked file), `search` and
  `install` read it back over HTTPS, verify the Ed25519 signature and SHA-256 integrity, and
  reject tampering/wrong key/missing signature.
- A local HTTP mock covers the same flows for offline CI; the real-API path is exercised once
  against the `opurom` org and documented. Graceful SKIP when no token/network is available.
- Honest scope: one GitHub org as a registry, no key distribution/rotation service, no
  revocation, no ratings, no mirror network.

## 5. Parallel kernel scheduler (`opurom-core`)

- A real multi-threaded work-stealing scheduler (`std::thread`, no external crate): N worker
  threads, a bounded task queue, `spawn`/`join`, and MEASURED parallel speedup on a CPU-bound
  workload (report the measured numbers, never an estimate).
- Panic isolation: a panicking task must not kill the scheduler; `catch_unwind` maps it to a
  typed error. A circuit breaker trips after a configurable number of consecutive failures and
  recovers after a cooldown. Deterministic round-robin fallback for single-worker mode.
- Honest scope: no GPU scheduling, no OS async IO, no priority preemption, no cross-process
  scheduling.

## 6. Full DAP debugger (`opurom-debug`)

- Extend the DAP subset with `setExceptionBreakpoints` awareness, `evaluate` expressions over
  live state, `setVariable`, `stepIn`/`stepOut`, `source` breakpoints with verified hits,
  `variables` paging, and a `disconnect` that cleans up all sessions. Real Content-Length
  framed tests over stdio.
- Honest scope: no GUI debug client, no network capture UI, no multi-process debugging.

## 7. Honest scope

R9 implements: GPU effect kernels with byte-identical PPM output, real HTTP/2 frames with stream
multiplexing, a compiled JetBrains plugin archive, a GitHub-backed signed package marketplace, a
measured parallel kernel scheduler with panic isolation and a circuit breaker, and a full DAP
debugger.

Still R10+: GPU presentation/text, Vulkan/ANGLE/D3D, running Windows/Linux windows and Wayland,
HarmonyOS, Android device/emulator execution, HTTP/3, OCSP/CRL, a real MySQL server,
caching_sha2_password, real-device conformance and measured competitive benchmarks. No invented
numbers anywhere.
