// The one-source proof must run green and must fail on a missing source, so a
// script that always prints PASS cannot satisfy this suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectSource, WORKSPACE } from '../scripts/adaptive.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts', 'adaptive.mjs');

function run(args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

test('one source renders differently at two viewports and lowers to web and native', () => {
  // The example project may not be checked out (a single-repo CI clone), in
  // which case this workspace-integration proof is skipped, not failed.
  const example = join(WORKSPACE, 'opurom-examples', 'field-service.opu');
  if (!existsSync(example)) {
    console.log(`# skip: ${example} is not present in this checkout`);
    return;
  }
  const result = run(['opurom-examples/field-service.opu']);
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 0, output);
  assert.match(result.stdout, /^one source: opurom-examples\/field-service\.opu$/m);
  assert.match(result.stdout, /^emitters: .*\bweb\b.*$/m);
  assert.match(result.stdout, /\bnative\b, \bweb\b/);
  const digests = [...result.stdout.matchAll(/digest=([0-9a-f]+)/g)].map((m) => m[1]);
  assert.ok(digests.length >= 2, `expected both frame digests:\n${output}`);
  assert.notEqual(digests[0], digests[1], 'compact and expanded frames must reflow');
  assert.match(result.stdout, /PASS one source compiles to one IR/);
  assert.match(result.stdout, /PASS viewport digests differ \(reflow, not scaling\)/);
  assert.match(result.stdout, /PASS web artifacts present and non-empty/);
  assert.match(result.stdout, /PASS native artifacts present and non-empty/);
  assert.match(result.stdout, /PASS one IR unchanged across all steps/);
  assert.match(result.stdout, /^PASS: .* adaptive checks passed$/m);
});

test('the source picker falls back when a workbench app is absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'opurom-adaptive-pick-'));
  try {
    const examples = join(dir, 'opurom-examples');
    mkdirSync(examples, { recursive: true });
    assert.equal(selectSource(dir), null, 'no source is available in an empty workspace');
    writeFileSync(join(examples, 'field-service.opu'), 'app FieldService {\n}\n');
    const fallback = selectSource(dir);
    assert.equal(fallback.label, 'opurom-examples/field-service.opu');
    assert.ok(existsSync(fallback.path));
    mkdirSync(join(examples, 'workbench'), { recursive: true });
    writeFileSync(join(examples, 'workbench', 'main.opu'), 'app Workbench {\n}\n');
    assert.equal(selectSource(dir).label, 'opurom-examples/workbench/main.opu',
      'a published workbench app takes precedence');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the published workspace resolves a real source at runtime', () => {
  const chosen = selectSource(WORKSPACE);
  if (!chosen) {
    // Single-repo CI checkouts do not include the example project.
    console.log('# skip: no example source in this checkout');
    return;
  }
  assert.ok(existsSync(chosen.path), `${chosen.label} does not exist`);
});

test('a missing source fails instead of printing a pass', () => {
  const result = run(['opurom-examples/no-such-source.opu']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /^FAIL one source selected:/m);
  assert.match(result.stderr, /^FAIL: \d+ adaptive check\(s\) failed$/m);
});
