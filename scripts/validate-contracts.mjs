#!/usr/bin/env node
// Checks the published contract files against each other with Node built-ins
// only, so every repository can run the same validator without installing
// dependencies.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = [
  'components.json', 'counter.opuir.json', 'IR_SCHEMA.md', 'LANG_SPEC.md',
  'COMPONENTS_AND_A11Y.md', 'IR_ADDITIONS.md', 'README.md',
  'LANGUAGE_ADDITIONS.md', 'GPU_WINDOW_TRANSPORT.md',
];

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

  const FEEDBACK_FAMILY = ['Modal', 'Confirm', 'Drawer', 'Toast', 'Tooltip', 'Notification'];
  const feedbackContract = (() => {
    if (!Number.isInteger(catalog?.count) || catalog.count !== components.length) {
      return `count=${JSON.stringify(catalog?.count)}, tuples=${components.length}`;
    }
    const present = new Set(names);
    const missing = FEEDBACK_FAMILY.filter(name => !present.has(name));
    if (missing.length) return `missing feedback family names: ${missing.join(', ')}`;
    return null;
  })();
  check('feedback family names and catalog count are consistent', feedbackContract,
    `${FEEDBACK_FAMILY.length} feedback names, ${components.length} tuples`);

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

  // A declared `fontScale` is optional: the golden program has none, so the
  // checked-in IR must stay free of the key while all three documents agree
  // that the key exists and that a local prop takes precedence.
  const schema = files['IR_SCHEMA.md'];
  const language = files['LANG_SPEC.md'];
  const docsAgree = /optional `fontScale`/.test(schema)
    && /theme\.fontScale/.test(files['COMPONENTS_AND_A11Y.md'] ?? '')
    && /A `theme \{ \.\.\. \}` block/.test(language)
    && /local prop always wins/.test(language);
  check('fontScale contract is documented without changing golden IR',
    !docsAgree ? 'IR_SCHEMA, LANG_SPEC and COMPONENTS_AND_A11Y disagree on theme.fontScale' :
      'fontScale' in (golden?.theme ?? {}) ? 'golden IR must omit theme.fontScale' : null,
    'optional key documented, golden IR unchanged');

  // The renderer enforces the particle field bounds at parse time, so every
  // spec document that states them must agree: the IR_ADDITIONS field table
  // carries the canonical triples and LANG_SPEC.md must restate each range.
  const EXPECTED_PARTICLE_FIELDS = [
    ['count', '0..512', 'required'],
    ['seed', '0..4294967295', '1'],
    ['radius', '0..32', '2'],
    ['alpha', '0..1024', '1024'],
  ];
  const particleTable = table(files['IR_ADDITIONS.md'], '## 5. Particle field');
  const particleDocsAgree = (() => {
    if (!particleTable) return 'IR_ADDITIONS.md declares no particle field table';
    const rows = particleTable.rows
      .map(row => [backticked(row[0]), row[1], row[2]].filter(Boolean))
      .map(row => ({ field: row[0], range: row[1], default: row[2] }));
    for (const [field, range, defaultValue] of EXPECTED_PARTICLE_FIELDS) {
      const row = rows.find(entry => entry.field === field);
      if (!row) return `IR_ADDITIONS.md particle field table has no \`${field}\` row`;
      if (row.range !== range) return `particles.${field} is stated as ${JSON.stringify(row.range)}, the shipped bound is ${JSON.stringify(range)}`;
      if (defaultValue === 'required') {
        if (row.default !== 'required') return `particles.${field} must be required, the table says ${JSON.stringify(row.default)}`;
      } else if (row.default !== defaultValue) {
        return `particles.${field} default is ${JSON.stringify(row.default)}, the shipped default is ${JSON.stringify(defaultValue)}`;
      }
    }
    for (const [field, range] of EXPECTED_PARTICLE_FIELDS) {
      if (!files['LANG_SPEC.md'].includes(range)) {
        return `LANG_SPEC.md does not state the particles.${field} bound ${JSON.stringify(range)}`;
      }
    }
    return null;
  })();
  check('particle field bounds are documented consistently', particleDocsAgree,
    'IR_ADDITIONS.md and LANG_SPEC.md state the shipped particle bounds');

  // List indexing resolves at compile time, so every document that states the
  // read syntax must agree on the three parts the compiler enforces: the
  // `{items[i]}` form, an integer subscript (literal or `for` count variable),
  // and a compile-time resolution that never reaches IR.
  const listIndexDocs = [
    'LANGUAGE_ADDITIONS.md', 'LANG_SPEC.md', 'GPU_WINDOW_TRANSPORT.md',
  ];
  const listIndexAgree = (() => {
    for (const name of listIndexDocs) {
      const text = files[name];
      if (!text.includes('{items[i]}')) return `${name} does not state the \`{items[i]}\` read form`;
      if (!/integer literal/i.test(text)) return `${name} does not state that the subscript is an integer literal`;
      if (!/'for' count loop variable|`for` count loop variable/.test(text) && !/count loop variable/i.test(text)) {
        return `${name} does not state that a \`for\` count loop variable is a valid subscript`;
      }
      if (!/compile[- ]time/i.test(text)) return `${name} does not state that list reads resolve at compile time`;
    }
    return null;
  })();
  check('list indexing contract is documented consistently', listIndexAgree,
    'LANGUAGE_ADDITIONS.md, LANG_SPEC.md and GPU_WINDOW_TRANSPORT.md state the shipped list read');

  // `Breakpoint::from_width`, `fluid_grid` and the module restriction are shipped
  // values, so the published contract must quote each width boundary and the
  // import form exactly. A changed boundary or a dropped import is a regression.
  const EXPECTED_TIERS = [
    ['Compact', '< 600'],
    ['Medium', '< 900'],
    ['Expanded', '< 1200'],
    ['Wide', '< 1600'],
    ['Ultra', '>= 1600'],
  ];
  const responsiveContract = (() => {
    const text = files['LANG_SPEC.md'];
    for (const [tier, boundary] of EXPECTED_TIERS) {
      if (!text.includes(`\`${tier}\``)) return `LANG_SPEC.md does not name the \`${tier}\` tier`;
      if (!text.includes(boundary)) {
        return `LANG_SPEC.md does not state the ${tier} boundary ${JSON.stringify(boundary)}`;
      }
    }
    for (const value of [
      'Breakpoint::from_width', 'Direction::Vertical',
      'MIN_COLUMN_WIDTH = 120', 'MAX_GRID_COLUMNS = 12',
    ]) {
      if (!text.includes(value)) return `LANG_SPEC.md does not quote \`${value}\``;
    }
    if (!/import "[^"]+\.opu"/.test(text)) return 'LANG_SPEC.md does not state the import "..." syntax';
    if (!text.includes('main.opu')) return 'LANG_SPEC.md does not name the main.opu project entry';
    if (!text.includes('state, model, api, theme and imports')) {
      return 'LANG_SPEC.md does not state the imported module restriction';
    }
    return null;
  })();
  check('responsive layout and project contract is documented', responsiveContract,
    'LANG_SPEC.md quotes the five shipped width tiers and the import syntax');

  // The built-in icon names are a compile-time contract shared with the
  // renderer's icon module, so the published spec must list every name and
  // state the validation. A dropped name or a missing validation is a regression.
  const EXPECTED_ICONS = [
    'home', 'settings', 'star', 'search', 'plus', 'minus', 'check', 'close',
    'arrow_back', 'arrow_forward', 'refresh', 'lock', 'user', 'bell', 'heart',
    'info', 'warning', 'chevron_right', 'chevron_down', 'download', 'upload',
    'play', 'pause', 'edit', 'delete', 'eye', 'calendar', 'location', 'folder',
    'mail', 'chat',
  ];
  const iconContract = (() => {
    const text = files['LANG_SPEC.md'];
    // Scope the assertions to the icon section so a stray "compile time"
    // elsewhere cannot satisfy the check by accident.
    const section = text.split('## Icon names')[1]?.split('\n## ')[0] ?? '';
    if (section.length === 0) return 'LANG_SPEC.md has no icon names section';
    for (const name of EXPECTED_ICONS) {
      if (!section.includes(`\`${name}\``)) return `LANG_SPEC.md does not list the icon \`${name}\``;
    }
    if (!/has 31 names/.test(section)) return 'LANG_SPEC.md does not state the icon set has 31 names';
    if (!/compile time/.test(section)) return 'LANG_SPEC.md does not state icon validation happens at compile time';
    if (!/unknown name/.test(section)) return 'LANG_SPEC.md does not state the unknown-name diagnostic';
    if (!/requires a `name` prop/.test(section)) return 'LANG_SPEC.md does not state the Icon name prop is required';
    if (!/IconButton/.test(section) || !/SVGIcon/.test(section) || !/MaterialIcon/.test(section)) {
      return 'LANG_SPEC.md does not state the icon-lowering kinds';
    }
    return null;
  })();
  check('icon name contract is documented and complete', iconContract,
    'LANG_SPEC.md lists all 31 built-in icon names and the compile-time validation');

  // Gestures, navigation and implicit animation are additive: their IR keys are
  // documented in IR_ADDITIONS and must not appear in the golden counter IR.
  const additions = files['IR_ADDITIONS.md'];
  const interactionContract = (() => {
    if (!/## 8\. Gestures, navigation and implicit animation/.test(additions)) {
      return 'IR_ADDITIONS.md lacks the gesture/navigation/animation section';
    }
    for (const word of ['tap', 'doubleTap', 'longPress', 'drag']) {
      if (!additions.includes(word)) return `IR_ADDITIONS.md omits the ${word} gesture`;
    }
    if (!/\{ "op": "push", "target": "Page" \}/.test(additions)) {
      return 'IR_ADDITIONS.md omits the push action shape';
    }
    if (!/"pages": \["Home"/.test(additions)) {
      return 'IR_ADDITIONS.md omits the pages array';
    }
    for (const key of ['gesture', 'pages', 'duration', 'delay']) {
      if (key in (golden ?? {})) return `golden counter IR must not carry ${key}`;
    }
    const walk = (n) => {
      if (!n || typeof n !== 'object') return null;
      const props = n.props ?? {};
      for (const key of ['gesture', 'duration', 'delay', 'animate']) {
        if (key in props) return `golden node carries ${key}`;
      }
      for (const c of n.children ?? []) {
        const hit = walk(c);
        if (hit) return hit;
      }
      return null;
    };
    const nodeHit = walk(golden?.tree);
    if (nodeHit) return `golden counter IR ${nodeHit}`;
    return null;
  })();
  check('gesture and navigation contract is documented without golden drift',
    interactionContract,
    'gesture/nav/animation keys documented, golden IR unchanged');

  // Media, typography, repetition, validation and indexes are additive IR keys.
  // Their documented shapes must match the lowering and the golden IR must stay
  // free of every opt-in key.
  const mediaContract = (() => {
    if (!/## 9\. Media, typography, repetition and validation/.test(additions)) {
      return 'IR_ADDITIONS.md lacks the media/typography/repetition section';
    }
    for (const token of ['maxLines', 'repeat', 'form.validate()', 'minLength',
      'indexes', 'contain', 'IndexScan']) {
      if (!additions.includes(token)) return `IR_ADDITIONS.md omits ${token}`;
    }
    for (const key of ['repeat', 'maxLines', 'required', 'minLength', 'indexes']) {
      if (key in (golden ?? {})) return `golden counter IR must not carry ${key}`;
    }
    const scan = (n) => {
      if (!n || typeof n !== 'object') return null;
      for (const key of ['repeat', 'maxLines', 'fit', 'required', 'pattern']) {
        if (key in (n.props ?? {})) return `golden node carries ${key}`;
      }
      for (const c of n.children ?? []) {
        const hit = scan(c);
        if (hit) return hit;
      }
      return null;
    };
    const hit = scan(golden?.tree);
    return hit ? `golden counter IR ${hit}` : null;
  })();
  check('media and form contract is documented without golden drift',
    mediaContract,
    'media/typography/repeat/validation keys documented, golden IR unchanged');

  // The design-system chain is additive: one section must document the three
  // props, all five states and every variant/tone value, and no opt-in key may
  // leak into the frozen golden counter IR (top level or any node's props).
  const designSection = additions.split('## 11. Design-system chain')[1]
    ?.split('\n## ')[0] ?? '';
  const DESIGN_PROPS = ['state', 'variant', 'tone'];
  const DESIGN_STATES = ['default', 'hover', 'active', 'focus', 'disabled'];
  const DESIGN_VALUES = ['primary', 'secondary', 'text', 'danger', 'ghost', 'fab',
    'success', 'warning', 'error', 'info', 'neutral'];
  const DESIGN_KEYS = [...DESIGN_PROPS, 'fontMetrics'];
  const designContract = (() => {
    if (!designSection) return 'IR_ADDITIONS.md lacks the design-system chain section';
    for (const token of [...DESIGN_PROPS, ...DESIGN_STATES, ...DESIGN_VALUES, 'fontMetrics']) {
      if (!designSection.includes(`\`${token}\``)) {
        return `design-system chain section omits \`${token}\``;
      }
    }
    for (const key of DESIGN_KEYS) {
      if (!(key in (golden ?? {}))) continue;
      // `state` is the legal v0.1 top-level state-declaration array; the
      // design-system `state` is a node prop, never a root value.
      if (key === 'state' && Array.isArray(golden.state)) continue;
      return `golden counter IR must not carry ${key}`;
    }
    const scan = (n) => {
      if (!n || typeof n !== 'object') return null;
      for (const key of DESIGN_KEYS) {
        if (key in (n.props ?? {})) return `golden node carries ${key}`;
      }
      for (const c of Array.isArray(n.children) ? n.children : []) {
        const hit = scan(c);
        if (hit) return hit;
      }
      return null;
    };
    const hit = scan(golden?.tree);
    return hit ? `golden counter IR ${hit}` : null;
  })();
  check('design system chain is documented without golden drift', designContract,
    'props, states and variant/tone values documented, golden IR unchanged');

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
