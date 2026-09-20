// The roadmap requires this guard to be **sabotaged before it is trusted**:
// feed it a private name on purpose and watch it fire. A guard that has only
// ever seen clean input is a design, not a guarantee.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanText,
  nameHits,
  readPrivateNames,
  report,
} from '../../bin/leak-guard.mjs';

test('🔴 a private repo name is caught — the sabotage the roadmap demands', () => {
  const found = scanText('see the notes in acme-vault for details', [
    'acme-vault',
  ]);
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'private-name');
  assert.equal(found[0].line, 1);
});

test('an absolute Windows path is caught', () => {
  const found = scanText(String.raw`const p = "D:\Users\someone";`); // leak-guard:allow
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'windows-path');
});

test('an absolute Linux home path is caught', () => {
  const found = scanText('cd /home/someone/projects'); // leak-guard:allow
  assert.equal(found[0].kind, 'home-path');
});

test('a path into the private notebook is caught', () => {
  const found = scanText('as measured in setup/findings/whatever.md'); // leak-guard:allow
  assert.equal(found[0].kind, 'private-repo');
});

test('clean text produces nothing', () => {
  assert.deepEqual(scanText('a harness for new projects', ['acme-vault']), []);
});

// The false positives the name check can produce: ordinary words that happen
// to be repo names. The boundary rule is what keeps them survivable.
test('a name does not fire inside a longer identifier', () => {
  assert.deepEqual(nameHits('const widgetOf = 1;', ['widget']), []);
  assert.deepEqual(nameHits('subwidget', ['widget']), []);
});

test('but it does fire when the word stands alone', () => {
  assert.deepEqual(nameHits('the widget repo', ['widget']), ['widget']);
  assert.deepEqual(nameHits('see widget.', ['widget']), ['widget']);
});

test('matching a name ignores case', () => {
  assert.deepEqual(nameHits('The Widget repo', ['widget']), ['widget']);
});

// 🔴 The failure mode this repo exists to avoid: a check that silently does
// less than it claims. With no list, the guard must SAY the name check did not
// run — passing quietly would be worse than failing.
test('with no list, the skip is announced and not hidden', () => {
  const { names, source } = readPrivateNames({ env: {}, repo: '/nonexistent' });
  assert.deepEqual(names, []);
  assert.equal(source, null);
  const { text, failed } = report([], { source });
  assert.match(text, /SKIPPED/);
  assert.equal(failed, false);
});

test('the env var feeds the list, comma separated', () => {
  const { names, source } = readPrivateNames({
    env: { HARNESS_PRIVATE_NAMES: 'one, two ,three' },
    repo: '/nonexistent',
  });
  assert.deepEqual(names, ['one', 'two', 'three']);
  assert.equal(source, 'HARNESS_PRIVATE_NAMES');
});

test('a finding makes the guard cut verify', () => {
  const { failed } = report([{ file: 'a.md', line: 2, why: 'x' }], {
    source: 'test',
  });
  assert.equal(failed, true);
});

// 🔴 The bug that produced 113 false leaks on its first real run: splitting on
// commas before dropping comments let everything after a comment's first comma
// through as a private name.
test('a comment containing commas contributes no names', () => {
  const raw = [
    '# examples: alpha, beta, gamma and delta',
    '# another, comment, with, commas',
    'real-name',
    'a, b',
  ].join('\n');
  const { names } = readPrivateNames({
    env: { HARNESS_PRIVATE_NAMES: '' },
    repo: '/nonexistent',
  });
  assert.deepEqual(names, []); // no source: nothing read
  // and via the env var, which uses the same parser:
  const parsed = readPrivateNames({
    env: { HARNESS_PRIVATE_NAMES: raw },
    repo: '/nonexistent',
  });
  assert.deepEqual(parsed.names, ['real-name', 'a', 'b']);
  assert.ok(
    !parsed.names.includes('and'),
    'a word from a comment became a name',
  );
});
