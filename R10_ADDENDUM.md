# OPUROM R10 Addendum (normative)

R10 targets gaps that are still verifiable on this host: a component library with 100+ DISTINCT
drawn primitives, real GPU presentation into a live native window, build-time tree shaking with
source maps, a native-capability plugin ecosystem with a permission sandbox, real certificate
status checking, and MySQL caching_sha2_password authentication.

Everything is additive: R1-R9 IR stays valid, golden digests stay unchanged, and existing tests
stay green. No invented numbers. New dependencies must be pinned and justified.

## 1. 100+ distinct primitives (`opurom-render` + `opurom-spec` + `opurom-lang`)

- The catalog currently has 116 named components mapped onto 32 distinct primitives. Extend it to
  at least 200 named components mapped onto at least 100 DISTINCT primitive kinds, each with a
  real deterministic drawing (not an alias or fallback), a documented prop schema, an a11y default
  role, and a test asserting its pixels differ from the fallback and from every other new kind.
- `opurom-lang/src/catalog.json` MUST remain byte-identical to `opurom-spec/components.json`;
  `opuromc components` must print the new count. All 9 emitters keep working.
- The three V0.1 golden digests MUST NOT change: 320x240 `c87bf023a6c01f9d`, 800x600
  `8cc3021fa80749b5`, 800x600 --state count=7 `e7aad51c98d9cf21`.
- Honest scope: one deterministic software drawing per kind; no real font shaping, no image
  decoding, no platform-native widgets, no 120fps claim.

## 2. GPU presentation into a live window (`opurom-gpu` + `opurom-platform`)

- Present a GPU-rasterized frame through a real `CAMetalLayer` drawable in the live AppKit window:
  blit the Metal compute output into the drawable texture, commit and present it, then capture the
  window's on-screen pixels and compare them against the software renderer's frame with the
  documented R7 tolerance. This is the project's first real GPU presentation.
- If a drawable cannot be obtained (no Aqua session / no Metal device), report a concrete SKIP,
  never a fake PASS. Linux CI must still build (cfg-gated, no link-time framework dependency).
- Honest scope: macOS/Metal only, one window, no Vulkan/ANGLE/D3D, no GPU text shaping, no
  measured fps claim.

## 3. Tree shaking and source maps (`opurom-cli`)

- `build --tree-shake` removes generated JS functions/assets that the IR does not reference, with a
  real reachability analysis over the emitter's own output (not regex deletion). Report measured
  before/after bytes and reduction percentage from `statSync`.
- `build --sourcemap` emits a valid v3 source map for minified JS; verify it parses, has
  `version: 3`, `sources`, `mappings`, and that the minified JS still passes `node --check` and the
  e2e suite. `--minify`, `--optimize`, `--tree-shake` and `--sourcemap` compose.
- Honest scope: no third-party dependency graph, no bundler, no Brotli/zstd, no scope-hoisting.

## 4. Native capability plugins (`opurom-plugins` + `opurom-core`)

- A permission-sandboxed plugin API covering camera, geolocation, bluetooth, notifications,
  payment and share: each declares its capability, is granted explicitly, and a denied capability
  is rejected with a typed error. Mock devices provide deterministic replies (no real hardware).
- Plugin crash isolation: a plugin process that exits or sends malformed JSON must not crash the
  host; the circuit breaker from R9 trips after repeated failures. A real JSON-lines process test
  covers grant/deny/crash/recovery.
- Honest scope: mock devices only, no real OS permission prompts, no real camera/BT hardware.

## 5. Certificate status (`opurom-server`)

- Real OCSP and CRL checking for client certificates in the mTLS path: parse a DER CRL and an
  OCSP response, reject a revoked serial, accept a good status, and fail closed when a required
  status source is unavailable. Generate the CRL/OCSP fixtures with `rcgen`/`x509-parser`.
- Honest scope: static local status sources, no live OCSP responder fetch, no certificate
  transparency, no distributed revocation.

## 6. MySQL caching_sha2_password (`opurom-db`)

- Implement `caching_sha2_password` full authentication (scramble with SHA-256, full-auth path
  with RSA public-key encryption of the password when requested) against the existing mock server,
  plus `COM_STMT_PREPARE`/`COM_STMT_EXECUTE` framing with bounded parameter parsing.
- Honest scope: no real MySQL server tested, no TLS-wrapped full-auth key exchange over a real
  socket, no binary protocol result decoding, no connection pooling.

## 7. Honest scope

R10 implements: 100+ distinct primitives with deterministic drawings, real Metal presentation into
a live window with on-screen pixel verification, measured tree shaking and valid v3 source maps, a
permission-sandboxed native-capability plugin ecosystem with crash isolation, real OCSP/CRL
certificate status checking, and MySQL caching_sha2_password authentication.

Still R11+: Vulkan/ANGLE/D3D, Wayland, HarmonyOS, running Windows/Linux windows, Android
device/emulator execution, HTTP/3/QUIC, a real MySQL server, real OS hardware permission prompts,
a public multi-org plugin marketplace, cloud deployment, real-device conformance and measured
competitive benchmarks. No invented numbers anywhere.
