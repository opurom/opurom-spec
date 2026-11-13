# OPUROM Component Library Hardening Addendum (normative)

The component library hardening closes the gaps that are still verifiable on this host: a component
library with 100+ DISTINCT drawn primitives, real GPU presentation into a live native window,
build-time tree shaking with source maps, a native-capability plugin ecosystem with a permission
sandbox, real certificate status checking, and MySQL caching_sha2_password authentication.

Everything is additive: all earlier IR versions stay valid, golden digests stay unchanged, and existing tests
stay green. New dependencies must be pinned and justified.

## 1. 100+ distinct primitives (`opurom-render` + `opurom-spec` + `opurom-lang`)

- The catalog currently has 116 named components mapped onto 32 distinct primitives. Extend it to
  at least 200 named components mapped onto at least 100 DISTINCT primitive kinds, each with a
  real deterministic drawing (not an alias or fallback), a documented prop schema, an a11y default
  role, and a test asserting its pixels differ from the fallback and from every other new kind.
- `opurom-lang/src/catalog.json` MUST remain byte-identical to `opurom-spec/components.json`;
  `opuromc components` must print the new count. All 9 emitters keep working.
- The three golden digests MUST NOT change: 320x240 `900abf4bd93d1e51`, 800x600
  `c8403ba57da5ee61`, 800x600 --state count=7 `48a56056bd32a07e`. They are pinned with the brand
  accent and edge-anti-aliased text as the current baselines.

## 2. GPU presentation into a live window (`opurom-gpu` + `opurom-platform`)

- Present a GPU-rasterized frame through a real `CAMetalLayer` drawable in the live AppKit window:
  blit the Metal compute output into the drawable texture, commit and present it, then capture the
  window's on-screen pixels and compare them against the software renderer's frame with the
  documented capture tolerance. This is the project's first real GPU presentation.
- If a drawable cannot be obtained (no Aqua session / no Metal device), report a concrete SKIP.
  Linux CI must still build (cfg-gated, no link-time framework dependency).

## 3. Tree shaking and source maps (`opurom-cli`)

- `build --tree-shake` removes generated JS functions/assets that the IR does not reference, with a
  real reachability analysis over the emitter's own output (not regex deletion). Report measured
  before/after bytes and reduction percentage from `statSync`.
- `build --sourcemap` emits a valid v3 source map for minified JS; verify it parses, has
  `version: 3`, `sources`, `mappings`, and that the minified JS still passes `node --check` and the
  e2e suite. `--minify`, `--optimize`, `--tree-shake` and `--sourcemap` compose.

## 4. Native capability plugins (`opurom-plugins` + `opurom-core`)

- A permission-sandboxed plugin API covering camera, geolocation, bluetooth, notifications,
  payment and share: each declares its capability, is granted explicitly, and a denied capability
  is rejected with a typed error. Deterministic device fixtures provide fixed replies.
- Plugin crash isolation: a plugin process that exits or sends malformed JSON must not crash the
  host; the circuit breaker from the plugin host trips after repeated failures. A real
  JSON-lines process test covers grant/deny/crash/recovery.

## 5. Certificate status (`opurom-server`)

- Real OCSP and CRL checking for client certificates in the mTLS path: parse a DER CRL and an
  OCSP response, reject a revoked serial, accept a good status, and fail closed when a required
  status source is unavailable. Generate the CRL/OCSP fixtures with `rcgen`/`x509-parser`.

## 6. MySQL caching_sha2_password (`opurom-db`)

- Implement `caching_sha2_password` full authentication with the REAL MySQL 8.0 fast-auth
  scramble `XOR(SHA256(p), SHA256(SHA256(SHA256(p)) || nonce))` and, for the full-auth path,
  RSA-OAEP (or a documented UNSUPPORTED error if pure-Rust OAEP is not feasible), against the
  existing mock server, plus `COM_STMT_PREPARE`/`COM_STMT_EXECUTE` framing with bounded parameter
  parsing.


