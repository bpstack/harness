import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildIndexes,
  chapterFile,
  decide,
  levelCounts,
  newerVersions,
  normalize,
  parseCsv,
  parseRequirements,
  readStamp,
  sha256,
  stampReadme,
  thousands,
  stampChecked,
  checkedAge,
  staleNotice,
} from '../../lib/asvs.mjs';
import { SECURITY, renderIndexes } from '../../bin/asvs-update.mjs';

const SOURCE = join(SECURITY, 'source');
const readme = readFileSync(join(SOURCE, 'README.md'), 'utf8');
const stamp = readStamp(readme);
const csv = readFileSync(join(SOURCE, stamp.file), 'utf8');

test('the CSV parser honours RFC 4180: commas, doubled quotes, newlines', () => {
  const rows = parseCsv('a,b\r\n"x, y","say ""hi""\nthere",3\n');
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['x, y', 'say "hi"\nthere', '3'],
  ]);
});

test('a CSV with another header is refused, not misread', () => {
  assert.throws(
    () => parseRequirements('id,name\n1,x\n'),
    /unexpected CSV header/,
  );
});

// 🔴 The record the README declares must match the file next to it. If the
// two drift, every comparison the updater makes is against a lie.
test('the shipped CSV has the sha256 and row count the README declares', () => {
  assert.equal(sha256(csv), stamp.sha256);
  const reqs = parseRequirements(csv);
  assert.equal(reqs.length, 345);
  assert.deepEqual(levelCounts(reqs), { L1: 70, L2: 183, L3: 92 });
});

// 🔴 The proof that the generator is the one that wrote what ships. Without
// this, a regeneration could silently produce different files from the same
// source — and the updater would then "fix" files nobody changed.
test('regenerating from the shipped CSV reproduces the 17 indexes byte for byte', async () => {
  const { files } = await renderIndexes(csv, {
    version: stamp.tag,
    tag: stamp.tag,
  });
  assert.equal(files.size, 17);
  const onDisk = readdirSync(SECURITY).filter((f) =>
    /^asvs-v\d\d\.md$/.test(f),
  );
  assert.deepEqual([...files.keys()].sort(), onDisk.sort());
  for (const [file, text] of files) {
    assert.equal(
      text,
      readFileSync(join(SECURITY, file), 'utf8'),
      `${file} differs from what the generator produces`,
    );
  }
});

test('the leak-guard marker is emitted by the generator, so it survives', () => {
  const reqs = [
    {
      chapter_id: 'V3',
      chapter_name: 'C',
      section_id: 'V3.3',
      section_name: 'Cookie Setup', // leak-guard:allow: OWASP's own title
      req_id: 'V3.3.1',
      req_description: 'x',
      L: '1',
    },
  ];
  const out = buildIndexes(reqs, {
    version: 'v5.0.0',
    tag: 'v5.0.0',
    allow: { 'V3.3': 'why' },
  });
  assert.match(
    out.get('asvs-v03.md'),
    /## V3\.3 — Cookie Setup <!-- leak-guard:allow: why -->/,
  );
  assert.match(out.get('asvs-v03.md'), /- \*\*v5\.0\.0-3\.3\.1\*\* \(L1\) x/);
});

test('chapter files are zero-padded so v02 sorts before v10', () => {
  assert.equal(chapterFile('V2'), 'asvs-v02.md');
  assert.equal(chapterFile('V17'), 'asvs-v17.md');
});

test('normalizing strips CR, so a line-ending-only difference has one hash', () => {
  assert.equal(sha256('a,b\r\n1,2\r\n'), sha256('a,b\n1,2\n'));
  assert.equal(normalize('x\r\n'), 'x\n');
});

// 🔴 A newer version is reported, never applied.
test('a newer tag is detected, with or without the _release suffix', () => {
  const tags = [
    'v5.1.0_release',
    'v5.0.0_release',
    'v4.0.3_release',
    'latest',
    'v5.1.0',
  ];
  assert.deepEqual(newerVersions(tags, 'v5.0.0'), ['v5.1.0_release']);
  assert.deepEqual(newerVersions(['v5.0.0_release', 'v4.0.3'], 'v5.0.0'), []);
  assert.deepEqual(newerVersions(['v6.0.0'], 'v5.0.0'), ['v6.0.0']);
});

test('the three verdicts: version wins, then current, then changed', () => {
  const same = decide({ readmeSha: sha256('x'), csvText: 'x', newer: [] });
  assert.equal(same.kind, 'current');
  assert.equal(same.exit, 0);

  const changed = decide({ readmeSha: sha256('x'), csvText: 'y', newer: [] });
  assert.equal(changed.kind, 'changed');
  assert.equal(changed.sha, sha256('y'));

  const version = decide({
    readmeSha: sha256('x'),
    csvText: 'x',
    newer: ['v5.1.0'],
  });
  assert.equal(version.kind, 'version');
  assert.equal(version.exit, 1, 'a version change must not exit clean');
  assert.match(version.text, /not applied on its own/);
});

test('the README stamp is replaced in place and nothing else moves', () => {
  const next = stampReadme(readme, {
    date: '2030-01-02',
    size: 123456,
    rows: 350,
    levels: { L1: 1, L2: 2, L3: 3 },
    sha: 'f'.repeat(64),
  });
  assert.match(
    next,
    /\*\*Downloaded:\*\* 2030-01-02 · \*\*Size:\*\* 123 456 bytes · \*\*Rows:\*\* 350/,
  );
  assert.match(next, /\(1 L1, 2 L2, 3 L3\)/);
  assert.match(next, /\*\*Checked against the tag:\*\* 2030-01-02/);
  assert.equal(readStamp(next).sha256, 'f'.repeat(64));
  assert.equal(next.split('\n').length, readme.split('\n').length);
  assert.throws(() =>
    stampReadme('no stamp here', {
      date: '',
      size: 0,
      rows: 0,
      levels: {},
      sha: '',
    }),
  );
});

test('thousands uses a plain space, so the README regex keeps matching', () => {
  assert.equal(thousands(105100), '105 100');
  assert.equal(thousands(999), '999');
  assert.equal(thousands(1234567), '1 234 567');
  assert.equal(thousands(105100).charCodeAt(3), 32);
});

// 🔴 The field is called "Checked against the tag" and used to record "last
// changed": `stampReadme` only runs when the CSV differs, so a run that found
// everything in order returned before it and left no trace. Nothing triggers
// this updater, so that line is the only thing that could reveal a stale ASVS,
// and an age is worthless when the line does not move on the days it should.
test('a clean check stamps the date, and keeps the rest of the README', () => {
  const readme = [
    '# Source',
    '',
    '- **Tag:** `v5.0.0`',
    '- **Checked against the tag:** 2020-01-01 — some old note',
    '- **sha256:** `deadbeef`',
    '',
  ].join('\n');

  const out = stampChecked(readme, '2026-09-07', 'same sha256');
  assert.match(
    out,
    /\*\*Checked against the tag:\*\* 2026-09-07 — same sha256/,
  );
  assert.doesNotMatch(out, /2020-01-01/);
  // Nothing else moved: the stamp is not a rewrite.
  assert.match(out, /\*\*sha256:\*\* `deadbeef`/);
  assert.match(out, /\*\*Tag:\*\* `v5\.0\.0`/);
});

test('a README with no such line fails loudly instead of stamping nothing', () => {
  assert.throws(() => stampChecked('# nothing here\n', '2026-09-07'));
});

// The age is read from the file that is versioned in the repo: no network, and
// no per-machine state, because what OWASP published is the same everywhere.
test('the age of the check is read in whole days', () => {
  const readme = '- **Checked against the tag:** 2026-09-01 — x\n';
  const seen = checkedAge(readme, new Date('2026-09-07T10:00:00Z'));
  assert.equal(seen.date, '2026-09-01');
  assert.equal(seen.days, 6);
  assert.equal(checkedAge('nothing\n'), null);
});

// 🔴 Proved red before being trusted: a stamp older than the cap must cut, and
// the number is not invented — OWASP's own release history on 2026-09-07 shows
// gaps of 20, 12 and 43 months, and zero releases in the last twelve.
test('a check older than the cap cuts, and one within it does not', () => {
  const fresh = staleNotice({ date: '2026-09-01', days: 6 });
  assert.equal(fresh.cuts, false);
  assert.match(fresh.text, /within 180/);

  const old = staleNotice({ date: '2025-01-01', days: 181 });
  assert.equal(old.cuts, true, '181 days did not cut a 180-day cap');
  assert.match(old.text, /181 days ago \(2025-01-01\)/);
  // It has to say how to clear it, and that clearing needs the network.
  assert.match(old.text, /asvs:update --apply/);
  assert.match(old.text, /network/);

  // The boundary belongs to the safe side, and is stated rather than implied.
  assert.equal(staleNotice({ date: 'x', days: 180 }).cuts, false);
});

// A README with no stamp is not "recently checked": it is unknown, and unknown
// cannot be allowed to read as fine — that is how the field got to record the
// wrong thing for so long.
test('a missing stamp cuts instead of passing', () => {
  const none = staleNotice(null);
  assert.equal(none.cuts, true);
  assert.match(none.text, /does not say when/);
});

// 🔴 The note belongs to the date. The pattern stopped at the day, so a run
// that regenerated **because the sha differed** kept the old line ending: the
// file then said «same sha256, nothing to regenerate» right after regenerating
// all 17 indexes. Found by faking the recorded sha and reading the diff, not by
// reading the regex.
test('a regeneration does not leave the previous note standing', () => {
  const readme = [
    '- **Downloaded:** 2026-08-19 · **Size:** 105 100 bytes · **Rows:** 345',
    '  requirements (70 L1, 183 L2, 92 L3)',
    '- **Checked against the tag:** 2026-09-06 — same sha256, nothing to regenerate',
    `- **sha256:** \`${'a'.repeat(64)}\``,
    '',
  ].join('\n');

  const out = stampReadme(readme, {
    date: '2026-09-07',
    size: 1,
    rows: 1,
    levels: { L1: 1, L2: 1, L3: 1 },
    sha: 'b'.repeat(64),
  });
  const line = out.split('\n').find((l) => l.includes('Checked against'));
  assert.doesNotMatch(line, /nothing to regenerate/, 'the stale note survived');
  assert.match(line, /2026-09-07 — regenerated from the tag/);
});

// And the two stamps must not fight: whichever ran last is the whole truth of
// that line, note included.
test('the two stamps each own the whole line', () => {
  const line = '- **Checked against the tag:** 2020-01-01 — regenerated\n';
  assert.match(
    stampChecked(line, '2026-09-07', 'same sha256'),
    /2026-09-07 — same sha256\n/,
  );
});
