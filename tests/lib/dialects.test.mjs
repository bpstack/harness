import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSource,
  forClaude,
  forOpencode,
  SourceError,
  MARK,
  chooseHarnesses,
} from '../../lib/dialects.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SOURCE = [
  '---',
  'name: reviewer',
  'description: Reads code, never writes.',
  'kind: agent',
  'temperature: 0.2',
  'tools: read, grep, bash',
  'bash-allow:',
  '  - git status *',
  '  - git diff *',
  '---',
  '',
  'You are a reviewer.',
].join('\n');

test('the frontmatter and the body are separated', () => {
  const { front, body } = parseSource(SOURCE);
  assert.equal(front.name, 'reviewer');
  assert.equal(front.temperature, '0.2');
  assert.deepEqual(front['bash-allow'], ['git status *', 'git diff *']);
  assert.equal(body, 'You are a reviewer.');
});

test('a file with no frontmatter is refused, not guessed at', () => {
  assert.throws(() => parseSource('just prose'), SourceError);
});

test('a list item with no key above it is refused', () => {
  assert.throws(() => parseSource('---\n  - orphan\n---\nx'), SourceError);
});

test('a missing name or description stops the write', () => {
  assert.throws(() => forClaude({}, 'b'), /missing "name"/);
  assert.throws(() => forClaude({ name: 'x' }, 'b'), /missing "description"/);
});

// 🔴 The body is what both harnesses share. If it differed, the two would drift
// and nothing would notice.
test('both dialects carry the identical body', () => {
  const { front, body } = parseSource(SOURCE);
  assert.ok(forClaude(front, body).content.endsWith('You are a reviewer.'));
  assert.ok(forOpencode(front, body).content.endsWith('You are a reviewer.'));
});

// 🔴 The mark goes in the body, never the frontmatter: opencode would send an
// unknown frontmatter key to the model provider.
test('both dialects mark the file below the frontmatter', () => {
  const { front, body } = parseSource(SOURCE);
  for (const write of [forClaude, forOpencode]) {
    const { content } = write(front, body);
    assert.ok(content.includes(`---\n\n${MARK}\n\nYou are a reviewer.`));
    assert.doesNotMatch(content.split('\n---\n')[0], /generated-by/);
  }
});

test('Claude Code gets capitalised tool names', () => {
  const { front, body } = parseSource(SOURCE);
  assert.match(forClaude(front, body).content, /tools: Read, Grep, Bash/);
});

// 🔴 The limitation is announced, not swallowed. The allow-list is real
// protection in one harness and absent in the other.
test('the lost bash allow-list is warned about, loudly', () => {
  const { front, body } = parseSource(SOURCE);
  const { content, warnings } = forClaude(front, body);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /does not travel to Claude Code/);
  assert.doesNotMatch(content, /git status/);
});

// --- opencode permissions, resolved the way OpenCode V2 resolves them ---
//
// The expected values come from the requirement — a read-only agent reads,
// searches, runs its listed commands and asks Context7, and nothing else — and
// from V2's documented rule: the **last matching rule wins**, `*` matches any
// run of characters, `/` included. Not from `forOpencode`.

const HOME = '/home/u';
const list = (v) => (Array.isArray(v) ? v : []);

const rulesOf = (content) =>
  content
    .split('\n---\n')[0]
    .split('\n')
    .filter((l) => l.startsWith('  - {'))
    .map((l) => JSON.parse(l.slice(4)));

const matches = (pattern, value) =>
  new RegExp(
    `^${pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('*', '.*')
      .replaceAll('?', '.')}$`,
    'i',
  ).test(value);

const expand = (r) =>
  ['read', 'edit', 'external_directory'].includes(r.action)
    ? r.resource.replace(/^~(?=\/)/, HOME)
    : r.resource;

const resolve = (rules, action, resource) =>
  rules.reduce(
    (effect, r) =>
      matches(r.action, action) && matches(expand(r), resource)
        ? r.effect
        : effect,
    'allow',
  );

// What every agent gets before its own rules and after them, measured with
// `opencode debug agents` on 2026-11-11 (2.1.3 and 2.2.5 alike).
const BEFORE = [
  { action: '*', resource: '*', effect: 'allow' },
  { action: 'read', resource: '*.env', effect: 'ask' },
  { action: 'read', resource: '*.env.*', effect: 'ask' },
  { action: 'read', resource: '*.env.example', effect: 'allow' },
  { action: 'external_directory', resource: '*', effect: 'ask' },
  {
    action: 'external_directory',
    resource: `${HOME}/.claude/reference/*`,
    effect: 'allow',
  },
];
const AFTER = [{ action: 'browser', resource: '*', effect: 'deny' }];

const PROBES = [
  ['experimental_image_generate', '*', 'deny'],
  ['playwright_browser_navigate', '*', 'deny'],
  ['webfetch', 'https://example.com', 'deny'],
  ['websearch', 'query', 'deny'],
  ['skill', 'caveman', 'deny'],
  ['question', '*', 'deny'],
  ['execute', '*', 'deny'],
  ['subagent', 'general', 'deny'],
  // The property that matters: an action nobody has invented yet.
  ['some_future_plugin_tool', '*', 'deny'],
  ['edit', 'src/a.js', 'deny'],
  ['shell', 'rm -rf x', 'deny'],
  ['read', 'src/a.js', 'allow'],
  ['grep', 'TODO', 'allow'],
  ['glob', '**/*.js', 'allow'],
  ['context7_query-docs', '*', 'allow'],
  ['read', '.env', 'ask'],
  ['read', 'config/.env.local', 'ask'],
  ['read', '.env.example', 'allow'],
  ['external_directory', `${HOME}/.claude/reference/security/*`, 'allow'],
  ['external_directory', '/elsewhere/x/*', 'ask'],
];

const deployed = (file) => {
  const raw = readFileSync(join(REPO, 'agents', file), 'utf8');
  const { front, body } = parseSource(raw, file);
  return { front, rules: rulesOf(forOpencode(front, body, file).content) };
};

for (const file of readdirSync(join(REPO, 'agents'))) {
  test(`🔴 opencode resolves ${file} to read-only plus Context7`, () => {
    const { front, rules } = deployed(file);
    const all = [...BEFORE, ...rules, ...AFTER];
    for (const [action, resource, want] of PROBES) {
      assert.equal(
        resolve(all, action, resource),
        want,
        `${file}: ${action} ${resource}`,
      );
    }
    // Every command the source lists still runs.
    for (const pattern of list(front['bash-allow'])) {
      const command = pattern.replaceAll('*', 'x');
      assert.equal(resolve(all, 'shell', command), 'allow', command);
    }
  });
}

// 🔴 The control: the same probes over the rules this harness produced until
// 2026-11-11 (V1 frontmatter, as V2 translated it, measured on `reviewer`).
// Had the evaluator been blind, this would pass the old rules too.
test('the old deny-list fails the same probes', () => {
  const old = [
    ...BEFORE,
    { action: 'edit', resource: '*', effect: 'deny' },
    { action: 'shell', resource: '*', effect: 'deny' },
    { action: 'shell', resource: 'git diff *', effect: 'allow' },
    ...AFTER,
  ];
  assert.equal(resolve(old, 'experimental_image_generate', '*'), 'allow');
  assert.equal(resolve(old, 'playwright_browser_navigate', '*'), 'allow');
  assert.equal(resolve(old, 'some_future_plugin_tool', '*'), 'allow');
});

test('opencode agents are written in the V2 format', () => {
  const { front, body } = parseSource(SOURCE);
  const head = forOpencode(front, body).content.split('\n---\n')[0];
  assert.match(head, /\nmode: subagent\n/);
  assert.match(head, /\npermissions:\n/);
  // V1 keys would make V2 read the file as V1 again.
  assert.doesNotMatch(head, /\n(permission|temperature|name):/);
});

// ⚠️ Written where V2 keeps it; announced, because V2 does not send `request`
// to the model yet. A value that changes nothing must not look as if it did.
test('the temperature opencode V2 does not apply is warned about', () => {
  const { front, body } = parseSource(SOURCE);
  const { content, warnings } = forOpencode(front, body);
  assert.match(content, /\nrequest: \{"body":\{"temperature":0\.2\}\}\n/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^reviewer: `temperature: 0\.2` is not applied/);
  assert.match(warnings[0], /opencode V2/);
});

test('a temperature that is not a number is refused', () => {
  const front = {
    name: 'a',
    description: 'd',
    kind: 'agent',
    temperature: 'x',
  };
  assert.throws(() => forOpencode(front, 'b'), /temperature "x"/);
});

test('an MCP server reaches both dialects, and a bad name is refused', () => {
  const front = {
    name: 'a',
    description: 'd',
    kind: 'agent',
    tools: 'read',
    mcp: ['context7'],
  };
  assert.match(forClaude(front, 'b').content, /tools: Read, mcp__context7__\*/);
  const rules = rulesOf(forOpencode(front, 'b').content);
  assert.equal(resolve(rules, 'context7_resolve-library-id', '*'), 'allow');
  front.mcp = ['context7__*'];
  assert.throws(() => forClaude(front, 'b'), /mcp server/);
  assert.throws(() => forOpencode(front, 'b'), /mcp server/);
});

test('without a temperature, opencode has nothing to warn about', () => {
  const front = { name: 'a', description: 'd', kind: 'agent', tools: 'read' };
  assert.deepEqual(forOpencode(front, 'b').warnings, []);
  const command = { ...front, kind: 'command', temperature: '0.2' };
  assert.deepEqual(forOpencode(command, 'b').warnings, []);
});

// 🔴 The bug this encodes: omitting the block when there is no bash left bash
// ALLOWED — the opposite of what the source declares.
test('no bash in the source means bash is denied', () => {
  const front = { name: 'a', description: 'd', kind: 'agent', tools: 'read' };
  const rules = rulesOf(forOpencode(front, 'b').content);
  assert.equal(resolve(rules, 'shell', 'ls'), 'deny');
});

test('bash with no allow-list runs anything', () => {
  const front = { name: 'a', description: 'd', kind: 'agent', tools: 'bash' };
  const rules = rulesOf(forOpencode(front, 'b').content);
  assert.equal(resolve(rules, 'shell', 'rm -rf x'), 'allow');
});

test('a tool that writes allows edit, and only then', () => {
  const front = {
    name: 'a',
    description: 'd',
    kind: 'agent',
    tools: 'read, write',
  };
  const rules = rulesOf(forOpencode(front, 'b').content);
  assert.equal(resolve(rules, 'edit', 'src/a.js'), 'allow');
  front.tools = 'read';
  const readOnly = rulesOf(forOpencode(front, 'b').content);
  assert.equal(resolve(readOnly, 'edit', 'src/a.js'), 'deny');
});

test('a command is not an agent — no subagent mode, no permissions', () => {
  const front = { name: 'c', description: 'd', kind: 'command', tools: 'read' };
  const { content } = forOpencode(front, 'b');
  assert.doesNotMatch(content, /mode: subagent/);
  assert.match(content, /agent: build/);
  // opencode command frontmatter does not support `tools:`; emitting it would
  // falsely suggest the command is restricted.
  assert.doesNotMatch(content, /\ntools:/);
});

// The real file, not a fixture: a dialect that works on invented input and
// breaks on the actual source is worth nothing.
test("this repo's own reviewer converts in both dialects", () => {
  const raw = readFileSync(join(REPO, 'agents', 'reviewer.md'), 'utf8');
  const { front, body } = parseSource(raw, 'reviewer.md');
  assert.match(forClaude(front, body).content, /^---\nname: reviewer/);
  assert.match(forOpencode(front, body).content, /mode: subagent/);
  assert.ok(body.length > 500, 'the body should be the whole prompt');
});

// ⚠️ Prettier reflows long frontmatter values onto a second line, so the
// repo's own formatter produced sources this parser refused. The reader must
// survive what the writer does to its own files.
test('a value continued on an indented line is joined', () => {
  const { front } = parseSource(
    [
      '---',
      'description:',
      '  Long text that',
      '  wrapped.',
      '---',
      '',
      'b',
    ].join('\n'),
  );
  assert.equal(front.description, 'Long text that wrapped.');
});

test('a value that starts on its key line and wraps is joined too', () => {
  const { front } = parseSource(
    ['---', 'description: Long text', '  that wrapped.', '---', '', 'b'].join(
      '\n',
    ),
  );
  assert.equal(front.description, 'Long text that wrapped.');
});

// A command that runs as a subtask says so, or it runs in the main session and
// spends its context. It is declared in the source and easy to drop on the way
// out — which is exactly what happened the first time.
// V2 spells it `subagent` and keeps `subtask` only as a deprecated alias.
test('subtask survives into the opencode dialect, as subagent', () => {
  const front = {
    name: 'c',
    description: 'd',
    kind: 'command',
    subtask: 'true',
    tools: 'read',
  };
  const { content } = forOpencode(front, 'b');
  assert.match(content, /\nsubagent: true\n/);
  assert.doesNotMatch(content, /subtask/);
});

test('a command that is not a subtask does not claim to be one', () => {
  const front = { name: 'c', description: 'd', kind: 'command', tools: 'read' };
  assert.doesNotMatch(forOpencode(front, 'b').content, /subtask|subagent/);
});

// OpenCode V2 names commands after their file, as it does agents.
test('an opencode command carries no name key', () => {
  const front = { name: 'c', description: 'd', kind: 'command', tools: 'read' };
  assert.doesNotMatch(forOpencode(front, 'b').content, /\nname:/);
});

// 🔴 Agents and commands are not the same shape in Claude Code: an agent
// declares name and tools; a command takes its name from its filename and
// spells the field allowed-tools. Writing one shape into the other produced
// files the tool would not read as intended.
test('a Claude agent declares name and tools', () => {
  const front = { name: 'a', description: 'd', kind: 'agent', tools: 'read' };
  const { content } = forClaude(front, 'b');
  assert.match(content, /^---\nname: a/);
  assert.match(content, /\ntools: Read/);
});

// A command's allowed-tools takes patterns, so the allow-list travels;
// a pattern that could end `Bash(...)` early is refused.
test('a Claude command carries its bash allow-list as patterns', () => {
  const front = {
    name: 'c',
    description: 'd',
    kind: 'command',
    tools: 'read, bash',
    'bash-allow': ['node *', 'ls *'],
  };
  const { content, warnings } = forClaude(front, 'b');
  assert.match(content, /allowed-tools: Read, Bash\(node \*\), Bash\(ls \*\)/);
  assert.equal(warnings.length, 0);
  front['bash-allow'] = ['ls), Bash(*'];
  assert.throws(() => forClaude(front, 'b'), /bash-allow pattern/);
});

test('a Claude command declares allowed-tools and no name', () => {
  const front = { name: 'c', description: 'd', kind: 'command', tools: 'read' };
  const { content } = forClaude(front, 'b');
  assert.doesNotMatch(content, /\nname:/);
  assert.match(content, /allowed-tools: Read/);
});

// --- model tier ---

// The source names a tier, never a model id, which would be one provider's
// word. Only Claude Code gets one (ADR-038).
const FAST = {
  name: 'c',
  description: 'd',
  kind: 'command',
  subtask: 'true',
  model: 'fast',
  tools: 'bash',
};

test('the fast tier is haiku in Claude Code', () => {
  assert.match(forClaude(FAST, 'b').content, /\nmodel: haiku\n/);
});

// The owner's choice: opencode keeps the session's model. Said, not dropped
// quietly, so nobody expects the tier to travel.
test('opencode writes no model for the tier, and says so', () => {
  const { content, warnings } = forOpencode(FAST, 'b');
  assert.doesNotMatch(content, /\nmodel:/);
  assert.match(warnings.join('\n'), /not applied in opencode/);
});

test('a model that is not a tier is refused, in both dialects', () => {
  const front = { ...FAST, model: 'claude-haiku-5-5' };
  assert.throws(() => forClaude(front, 'b'), /not a tier/);
  assert.throws(() => forOpencode(front, 'b'), /not a tier/);
});

test('commit-all runs on the fast tier', () => {
  const raw = readFileSync(join(REPO, 'commands', 'commit-all.md'), 'utf8');
  const { front, body } = parseSource(raw, 'commit-all.md');
  assert.match(forClaude(front, body).content, /\nmodel: haiku\n/);
});

// --- which harnesses to write ---

test('claude is always written; opencode only when found', () => {
  assert.deepEqual(chooseHarnesses().targets, ['claude']);
  assert.match(chooseHarnesses().why, /--opencode/);
  assert.deepEqual(chooseHarnesses({ opencode: true }).targets, [
    'claude',
    'opencode',
  ]);
});

test('--opencode writes it even where it is not found', () => {
  const { targets, why } = chooseHarnesses({ forced: true });
  assert.deepEqual(targets, ['claude', 'opencode']);
  assert.match(why, /asked for/);
});
