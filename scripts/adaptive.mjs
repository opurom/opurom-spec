#!/usr/bin/env node
// Mechanically verifies the one-source promise: one .opu file compiles to one
// IR, that same IR renders at two viewport classes with different frame
// digests, and lowers to two emitters with every artifact present. Node
// built-ins only; every child process is bounded.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, accessSync, constants, readFileSync, rmSync, statSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const WORKSPACE = dirname(REPO_ROOT);

// A sibling workbench app may not be published yet, so the fallback is checked
// at runtime rather than pinned to a path that can be absent.
const CANDIDATES = [
  ['opurom-examples', 'workbench', 'main.opu'],
  ['opurom-examples', 'field-service.opu'],
];

const COMPACT = { width: 360, height: 740, tier: 'compact (<600)' };
const EXPANDED = { width: 1440, height: 900, tier: 'wide (1200..1600)' };
const EMITTERS = ['web', 'native'];
const TIMEOUT_MS = 120_000;
const RENDER_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 8 * 1024 * 1024;

export function selectSource(root = WORKSPACE) {
  for (const parts of CANDIDATES) {
    const path = join(root, ...parts);
    if (existsSync(path) && statSync(path).isFile()) {
      return { path, label: parts.join('/') };
    }
  }
  return null;
}

function nonEmptyFile(path) {
  try {
    return statSync(path).isFile() && statSync(path).size > 0;
  } catch {
    return false;
  }
}

function isExecutable(path) {
  if (!nonEmptyFile(path)) return false;
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function spawnBounded(command, args, timeout = TIMEOUT_MS) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: MAX_BUFFER,
    env: { ...process.env, PATH: `${process.env.HOME ?? ''}/.cargo/bin${delimiter}${process.env.PATH ?? ''}` },
  });
}

// Sibling cargo target directories first, then PATH, then one bounded build.
function tool(name, repo, root = WORKSPACE) {
  for (const profile of ['debug', 'release']) {
    const candidate = join(root, repo, 'target', profile, name);
    if (isExecutable(candidate)) return candidate;
  }
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, name);
    if (isExecutable(candidate)) return candidate;
  }
  const manifest = join(root, repo, 'Cargo.toml');
  if (!existsSync(manifest)) return null;
  const built = spawnBounded('cargo', ['build', '--manifest-path', manifest]);
  if (built.status !== 0) return null;
  for (const profile of ['debug', 'release']) {
    const candidate = join(root, repo, 'target', profile, name);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function digestOf(stdout) {
  return /digest=([0-9a-f]+)/i.exec(stdout ?? '')?.[1] ?? null;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function emitterTable(stdout) {
  return (stdout ?? '').trim().split('\n').filter(Boolean).map((line) => {
    const [name, files] = line.split('\t');
    return { name: name?.trim(), files: (files ?? '').split(', ').map((f) => f.trim()).filter(Boolean) };
  });
}

/**
 * Returns { ok, checks, source, digests, emitters }. One compile produces one
 * IR; the same file is passed to every render and every lowering, and its
 * digest is compared before and after to prove no feature-code change occurred.
 */
export function runAdaptive(options = {}) {
  const root = options.root ?? WORKSPACE;
  const checks = [];
  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    return ok;
  };
  const result = { ok: false, checks, source: null, digests: null, emitters: [] };
  const tmp = mkdtempSync(join(tmpdir(), 'opurom-adaptive-'));
  try {
    const chosen = options.source
      ? { path: isAbsolute(options.source) ? options.source : resolve(root, options.source), label: options.source }
      : selectSource(root);
    const found = !!chosen && existsSync(chosen.path);
    if (!record('one source selected', found,
      found ? `${chosen.label} (single .opu file)` : `missing: ${chosen?.label ?? 'no example source found'}`)) return result;

    result.source = chosen.label;
    const compiler = tool('opuromc', 'opurom-lang', root);
    const renderer = tool('opurom-render', 'opurom-render', root);
    if (!record('compiler and renderer available', !!compiler && !!renderer,
      compiler && renderer ? 'opuromc + opurom-render' : 'a sibling tool binary is missing')) return result;

    const ir = join(tmp, 'app.opuir.json');
    const compiled = spawnBounded(compiler, ['compile', chosen.path, '-o', ir]);
    let parsed = null;
    try { parsed = JSON.parse(readFileSync(ir, 'utf8')); } catch { /* reported below */ }
    if (!record('one source compiles to one IR', compiled.status === 0 && !!parsed?.tree,
      compiled.status === 0 ? `IR ${parsed?.app ?? ''} with ${Array.isArray(parsed?.models) ? parsed.models.length : 0} models` :
        (compiled.stderr || compiled.stdout || '').trim().slice(0, 200))) return result;
    const irBefore = sha256(ir);

    const digests = {};
    for (const [label, viewport] of [['compact', COMPACT], ['expanded', EXPANDED]]) {
      const out = join(tmp, `${label}.ppm`);
      const rendered = spawnBounded(renderer,
        [ir, String(viewport.width), String(viewport.height), out], RENDER_TIMEOUT_MS);
      const digest = digestOf(rendered.stdout);
      const frameOk = rendered.status === 0 && !!digest && nonEmptyFile(out);
      record(`${label} viewport renders`, frameOk,
        frameOk ? `${viewport.width}x${viewport.height} ${viewport.tier} digest=${digest}` :
          (rendered.stderr || rendered.stdout || 'render failed').trim().slice(0, 200));
      digests[label] = { ...viewport, digest };
    }
    record('viewport digests differ (reflow, not scaling)',
      !!digests.compact?.digest && !!digests.expanded?.digest &&
      digests.compact.digest !== digests.expanded.digest,
      `compact=${digests.compact?.digest ?? 'none'} expanded=${digests.expanded?.digest ?? 'none'}`);
    result.digests = digests;

    const table = spawnBounded(compiler, ['targets']);
    const emitters = emitterTable(table.stdout);
    result.emitters = emitters.map((entry) => entry.name);
    const missing = EMITTERS.filter((name) => !emitters.some((entry) => entry.name === name && entry.files.length));
    if (!record('emitter table lists web and native', table.status === 0 && missing.length === 0,
      `emitters: ${result.emitters.join(', ')}`)) return result;

    for (const name of EMITTERS) {
      const entry = emitters.find((item) => item.name === name);
      const dir = join(tmp, `target-${name}`);
      const lowered = spawnBounded(compiler, ['target', ir, '--target', name, '-o', dir]);
      const absent = entry.files.filter((file) => !existsSync(join(dir, file)) || statSync(join(dir, file)).size === 0);
      record(`${name} artifacts present and non-empty`, lowered.status === 0 && absent.length === 0,
        lowered.status !== 0 ? (lowered.stderr || lowered.stdout || 'lowering failed').trim().slice(0, 200) :
          `${entry.files.length} files: ${entry.files.join(', ')}${absent.length ? `; missing/empty: ${absent.join(', ')}` : ''}`);
    }

    record('one IR unchanged across all steps', sha256(ir) === irBefore,
      `sha256=${irBefore.slice(0, 16)} before and after`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  result.ok = checks.every((check) => check.ok) && checks.length === 10;
  return result;
}

// Prints one line per check plus a summary; the verdict is the exit code.
export function runAdaptiveCli(argv = process.argv) {
  const sourceArg = argv[2];
  const chosen = sourceArg
    ? { path: isAbsolute(sourceArg) ? sourceArg : resolve(WORKSPACE, sourceArg), label: sourceArg }
    : selectSource(WORKSPACE);
  // Without a named source this is a workspace-integration probe: when the
  // example project is not present (a single-repo CI checkout), report a
  // concrete SKIP rather than a failure, so the suite stays honest.
  if (!sourceArg && !(chosen && existsSync(chosen.path))) {
    console.log('SKIP: no example source in the workspace (opurom-examples is not checked out here); ' +
      'pass a source path to run the one-source proof');
    return 0;
  }
  const { ok, checks, source, digests, emitters } = runAdaptive({ source: sourceArg });
  console.log(`one source: ${source ?? 'none'}`);
  console.log(`emitters: ${emitters.join(', ')}`);
  console.log(`digests: compact=${digests?.compact?.digest ?? 'none'} expanded=${digests?.expanded?.digest ?? 'none'}`);
  for (const { name, ok: passed, detail } of checks) {
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }
  const failed = checks.filter((check) => !check.ok).length;
  if (!ok) {
    console.error(`FAIL: ${failed} adaptive check(s) failed`);
    return 1;
  }
  console.log(`PASS: ${checks.length} adaptive checks passed`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runAdaptiveCli();
}
