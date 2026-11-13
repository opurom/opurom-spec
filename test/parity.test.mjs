// The pixel-consistency proof must run green, must SKIP honestly when the
// shared toolchain is absent, and must fail on a missing source, so a script
// that always prints PASS cannot satisfy this suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runParity, selectSource, WORKSPACE } from '../scripts/parity.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts', 'parity.mjs');

function run(args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

test('the same IR renders byte-identical frames and the DOM mirrors the tree', () => {
  const chosen = selectSource(WORKSPACE);
  if (!chosen || !existsSync(chosen.path)) {
    // Single-repo CI checkouts do not include the example project.
    console.log(`# skip: ${chosen?.label ?? 'no example source'} is not present in this checkout`);
    return;
  }
  const result = run([chosen.label]);
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 0, output);
  assert.match(result.stdout, /^one source: /m);
  assert.match(result.stdout, /^PASS one source compiles to one IR/m);
  assert.match(result.stdout, /^PASS identical viewport renders are byte-identical/m);
  assert.match(result.stdout, /^PASS viewport classes differ \(reflow, not scaling\)/m);
  assert.match(result.stdout, /^PASS DOM mirrors every visible IR node/m);
  assert.match(result.stdout, /^PASS DOM carries every content-bearing node/m);
  assert.match(result.stdout, /^PASS DOM tag matches the IR kind/m);
  assert.match(result.stdout, /^PASS one IR unchanged across all steps/m);
  assert.match(result.stdout, /^PASS: \d+ parity checks passed$/m);

  // Two runs of the same viewport carry the same digest; the two viewport
  // classes carry different digests.
  const digests = [...result.stdout.matchAll(/digest=([0-9a-f]+)/g)].map((m) => m[1]);
  assert.ok(digests.length >= 3, `expected both same-viewport runs plus a compact render:\n${output}`);
  assert.equal(digests[0], digests[1], 'the two same-viewport frames must be byte-identical');
  assert.notEqual(digests[2], digests[0], 'the two viewport classes must reflow');
});

test('a missing toolchain SKIPs with exit 0 instead of a fake pass', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'opurom-parity-skip-'));
  const chosen = selectSource(WORKSPACE);
  try {
    assert.ok(chosen && existsSync(chosen.path), 'a real source is required for this case');
    const result = await runParity({ root: empty, source: chosen.path });
    assert.equal(result.ok, true, JSON.stringify(result.checks));
    assert.equal(result.skipped, true, 'the probe must report the skip');
    const skip = result.checks.find((check) => String(check.detail).startsWith('SKIP'));
    assert.ok(skip, 'a check must name the missing piece');
    assert.match(skip.detail, /opuromc|opurom-render/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test('a missing source fails instead of printing a pass', () => {
  const result = run(['opurom-examples/no-such-source.opu']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /^FAIL one source selected:/m);
  assert.match(result.stderr, /^FAIL: \d+ parity check\(s\) failed$/m);
});
