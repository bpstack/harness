import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  outside,
  graft,
  planFile,
  violation,
  plan,
  planRemoval,
  summarize,
  renderBlock,
  UPDATE,
  GRAFT,
  SKIP,
} from '../../lib/propagate.mjs';

const WITH_BLOCK = [
  '# A project',
  '',
  'Prose the project owns.',
  '',
  '<!-- capa1:inicio · generado desde el arnés -->',
  'old rules',
  '<!-- capa1:fin -->',
  '',
  'More prose the project owns.',
].join('\n');

const WITHOUT = ['# A project', '', 'Just prose.'].join('\n');

test('a file with a block is updated, not grafted', () => {
  const { action, migrates } = planFile(WITH_BLOCK, 'layer1', 'new rules');
  assert.equal(action, UPDATE);
  assert.equal(migrates, true); // it was Spanish: this is the migration
});

test('a file without a block is grafted', () => {
  const { action, migrates } = planFile(WITHOUT, 'layer1', 'new rules');
  assert.equal(action, GRAFT);
  assert.ok(!migrates);
});

test('a second pass changes nothing — idempotent', () => {
  const first = planFile(WITHOUT, 'layer1', 'rules').next;
  const second = planFile(first, 'layer1', 'rules');
  assert.equal(second.action, SKIP);
  assert.equal(second.next, first);
});

test('an update with the same body is a skip, not a rewrite', () => {
  const once = planFile(WITH_BLOCK, 'layer1', 'new rules').next;
  assert.equal(planFile(once, 'layer1', 'new rules').action, SKIP);
});

// 🔴 The promise. Everything outside the marks must survive byte for byte.
test('nothing outside the marks changes, on update or on graft', () => {
  for (const source of [WITH_BLOCK, WITHOUT]) {
    const { next, action } = planFile(source, 'layer1', 'whatever the body is');
    assert.equal(violation(source, next, action), null);
  }
});

// The graft rule is its own: the title stays first, the project text survives
// whole, and the block goes between them. Sabotage: appending it at the end is
// a violation.
test('🔴 a graft that does not go on top is caught', () => {
  const sneaky = `${WITHOUT}\n\n<!-- layer1:start · x -->\nb\n<!-- layer1:end -->\n`;
  assert.ok(
    violation(WITHOUT, sneaky, GRAFT),
    'an appended graft slipped past',
  );
});

test('the project prose is still there, word for word', () => {
  const { next } = planFile(WITH_BLOCK, 'layer1', 'x');
  assert.match(next, /Prose the project owns\./);
  assert.match(next, /More prose the project owns\.$/);
});

// The check must be able to fail, or it is decoration. Sabotage: a change
// outside the marks has to be caught.
test('🔴 a change outside the marks IS caught', () => {
  const tampered = WITH_BLOCK.replace('Just prose', 'x').replace(
    'More prose the project owns.',
    'someone edited this',
  );
  const v = violation(WITH_BLOCK, tampered);
  assert.ok(v, 'the violation check failed to notice an outside edit');
  assert.equal(typeof v.at, 'number');
});

test('outside() blanks the block whichever language it is in', () => {
  const es = outside(WITH_BLOCK);
  const en = outside(planFile(WITH_BLOCK, 'layer1', 'x').next);
  assert.equal(es, en, 'the same file must compare equal across the migration');
  assert.match(es, /⟦layer1⟧/);
});

// The rules come before the prose they govern, and a title stays first.
test('a graft lands under the title, before the project text', () => {
  const out = graft(WITHOUT, 'layer1', 'body');
  assert.ok(out.startsWith('# A project\n\n<!-- layer1:start'));
  assert.ok(out.indexOf('layer1:end') < out.indexOf('Just prose'));
  assert.ok(out.endsWith('Just prose.'), 'the project text was not kept whole');
});

test('with no title the graft goes first, one blank line before the prose', () => {
  const out = graft('text', 'layer1', 'b');
  assert.ok(out.startsWith('<!-- layer1:start'));
  assert.match(out, /layer1:end -->\n\ntext$/);
});

test('the rendered block carries the body between its marks', () => {
  const out = renderBlock('layer1', '  body  ');
  assert.match(out, /^<!-- layer1:start/);
  assert.match(out, /\n body|body\n/);
  assert.match(out, /<!-- layer1:end -->$/);
});

test('a run summarizes as data, not as printed text', () => {
  const results = plan(
    [
      { path: 'a.md', text: WITH_BLOCK },
      { path: 'b.md', text: WITHOUT },
      { path: 'c.md', text: planFile(WITHOUT, 'layer1', 'r').next },
    ],
    'layer1',
    'r',
  );
  assert.deepEqual(summarize(results), {
    update: 1,
    graft: 1,
    skip: 1,
    migrates: 1,
    unsafe: 0,
  });
});

// 🔴 The block sits between an HTML comment and a heading, which Markdown
// treats as separate block elements: Prettier puts a blank line between them.
// Without it this tool and the formatter undo each other forever — `format`
// adds the line, `propagate` calls the file stale — and layer 1 requires every
// project to chain `format:check`, so such a repo can never be green.
// Measured on 2026-09-06 on this repo's own AGENTS.md.
test('the block is written the way a formatter would leave it', () => {
  const block = renderBlock('layer1', 'the rules');
  const lines = block.split('\n');
  assert.match(lines[0], /layer1:start/);
  assert.equal(lines[1], '', 'no blank line after the opening mark');
  assert.equal(lines.at(-2), '', 'no blank line before the closing mark');
  assert.match(lines.at(-1), /layer1:end/);
});

// 🔴 It used to be assembled in two places — here and inside `replaceBlock` —
// so the graft wrote one shape and the update wrote another, and a second pass
// never settled. One renderer, checked from both paths.
test('graft and update produce the same block for the same body', () => {
  const grafted = graft('# P\n\nProse.\n', 'layer1', 'the rules');
  const updated = planFile(grafted, 'layer1', 'the rules');
  assert.equal(updated.action, SKIP, 'a second pass is not a rewrite');
});

// 🔴 Data loss, measured on 2026-09-07 on a real folder. One unclosed
// `layer1:start` in a project's AGENTS.md:
//   pass 1 — no closer, so the file reads as unmarked and a whole block is
//            grafted at the end. Now two openers, one closer.
//   pass 2 — the broken opener at the top pairs with the grafted closer at the
//            bottom, and the project's own prose between them is replaced.
//            Reported as a plain `update`. Exit 0.
// `violation` could not see it: `outside()` is built on the same `findBlock`,
// so it computed the same wrong span on both sides and called them equal.
test('🔴 an unclosed mark is refused, not grafted around', () => {
  const text = [
    '# X',
    '',
    'The project prose.',
    '',
    '<!-- layer1:start · generated by the harness · do not edit by hand -->',
    'half a block, never closed',
    '',
    'Prose that must not be lost.',
    '',
  ].join('\n');

  const [first] = plan([{ path: 'a.md', text }], 'layer1', 'BODY');
  assert.ok(first.violation, 'a file with an unclosed mark was not refused');
  assert.match(first.violation.reason, /unmatched 'layer1' opener/);
  assert.equal(first.next, text, 'the plan changed a file it refused');

  // And the second pass cannot happen, because the first wrote nothing.
  const [again] = plan([{ path: 'a.md', text: first.next }], 'layer1', 'BODY');
  assert.ok(again.violation, 'the refusal did not survive a second pass');
  assert.ok(
    again.next.includes('Prose that must not be lost.'),
    'the prose was lost',
  );
});

test('a closer with no opener is refused too', () => {
  const text = '# X\n\nMine.\n\n<!-- layer1:end -->\n\nAlso mine.\n';
  const [r] = plan([{ path: 'a.md', text }], 'layer1', 'BODY');
  assert.ok(r.violation, 'an orphan closer was accepted');
  assert.match(r.violation.reason, /unmatched 'layer1' closer/);
});

test('a block that closes before it opens is refused', () => {
  const text =
    '<!-- layer1:end -->\nmine\n<!-- layer1:start · x -->\nmine too\n';
  const [r] = plan([{ path: 'a.md', text }], 'layer1', 'BODY');
  assert.ok(r.violation, 'inverted marks were accepted');
  assert.match(r.violation.reason, /closes before it opens/);
});

// The refusal must not swallow the ordinary cases: a well-formed file and a
// file with no marks at all still work exactly as before.
test('a balanced file and an unmarked file are untouched by the refusal', () => {
  const marked =
    'top\n<!-- layer1:start · x -->\nold\n<!-- layer1:end -->\nbottom\n';
  const [a] = plan([{ path: 'a.md', text: marked }], 'layer1', 'BODY');
  assert.equal(a.violation, null, 'a balanced file was refused');

  const [b] = plan([{ path: 'b.md', text: 'nothing here\n' }], 'layer1', 'X');
  assert.equal(b.violation, null, 'an unmarked file was refused');
  assert.equal(b.action, GRAFT);
});

// A refusal is not "already current": nothing happened, and saying otherwise
// tells the reader the opposite of what took place.
test('a refused file is not counted as current', () => {
  const broken = '<!-- layer1:start · x -->\nmine\n';
  const results = plan([{ path: 'a.md', text: broken }], 'layer1', 'BODY');
  const s = summarize(results);
  assert.equal(s.skip, 0, 'a refusal was counted as already current');
  assert.equal(s.unsafe, 1);
});

// 🔴 Two complete blocks of one family are balanced, so the pairing test lets
// them through — and `planFile` only ever replaces the first. Measured on
// 2026-09-07: first block updated, second left stale, report said `1 to update`
// and exit 0. Nothing is lost, but the file then holds two different versions
// of layer 1 at once and the agent reading it gets contradictory rules. Silent,
// permanent, and the opposite of what this tool guarantees.
test('🔴 two blocks of one family are refused, not half-updated', () => {
  const text = [
    '# X',
    '<!-- layer1:start · a -->',
    'FIRST',
    '<!-- layer1:end -->',
    'mine',
    '<!-- layer1:start · a -->',
    'SECOND',
    '<!-- layer1:end -->',
    '',
  ].join('\n');

  const [r] = plan([{ path: 'a.md', text }], 'layer1', 'NEW BODY');
  assert.ok(r.violation, 'a file with two blocks was accepted');
  assert.match(r.violation.reason, /2 separate 'layer1' blocks/);
  assert.equal(r.next, text, 'a refused file was changed');
  // The one that used to survive untouched must still be there, and so must
  // the one that used to be silently rewritten.
  assert.ok(r.next.includes('FIRST') && r.next.includes('SECOND'));
});

// One block of each of two families is not a duplicate: it is the normal file.
test('one layer1 and one layer2 block in the same file are fine', () => {
  const text = [
    '<!-- layer1:start · a -->',
    'one',
    '<!-- layer1:end -->',
    '<!-- layer2:start · a -->',
    'two',
    '<!-- layer2:end -->',
    '',
  ].join('\n');
  for (const family of ['layer1', 'layer2']) {
    const [r] = plan([{ path: 'a.md', text }], family, 'BODY');
    assert.equal(r.violation, null, `${family} was refused in a normal file`);
  }
});

// The stack layer 2 is taken out whole, and nothing else moves.
test('a stack layer 2 block is removed, and the text around it stays', () => {
  const text = [
    '# Project',
    '',
    '<!-- capa2:inicio · módulo=express -->',
    '',
    'old stack rules',
    '',
    '<!-- capa2:fin -->',
    '',
    '## Own prose',
    '',
  ].join('\n');
  const r = planRemoval(text, 'layer2');
  assert.equal(r.removed, true);
  assert.equal(r.next, '# Project\n\n## Own prose\n');
  assert.deepEqual(planRemoval(r.next, 'layer2'), {
    next: r.next,
    removed: false,
    violation: null,
  });
});
