# OPUROM Transport and Language Additions (normative)

This document adds four capabilities that close named gaps in the framework. Everything is
additive: existing IR stays valid, the three golden digests stay unchanged, and all existing
tests stay green. No invented numbers.

## 1. HTTP/3 over QUIC (`opurom-server`)

The backend runtime already serves HTTP/1.1 and HTTP/2 over TLS. It gains HTTP/3 over QUIC on a
separate UDP listener:

- QUIC transport with TLS 1.3, ALPN `h3`, and a real `h3` request/response exchange.
- One shared router and one shared handler fault-isolation path across HTTP/1.1, HTTP/2 and
  HTTP/3, so the same route returns the same JSON body on all three protocols.
- An `Alt-Svc` header on the HTTPS responses advertising the HTTP/3 endpoint.
- Real integration tests: start a QUIC endpoint on an ephemeral UDP port, issue real h3 GET and
  POST requests, assert the status, headers and body, and prove crash isolation still holds.
- Measured handshake and request timings reported from the test; no throughput claims.

## 2. Static typing with full inference (`opurom-lang`)

The language contract requires static strong types with automatic inference and compile-time
checking. The compiler gains one shared type checker over the whole program:

- Infer every `state` declaration from its initializer: integer, boolean, string.
- Infer local values inside expressions, computed blocks, list items and interpolations.
- Check action assignments, `valueFrom`, comparison operands, arithmetic operands and
  `if`/`when`/`unless` conditions against declared or inferred types.
- Infer component parameter types from the first call site when the declaration omits the
  annotation, and reject conflicting call sites.
- Friendly diagnostics that name the expected type, the found type and the source position,
  with a suggestion when the fix is unambiguous.
- Plain golden programs must lower to byte-identical IR. Typed and untyped source both compile.
- Negative tests for every error class, plus positive tests proving inference across nested
  expressions and components.

## 3. Five-tier adaptive layout and fluid grid (`opurom-render`)

The layout engine currently has three width breakpoints. It gains five tiers plus a fluid grid:

| Tier | Width (logical px) |
| --- | --- |
| Compact | < 600 |
| Medium | < 900 |
| Expanded | < 1200 |
| Wide | < 1600 |
| Ultra | >= 1600 |

- Existing behaviour at 320x240 and 800x600 is preserved byte-for-byte; the three golden
  digests `c87bf023a6c01f9d`, `8cc3021fa80749b5` and `e7aad51c98d9cf21` MUST NOT change.
- A fluid grid computes column count, gutter and margin from container width rather than fixed
  constants; the computation is integer-only and deterministic.
- Multi-window and split-screen: a resize from one tier to another recomputes layout, and the
  dirty-rect diff reports only the regions that actually changed.
- Tests for each tier boundary, grid arithmetic, resize diffing and golden invariance.

## 4. Wayland wire-protocol adapter (`opurom-platform`)

Following the X11 adapter pattern, the platform layer gains a Wayland client adapter:

- Runtime `dlopen`/`dlsym` of `libwayland-client.so.0` with no link-time Wayland dependency, so
  the crate still builds on hosts without Wayland development libraries.
- Pure-Rust, host-independent wire encoding for the setup handshake, object IDs, opcode and
  message size, and the shared-memory buffer contract. These unit tests MUST run on every host.
- A concrete SKIP (never a fake PASS) when no `WAYLAND_DISPLAY` is present, and a documented
  `Planned` status in the host registry until a live compositor is available.
- Linux cross-target build verification.

## Publication rules

Every tracked file stays English-only. No internal round codenames, no local absolute paths, no
self-defect sections, and every linked document must exist in the same repository. Git tags and
Release titles follow SemVer 2.0 with prerelease stages; no leading zeros.
