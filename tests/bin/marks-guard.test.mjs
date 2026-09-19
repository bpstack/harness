import { test } from 'node:test';
import assert from 'node:assert/strict';
import { survey, report } from '../../bin/marks-guard.mjs';

const file = (path, text) => ({ path, text });

const KNOWN = file(
  'a.md',
  [
    '<!-- layer1:start · x -->',
    'body',
    '<!-- layer1:end -->',
    '<!-- layer2:start · x -->',
    'body',
    '<!-- layer2:end -->',
  ].join('\n'),
);

const OLD = file(
  'b.md',
  ['<!-- capa1:inicio · x -->', 'body', '<!-- capa1:fin -->'].join('\n'),
);

const INVENTED = file(
  'c.md',
  ['<!-- layer3:start -->', 'body', '<!-- layer3:end -->'].join('\n'),
);

test('known families in the new language pass cleanly', () => {
  const s = survey([KNOWN]);
  assert.equal(s.unknown.size, 0);
  assert.equal(s.spanish.length, 0);
  assert.equal(s.total, 4);
  assert.equal(report(s, { scanned: 1 }).failed, false);
});

// 🔴 The failure it exists for: a block nobody manages. The harness will not
// update it and the project will assume otherwise.
test('an invented family cuts the run', () => {
  const s = survey([INVENTED]);
  assert.deepEqual([...s.unknown.keys()], ['layer3']);
  const { text, failed } = report(s, { scanned: 1 });
  assert.equal(failed, true);
  assert.match(text, /unknown mark family/);
  assert.match(text, /orphan/);
});

test('the report names the file, so it can be found', () => {
  const { text } = report(survey([INVENTED]), { scanned: 1 });
  assert.match(text, /c\.md/);
});

// The counter that decides when the old language is switched off — a number,
// not a date.
test('old-language marks are counted, and do not fail the run', () => {
  const s = survey([OLD]);
  assert.equal(s.spanish.length, 2);
  const { text, failed } = report(s, { scanned: 1 });
  assert.equal(failed, false, 'an un-migrated repo is not broken');
  assert.match(text, /still in the old language/);
});

test('zero old marks is stated, not left silent', () => {
  const { text } = report(survey([KNOWN]), { scanned: 1 });
  assert.match(text, /no marks left in the old language/);
});

test('a file with no marks contributes nothing either way', () => {
  const s = survey([file('d.md', 'just prose')]);
  assert.equal(s.total, 0);
  assert.equal(report(s, { scanned: 1 }).failed, false);
});

test('the same unknown family in two files is reported once, with a count', () => {
  const s = survey([INVENTED, file('e.md', '<!-- layer3:start -->x')]);
  assert.equal(s.unknown.size, 1);
  assert.equal(s.unknown.get('layer3').length, 2);
  assert.match(report(s, { scanned: 2 }).text, /2 file\(s\)/);
});

test('a mixed repo reports both things at once', () => {
  const { text, failed } = report(survey([KNOWN, OLD, INVENTED]), {
    scanned: 3,
  });
  assert.match(text, /unknown mark family/);
  assert.match(text, /still in the old language/);
  assert.equal(failed, true, 'the unknown family decides the exit code');
});

// 🔴 `repairs` was declared alongside the other three and nothing ever wrote
// it. Retired on 2026-09-06. Anyone whose file still carries the mark meets
// this guard, and "unknown family" would be true and useless: the block is not
// broken, it is now ordinary project text that every pass preserves.
test('a retired family is named as retired, not merely unknown', () => {
  const unknown = new Map([['repairs', ['a/AGENTS.md']]]);
  const { text, failed } = report(
    { unknown, spanish: [], total: 1 },
    { scanned: 1 },
  );
  assert.equal(failed, true, 'an orphan block still cuts the run');
  assert.match(text, /RETIRED by this harness/);
  assert.match(text, /Nothing of yours is lost/);
  assert.match(text, /delete the\s+two marker lines by hand/);
});

test('the old Spanish key for it is recognised too', () => {
  const unknown = new Map([['reparaciones', ['a/AGENTS.md']]]);
  const { text } = report({ unknown, spanish: [], total: 1 }, { scanned: 1 });
  assert.match(text, /RETIRED by this harness/);
});

// A family that was never ours gets the plain message: telling someone their
// own marker was "retired by this harness" would be a lie.
test('a family that was never ours gets no retirement notice', () => {
  const unknown = new Map([['invented', ['a/AGENTS.md']]]);
  const { text } = report({ unknown, spanish: [], total: 1 }, { scanned: 1 });
  assert.doesNotMatch(text, /RETIRED/);
  assert.doesNotMatch(text, /repairs family was retired/);
});
