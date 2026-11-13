// Every check must reject its own corruption; passing elsewhere proves nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContracts } from '../scripts/validate-contracts.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CLI = fileURLToPath(new URL('../scripts/validate.mjs', import.meta.url));

// A full copy keeps every relative link and source file resolvable while one
// file is corrupted in isolation.
function copyRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'opurom-spec-contracts-'));
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    cpSync(join(ROOT, entry.name), join(dir, entry.name), { recursive: true });
  }
  return dir;
}

function runValidator(corrupt) {
  const dir = copyRepo();
  try {
    if (corrupt) corrupt(dir);
    return spawnSync(process.execPath, [CLI, dir], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function editJson(dir, file, mutate) {
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  mutate(data);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function editText(dir, file, from, to) {
  const path = join(dir, file);
  const text = readFileSync(path, 'utf8');
  assert.ok(text.includes(from), `${file} does not contain ${JSON.stringify(from)}`);
  writeFileSync(path, text.replace(from, to));
}

const CORRUPTIONS = [
  ['contract files readable', dir => rmSync(join(dir, 'README.md'))],
  ['contract files parse as JSON', dir => writeFileSync(join(dir, 'components.json'), '{"count":')],
  ['catalog count matches entries', dir => editJson(dir, 'components.json', data => { data.count += 1; })],
  ['catalog primitives match distinct kinds', dir => editJson(dir, 'components.json', data => { data.primitives = 99; })],
  ['catalog primitives match distinct kinds', dir => editJson(dir, 'components.json', data => { data.components[0][1] = 'AlienColumn'; })],
  ['catalog entries have the required shape', dir => editJson(dir, 'components.json', data => { data.components[3][3] = null; })],
  ['catalog component names are unique', dir => editJson(dir, 'components.json', data => { data.components[1][0] = data.components[0][0]; })],
  ['golden IR version matches IR_SCHEMA.md', dir => editJson(dir, 'counter.opuir.json', data => { data.ir = '0.2'; })],
  ['golden IR version matches IR_SCHEMA.md', dir => editText(dir, 'IR_SCHEMA.md', 'ir == "0.1"', 'ir == "0.2"')],
  ['golden IR node ids are unique and pre-ordered', dir => editJson(dir, 'counter.opuir.json', data => { data.tree.children[1].children[1].id = 3; })],
  ['golden IR node ids are unique and pre-ordered', dir => editJson(dir, 'counter.opuir.json', data => { data.tree = null; })],
  ['golden IR tree children resolve to declared nodes', dir => editJson(dir, 'counter.opuir.json', data => { data.tree.children[1] = 99; })],
  ['golden IR node kinds appear in LANG_SPEC.md', dir => editJson(dir, 'counter.opuir.json', data => { data.tree.kind = 'Alien'; })],
  ['golden IR event ops appear in IR_SCHEMA.md', dir => editJson(dir, 'counter.opuir.json', data => { data.tree.children[1].children[0].events.tap.op = 'mul'; })],
  ['golden IR event ops appear in IR_SCHEMA.md', dir => editText(dir, 'IR_SCHEMA.md', '"set" | "add" | "sub" | "toggle"', '"set" | "sub" | "toggle"')],
  ['LANG_SPEC.md node kinds appear in components.json', dir => editJson(dir, 'components.json', data => {
    for (const entry of data.components) if (entry[1] === 'Column') entry[1] = 'AlienColumn';
  })],
  ['IR_SCHEMA.md emitter table matches mini-program package section', dir =>
    editText(dir, 'IR_SCHEMA.md', 'For all six mini-program targets', 'For all seven mini-program targets')],
  ['IR_SCHEMA.md emitter table matches mini-program package section', dir => {
    const path = join(dir, 'IR_SCHEMA.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/^\| `kuaishou` \|.+\n/m, ''));
  }],
  ['README.md index links resolve', dir => editText(dir, 'README.md', '(ARCHITECTURE.md)', '(MISSING.md)')],
  ['fontScale contract is documented without changing golden IR', dir =>
    editText(dir, 'LANG_SPEC.md', 'A local prop always wins.', 'A theme value always wins.')],
  ['particle field bounds are documented consistently', dir =>
    editText(dir, 'IR_ADDITIONS.md', '`count` | 0..512 | required', '`count` | 0..513 | required')],
  ['particle field bounds are documented consistently', dir =>
    editText(dir, 'LANG_SPEC.md', 'an integer 0..512', 'an integer 0..513')],
  ['list indexing contract is documented consistently', dir =>
    editText(dir, 'LANGUAGE_ADDITIONS.md', 'A list element is read by position with `{items[i]}`',
      'A list element is read by position')],
  ['list indexing contract is documented consistently', dir =>
    editText(dir, 'GPU_WINDOW_TRANSPORT.md', '`{items[i]}`', '`{items}`')],
  ['responsive layout and project contract is documented', dir =>
    editText(dir, 'LANG_SPEC.md', '`< 600`', '`< 601`')],
  ['responsive layout and project contract is documented', dir =>
    editText(dir, 'LANG_SPEC.md', 'import "models/todo.opu"', 'import models/todo.opu')],
  ['icon name contract is documented and complete', dir =>
    editText(dir, 'LANG_SPEC.md', 'The set has 31 names', 'The set has 30 names')],
  ['icon name contract is documented and complete', dir =>
    editText(dir, 'LANG_SPEC.md', 'at compile time and rejects an unknown name',
      'at view time and rejects an unknown name')],
  ['icon name contract is documented and complete', dir =>
    editText(dir, 'LANG_SPEC.md', '`chat`', '`chaat`')],
];

test('published contracts pass the validator', () => {
  const result = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /^PASS: 17 contract checks passed$/m);
});

test('the validator module reports the same verdict', () => {
  const { ok, checks } = validateContracts(ROOT);
  assert.equal(ok, true, JSON.stringify(checks.filter(result => !result.ok)));
  assert.equal(checks.length, 17);
});

for (const [name, corrupt] of CORRUPTIONS) {
  test(`${name} catches its corruption`, () => {
    const result = runValidator(corrupt);
    const output = result.stdout + result.stderr;
    assert.equal(result.status, 1, `${name}: expected exit 1\n${output}`);
    assert.ok(result.stdout.includes(`FAIL ${name}:`), `${name}: no FAIL line\n${output}`);
    assert.match(output, /^FAIL: \d+ of \d+ contract checks failed$/m, `${name}: no FAIL summary`);
  });
}
