import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('opencode gets the allow-list, denying everything else first', () => {
  const { front, body } = parseSource(SOURCE);
  const { content } = forOpencode(front, body);
  assert.match(content, /mode: subagent/);
  assert.match(content, /temperature: 0\.2/);
  assert.match(content, /edit: deny/);
  const denyAt = content.indexOf("'*': deny");
  const allowAt = content.indexOf("'git status \\*': allow");
  assert.ok(denyAt > -1, 'the catch-all deny is missing');
  assert.ok(content.includes("'git status *': allow"));
  assert.ok(denyAt < content.indexOf("'git status *': allow"));
});

// 🔴 The bug this encodes: omitting the block when there is no bash left bash
// ALLOWED — the opposite of what the source declares.
test('no bash in the source means bash is explicitly denied', () => {
  const front = { name: 'a', description: 'd', kind: 'agent', tools: 'read' };
  assert.match(forOpencode(front, 'b').content, /'\*': deny/);
});

test('a tool that writes flips edit to allow', () => {
  const front = {
    name: 'a',
    description: 'd',
    kind: 'agent',
    tools: 'read, write',
  };
  assert.match(forOpencode(front, 'b').content, /edit: allow/);
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
test('subtask survives into the opencode dialect', () => {
  const front = {
    name: 'c',
    description: 'd',
    kind: 'command',
    subtask: 'true',
    tools: 'read',
  };
  assert.match(forOpencode(front, 'b').content, /subtask: true/);
});

test('a command that is not a subtask does not claim to be one', () => {
  const front = { name: 'c', description: 'd', kind: 'command', tools: 'read' };
  assert.doesNotMatch(forOpencode(front, 'b').content, /subtask/);
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
