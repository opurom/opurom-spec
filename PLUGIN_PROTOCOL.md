# OPUROM Plugin Protocol v1 (normative)

Plugins are **separate processes**, never linked into the kernel. A plugin crash, hang or protocol
violation is contained by the OS process boundary. This is the extension mechanism for native
capabilities (camera, notification, storage, ...), business components and future platforms.

## Transport

One JSON object per line on stdin (request), one JSON object per line on stdout (response).
No other output is allowed on stdout; logs go to stderr. UTF-8. The host writes a line and waits
for the matching response id with a 500 ms timeout (configurable, minimum 50 ms).

```json
{"id":0,"method":"hello","protocol":"1.0"}
{"id":0,"ok":true,"result":{"name":"camera","version":"0.1.0","capabilities":["camera.takePhoto"]}}
```

```json
{"id":1,"method":"invoke","capability":"camera.takePhoto","params":{"quality":"high"}}
{"id":1,"ok":true,"result":{"path":"/tmp/photo.png"}}
{"id":2,"method":"invoke","capability":"camera.nope","params":{}}
{"id":2,"ok":false,"error":"unknown capability: camera.nope"}
```

`shutdown` request is optional; the host may just terminate the process. Responses must echo
`id`. Malformed JSON, a wrong id, a missing `ok`, or a timeout is a protocol violation.

## Manifest

Each plugin ships `plugin.json`:

```json
{
  "name": "camera",
  "version": "0.1.0",
  "protocol": "1.0",
  "capabilities": ["camera.takePhoto"],
  "entry": "./bin/camera",
  "description": "Camera access"
}
```

Validation rules: name matches `[a-z][a-z0-9-]{1,31}`, `version` is semver-ish `x.y.z`,
`protocol == "1.0"`, capabilities are non-empty dotted names, `entry` resolves to an executable
file inside the plugin directory (no `..` traversal). Invalid manifests are rejected before spawn.

## Host contract

`PluginHost` in `opurom-core`:

1. `load(dir)` validates the manifest, spawns `entry`, performs `hello` handshake, and verifies the
   plugin's advertised capabilities are a subset of the manifest's declared capabilities.
2. `invoke(capability, params) -> Result<Value, PluginError>` checks an **allowlist** supplied by
   the app, serialises the request, reads one response, and validates the shape.
3. Fault policy: 3 consecutive timeouts/violations/crashes ⇒ plugin marked `Disabled` and its
   process killed; a later success resets the counter only for timeouts, never after a crash.
   Other plugins keep serving. All errors are values; no panic crosses the boundary.
4. `list()` reports name, version, capabilities, status (`Active|Disabled`) and invocation count.

## Local registry

`opurom-plugins/registry.json` is a local, offline index:

```json
{ "version": 1, "plugins": [ { "name": "camera", "version": "0.1.0", "path": "plugins/camera", "capabilities": ["camera.takePhoto"] } ] }
```

`opurom plugin verify` checks every entry's manifest, executable bit and handshake. No network
marketplace in the core protocol; the format is forward-compatible with one.

## Scope

The core protocol ships three reference plugins (`camera`, `notification`, `storage`) implemented
as small Rust binaries that speak this protocol with **simulated** hardware. They are real processes with real
handshakes, not mocks. Actual OS hardware bindings, signing, sandboxing (seatbelt/landlock) and a
remote marketplace are planned for later releases.
