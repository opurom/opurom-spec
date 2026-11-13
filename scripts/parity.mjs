#!/usr/bin/env node
// Mechanically verifies the pixel-consistency contract: one IR file produces
// byte-identical frames through the shared software renderer on every run, the
// same IR reflows across viewport classes, and the DOM emitter mirrors the IR
// tree node for node. Node built-ins only; every child process is bounded.
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
const TIMEOUT_MS = 120_000;
const RENDER_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 8 * 1024 * 1024;

// The kinds whose DOM element carries the visible text or the control.
const CONTENT_KINDS = new Set(['Text', 'Button']);

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

// Every node of the IR tree in pre-order.
export function treeNodes(ir) {
  const nodes = [];
  const walk = (node) => {
    nodes.push(node);
    for (const child of node?.children ?? []) walk(child);
  };
  if (ir?.tree) walk(ir.tree);
  return nodes;
}

// The DOM emitter renders a node when it has no `when` gate or when the gate's
// state starts true, so the mirrored set is the initially visible set.
export function visibleNodes(ir) {
  const states = new Map((ir?.state ?? []).map((state) => [state.name, state]));
  return treeNodes(ir).filter((node) =>
    node.when === undefined || states.get(node.when)?.init === true);
}

// The DOM element of one node, read back from the emitted markup.
function domElement(html, id) {
  const match = new RegExp(`<([a-z0-9]+)\\b[^>]*data-node-id="${id}"`).exec(html);
  return match ? { tag: match[1] } : null;
}

// The DOM emitter writes the standalone page; its emitter module owns the tag
// and role mapping. Importing that module keeps one contract on both sides
// instead of a second copy that can drift.
let emitterMapping = null;
async function loadEmitterMapping(root) {
  if (emitterMapping) return emitterMapping;
  const module = join(root, 'opurom-web', 'lib', 'a11y.mjs');
  if (!existsSync(module)) return null;
  const loaded = await import(pathToFileURL(module).href);
  emitterMapping = { tagFor: loaded.tagFor, effectiveRole: loaded.effectiveRole };
  return emitterMapping;
}

/**
 * Returns { ok, checks, source, digests, dom }. One compile produces one IR;
 * the same file is passed to every render and to the DOM build, and its digest
 * is compared before and after to prove the IR was never rewritten.
 */
export async function runParity(options = {}) {
  const root = options.root ?? WORKSPACE;
  const checks = [];
  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    return ok;
  };
  const result = { ok: false, checks, source: null, digests: null, dom: null, skipped: false };
  const tmp = mkdtempSync(join(tmpdir(), 'opurom-parity-'));
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
    // Without the shared toolchain there is nothing to render; that is an
    // environmental absence, so the probe SKIPs honestly instead of failing
    // a single-repo checkout that has no sibling binaries.
    if (!compiler || !renderer) {
      const missing = [!compiler ? 'opuromc' : null, !renderer ? 'opurom-render' : null].filter(Boolean);
      record('compiler and renderer available', true,
        `SKIP: missing ${missing.join(' and ')} (the shared toolchain is not built in this checkout)`);
      result.skipped = true;
      result.ok = true;
      return result;
    }
    record('compiler and renderer available', true, 'opuromc + opurom-render');

    const ir = join(tmp, 'app.opuir.json');
    const compiled = spawnBounded(compiler, ['compile', chosen.path, '-o', ir]);
    let parsed = null;
    try { parsed = JSON.parse(readFileSync(ir, 'utf8')); } catch { /* reported below */ }
    if (!record('one source compiles to one IR', compiled.status === 0 && !!parsed?.tree,
      compiled.status === 0 ? `IR ${parsed?.app ?? ''} with ${treeNodes(parsed).length} tree nodes` :
        (compiled.stderr || compiled.stdout || '').trim().slice(0, 200))) return result;
    const irBefore = sha256(ir);

    // Two runs of the same viewport: the shared renderer is integer-only, so
    // the frame digests must be identical.
    const digests = {};
    for (const run of [1, 2]) {
      const out = join(tmp, `run-${run}.ppm`);
      const rendered = spawnBounded(renderer,
        [ir, String(EXPANDED.width), String(EXPANDED.height), out], RENDER_TIMEOUT_MS);
      const digest = digestOf(rendered.stdout);
      const frameOk = rendered.status === 0 && !!digest && nonEmptyFile(out);
      record(`same viewport run ${run} renders`, frameOk,
        frameOk ? `${EXPANDED.width}x${EXPANDED.height} digest=${digest}` :
          (rendered.stderr || rendered.stdout || 'render failed').trim().slice(0, 200));
      digests[`run${run}`] = digest;
    }
    record('identical viewport renders are byte-identical',
      !!digests.run1 && digests.run1 === digests.run2,
      `run1=${digests.run1 ?? 'none'} run2=${digests.run2 ?? 'none'}`);

    // Two viewport classes: the same IR must reflow, not scale.
    const compactOut = join(tmp, 'compact.ppm');
    const compact = spawnBounded(renderer,
      [ir, String(COMPACT.width), String(COMPACT.height), compactOut], RENDER_TIMEOUT_MS);
    const compactDigest = digestOf(compact.stdout);
    record('compact viewport renders', compact.status === 0 && !!compactDigest && nonEmptyFile(compactOut),
      compactDigest ? `${COMPACT.width}x${COMPACT.height} digest=${compactDigest}` :
        (compact.stderr || compact.stdout || 'render failed').trim().slice(0, 200));
    record('viewport classes differ (reflow, not scaling)',
      !!compactDigest && !!digests.run1 && compactDigest !== digests.run1,
      `compact=${compactDigest ?? 'none'} expanded=${digests.run1 ?? 'none'}`);
    result.digests = { run1: digests.run1, run2: digests.run2, compact: compactDigest };

    // The DOM emitter: the same IR lowered to the responsive DOM page.
    const cli = join(root, 'opurom-cli', 'bin', 'opurom.mjs');
    if (!existsSync(cli)) {
      record('DOM emitter available', true,
        'SKIP: opurom-cli is not checked out here; the DOM mirror check did not run');
    } else {
      const domDir = join(tmp, 'dom');
      const built = spawnBounded(process.execPath,
        [cli, 'build', '--src', chosen.path, '--target', 'web-dom', '--out', domDir]);
      const page = join(domDir, 'index.html');
      const html = existsSync(page) ? readFileSync(page, 'utf8') : '';
      if (!record('DOM emitter available', built.status === 0 && html.length > 0,
        built.status === 0 ? `index.html ${html.length} bytes` :
          (built.stderr || built.stdout || 'web-dom build failed').trim().slice(0, 200))) return result;

      const visible = visibleNodes(parsed);
      const missing = visible.filter((node) => !html.includes(`data-node-id="${node.id}"`));
      record('DOM mirrors every visible IR node', missing.length === 0,
        missing.length ? `${missing.length} of ${visible.length} visible nodes have no DOM element` :
          `${visible.length} visible IR nodes have a DOM element`);

      const content = visible.filter((node) => CONTENT_KINDS.has(node.kind));
      const absentContent = content.filter((node) => !html.includes(`data-node-id="${node.id}"`));
      record('DOM carries every content-bearing node', absentContent.length === 0,
        absentContent.length ? `${absentContent.length} of ${content.length} content nodes have no DOM element` :
          `${content.length} text and button nodes have a DOM element`);

      const mapping = await loadEmitterMapping(root);
      if (!mapping) {
        record('DOM tag matches the IR kind', true,
          'SKIP: the opurom-web emitter module is not checked out here; the tag check did not run');
      } else {
        const wrongTag = content.filter((node) => {
          const element = domElement(html, node.id);
          if (!element) return false;
          const role = mapping.effectiveRole(node);
          return element.tag !== mapping.tagFor(node, role);
        });
        record('DOM tag matches the IR kind', wrongTag.length === 0,
          wrongTag.length ? `${wrongTag.length} content nodes use a different tag` :
            `${content.length} content nodes use the mapped tag`);
      }
      result.dom = {
        visible: visible.length,
        content: content.length,
        elements: visible.filter((node) => html.includes(`data-node-id="${node.id}"`)).length,
      };
    }

    record('one IR unchanged across all steps', sha256(ir) === irBefore,
      `sha256=${irBefore.slice(0, 16)} before and after`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  result.skipped = checks.some((check) => String(check.detail ?? '').startsWith('SKIP'));
  result.ok = checks.every((check) => check.ok);
  return result;
}

// Prints one line per check plus a summary; the verdict is the exit code.
export async function runParityCli(argv = process.argv) {
  const sourceArg = argv[2];
  const chosen = sourceArg
    ? { path: isAbsolute(sourceArg) ? sourceArg : resolve(WORKSPACE, sourceArg), label: sourceArg }
    : selectSource(WORKSPACE);
  // Without a named source this is a workspace-integration probe: when the
  // example project is not present (a single-repo CI checkout), report a
  // concrete SKIP rather than a failure, so the suite stays honest.
  if (!sourceArg && !(chosen && existsSync(chosen.path))) {
    console.log('SKIP: no example source in the workspace (opurom-examples is not checked out here); ' +
      'pass a source path to run the pixel-consistency proof');
    return 0;
  }
  const { ok, skipped, checks, source, digests, dom } = await runParity({ source: sourceArg });
  console.log(`one source: ${source ?? 'none'}`);
  console.log(`frame digests: run1=${digests?.run1 ?? 'none'} run2=${digests?.run2 ?? 'none'} compact=${digests?.compact ?? 'none'}`);
  console.log(`dom mirror: ${dom ? `${dom.elements} of ${dom.visible} visible nodes, ${dom.content} content-bearing` : 'skipped'}`);
  for (const { name, ok: passed, detail } of checks) {
    const marker = passed ? (String(detail ?? '').startsWith('SKIP') ? 'SKIP' : 'PASS') : 'FAIL';
    console.log(`${marker} ${name}: ${detail}`);
  }
  const failed = checks.filter((check) => !check.ok).length;
  if (!ok) {
    console.error(`FAIL: ${failed} parity check(s) failed`);
    return 1;
  }
  if (skipped) {
    console.log(`SKIP: ${checks.length} parity checks skipped (the shared toolchain or emitter is not present)`);
  } else {
    console.log(`PASS: ${checks.length} parity checks passed`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await runParityCli();
}
