#!/usr/bin/env node
// Checks the published contract files against each other with Node built-ins
// only, so every repository can run the same validator without installing
// dependencies.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = ['components.json', 'counter.opuir.json', 'IR_SCHEMA.md', 'LANG_SPEC.md', 'README.md'];

// The mini-program package section states its target count in words, so the
// check maps the word instead of pinning a numeral.
const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

// First markdown table under a heading, or null when either is absent.
function table(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === heading);
  if (start === -1) return null;
  for (let i = start + 1; i + 1 < lines.length; i++) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '')
      .split('|').map(cell => cell.trim());
    const rows = [];
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(cells(lines[j]));
    return { header: cells(lines[i]), rows };
  }
  return null;
}

const backticked = cell => /^`([^`]+)`$/.exec(cell ?? '')?.[1];

export function validateContracts(root = REPO_ROOT) {
  const files = {};
  for (const name of SOURCES) {
    try {
      files[name] = readFileSync(join(root, name), 'utf8');
    } catch (err) {
      return {
        ok: false,
        checks: [{ name: 'contract files readable', ok: false, detail: `${name}: ${err.message}` }],
      };
    }
  }
  let catalog;
  let golden;
  try {
    catalog = JSON.parse(files['components.json']);
    golden = JSON.parse(files['counter.opuir.json']);
  } catch (err) {
    return {
      ok: false,
      checks: [{ name: 'contract files parse as JSON', ok: false, detail: err.message }],
    };
  }

  const checks = [];
  const check = (name, fail, pass) => checks.push({ name, ok: fail === null, detail: fail ?? pass });
  const IDENTIFIER = /^[A-Z][A-Za-z0-9]*$/;

  const components = Array.isArray(catalog?.components) ? catalog.components : [];
  const kinds = components
    .map(entry => (Array.isArray(entry) ? entry[1] : undefined))
    .filter(kind => typeof kind === 'string');
  const distinctKinds = new Set(kinds);

  check('catalog count matches entries',
    Number.isInteger(catalog?.count) && catalog.count === components.length ? null :
      `count=${JSON.stringify(catalog?.count)}, entries=${components.length}`,
    `${components.length} entries`);

  check('catalog primitives match distinct kinds',
    catalog?.primitives === distinctKinds.size ? null :
      `primitives=${JSON.stringify(catalog?.primitives)}, distinct kinds=${distinctKinds.size}`,
    `${distinctKinds.size} distinct kinds`);

  const malformed = components.findIndex(entry => !Array.isArray(entry) || entry.length !== 4 ||
    typeof entry[0] !== 'string' || !IDENTIFIER.test(entry[0]) ||
    typeof entry[1] !== 'string' || !IDENTIFIER.test(entry[1]) ||
    typeof entry[2] !== 'string' || entry[2] === '' ||
    typeof entry[3] !== 'object' || entry[3] === null || Array.isArray(entry[3]));
  check('catalog entries have the required shape', malformed === -1 ? null :
    `entry ${malformed} is not a [name, primitive, category, defaultProps] tuple`,
    `${components.length} tuples`);

  const names = components.map(entry => (Array.isArray(entry) ? entry[0] : undefined));
  const duplicatedName = names.find((name, index) => names.indexOf(name) !== index);
  check('catalog component names are unique', duplicatedName === undefined ? null :
    `duplicate component name ${JSON.stringify(duplicatedName)}`, `${names.length} unique names`);

  const nodes = [];
  const walk = node => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    nodes.push(node);
    for (const child of Array.isArray(node.children) ? node.children : []) walk(child);
  };
  walk(golden?.tree);
  const ids = nodes.map(node => node.id);
  const idSet = new Set(ids);

  const schemaVersion = /ir\s*==\s*"([^"]+)"/.exec(files['IR_SCHEMA.md'])?.[1];
  check('golden IR version matches IR_SCHEMA.md',
    schemaVersion === undefined ? 'IR_SCHEMA.md declares no ir version' :
      golden?.ir === schemaVersion ? null :
        `ir=${JSON.stringify(golden?.ir)}, IR_SCHEMA.md requires ${JSON.stringify(schemaVersion)}`,
    `ir ${JSON.stringify(golden?.ir)}`);

  const duplicatedId = ids.find((id, index) => ids.indexOf(id) !== index);
  const outOfOrder = ids.findIndex((id, index) => id !== index);
  check('golden IR node ids are unique and pre-ordered',
    nodes.length === 0 ? 'golden IR declares no tree nodes' :
      duplicatedId !== undefined ? `duplicate node id ${String(duplicatedId)}` :
        outOfOrder !== -1 ?
          `node ${outOfOrder} has id ${JSON.stringify(ids[outOfOrder])}, pre-order expects ${outOfOrder}` :
          null,
    `${nodes.length} nodes`);

  const dangling = (() => {
    for (const node of nodes) {
      if (!Array.isArray(node.children)) return `node ${JSON.stringify(node.id)} has no children array`;
      for (const child of node.children) {
        const ref = child !== null && typeof child === 'object' ? child.id : child;
        if (!idSet.has(ref)) {
          return `child ${JSON.stringify(child)} does not resolve to a declared node id`;
        }
      }
    }
    return null;
  })();
  check('golden IR tree children resolve to declared nodes', dangling, `${idSet.size} declared node ids`);

  const langTable = table(files['LANG_SPEC.md'], '## Node kinds and props (v0.1)');
  const langKinds = (langTable?.rows ?? []).map(row => backticked(row[0])).filter(Boolean);
  const unknownKinds = [...new Set(nodes.map(node => String(node.kind)))]
    .filter(kind => !langKinds.includes(kind));
  check('golden IR node kinds appear in LANG_SPEC.md',
    langKinds.length === 0 ? 'LANG_SPEC.md declares no node kinds' :
      unknownKinds.length ? `node kinds outside LANG_SPEC.md: ${unknownKinds.join(', ')}` : null,
    `${langKinds.length} declared kinds`);

  const opUnion = /"op":\s*((?:"[a-z]+"(?:\s*\|\s*"[a-z]+")*))/.exec(files['IR_SCHEMA.md'])?.[1];
  const declaredOps = opUnion ? [...opUnion.matchAll(/"([a-z]+)"/g)].map(match => match[1]) : [];
  const usedOps = [...new Set(nodes.flatMap(node =>
    node.events && typeof node.events === 'object' && !Array.isArray(node.events)
      ? Object.values(node.events).map(action => String(action?.op))
      : []))];
  const undeclaredOps = usedOps.filter(op => !declaredOps.includes(op));
  check('golden IR event ops appear in IR_SCHEMA.md',
    declaredOps.length === 0 ? 'IR_SCHEMA.md declares no action ops' :
      undeclaredOps.length ? `event ops outside the declared union: ${undeclaredOps.join(', ')}` : null,
    `used ops ${usedOps.join(', ') || 'none'} within ${declaredOps.join('|')}`);

  const unmapped = langKinds.filter(kind => !distinctKinds.has(kind));
  check('LANG_SPEC.md node kinds appear in components.json',
    langKinds.length === 0 ? 'LANG_SPEC.md declares no node kinds' :
      unmapped.length ? `node kinds without a catalog primitive: ${unmapped.join(', ')}` : null,
    `${langKinds.length} node kinds mapped`);

  const emitters = table(files['IR_SCHEMA.md'], '## Target emitters');
  const targets = (emitters?.rows ?? []).map(row => backticked(row[0])).filter(Boolean);
  const duplicatedTarget = targets.find((name, index) => targets.indexOf(name) !== index);
  // The package section makes app.json the required mini-program manifest, so
  // its presence marks mini-program rows without pinning a target name list.
  const miniProgramRows = (emitters?.rows ?? [])
    .filter(row => String(row[1] ?? '').includes('app.json'));
  const stated = /For all (\w+) mini-program targets/i.exec(files['IR_SCHEMA.md'])?.[1];
  const statedCount = /^\d+$/.test(stated ?? '')
    ? Number(stated)
    : WORD_NUMBERS[String(stated ?? '').toLowerCase()];
  check('IR_SCHEMA.md emitter table matches mini-program package section',
    !emitters ? 'target emitter table not found' :
      targets.length === 0 ? 'target emitter table lists no targets' :
        duplicatedTarget !== undefined ? `duplicate target ${JSON.stringify(duplicatedTarget)}` :
          statedCount === undefined ? 'package section states no mini-program target count' :
            miniProgramRows.length !== statedCount ?
              `table lists ${miniProgramRows.length} mini-program targets, package section states ${statedCount}` :
              null,
    `${targets.length} targets, ${miniProgramRows.length} mini-program`);

  const links = [...files['README.md'].matchAll(/\]\(([^)\s]+)\)/g)]
    .map(match => match[1])
    .filter(target => !/^(https?:|mailto:|#)/.test(target))
    .map(target => target.replace(/^<|>$/g, '').replace(/#.*$/, ''));
  const broken = links.filter(clean => clean && !clean.includes('*') && !existsSync(join(root, clean)));
  check('README.md index links resolve',
    links.length === 0 ? 'README.md lists no relative links' :
      broken.length ? `broken links: ${broken.join(', ')}` : null,
    `${links.length} links`);

  return { ok: checks.every(result => result.ok), checks };
}

// Prints one line per check plus a summary; the return value carries the
// verdict so CI and tests can rely on it.
export function runContracts(argv = process.argv) {
  const root = argv[2] ? resolve(argv[2]) : REPO_ROOT;
  const { ok, checks } = validateContracts(root);
  for (const { name, ok: passed, detail } of checks) {
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }
  const failed = checks.filter(result => !result.ok).length;
  if (!ok) {
    console.error(`FAIL: ${failed} of ${checks.length} contract checks failed`);
    return 1;
  }
  console.log(`PASS: ${checks.length} contract checks passed`);
  return 0;
}

// Callable as a CLI and importable as a module at the same time.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runContracts();
}
