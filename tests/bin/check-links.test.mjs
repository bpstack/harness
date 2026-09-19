import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  anchorOf,
  anchorsIn,
  linksIn,
  withoutCode,
  wrongCase,
} from '../../lib/links.mjs';
import { check, resolveWithCase } from '../../bin/check-links.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('anchors follow the lowercase-and-hyphenate rule', () => {
  assert.equal(
    anchorOf('## A Title, With Punctuation!'),
    'a-title-with-punctuation',
  );
  assert.equal(anchorOf('Layer 1 — invariants'), 'layer-1-invariants');
});

// 🔴 Without stripping fences, a `# comment` in a shell example becomes a valid
// anchor and a genuinely broken link passes.
test('a heading inside a code fence is not an anchor', () => {
  const text = ['# real', '', '```bash', '# not a heading', '```'].join('\n');
  assert.deepEqual(anchorsIn(text), ['real']);
});

test('inline code is not scanned either', () => {
  assert.equal(withoutCode('a `[x](./y.md)` b').includes('./y.md'), false);
});

test('relative links are found, absolute ones ignored', () => {
  const text = '[a](./x.md) [b](../y.md#z) [c](https://example.com/q.md)';
  const found = linksIn(text);
  assert.deepEqual(
    found.map((l) => l.path),
    ['./x.md', '../y.md'],
  );
  assert.equal(found[1].anchor, 'z');
});

// 🔴 The case rule, which is the reason this script exists: a link with the
// wrong case passes on Windows and is broken on Linux, where the CI runs.
test('a wrong case is detected against the real listing', () => {
  assert.equal(wrongCase('README.md', ['readme.md']), 'readme.md');
  assert.equal(wrongCase('README.md', ['README.md']), null);
  assert.equal(wrongCase('nope.md', ['other.md']), null);
});

test('a link with the wrong case is reported, not passed', () => {
  const found = resolveWithCase(join(REPO, 'x.md'), './LAYER1.md');
  assert.equal(found.ok, false);
  assert.match(found.why, /wrong case/);
  assert.match(found.why, /layer1\.md/);
});

test('a link to a file that is simply absent says so', () => {
  const found = resolveWithCase(join(REPO, 'x.md'), './nope.md');
  assert.equal(found.ok, false);
  assert.match(found.why, /no such file/);
});

test('a correct link resolves', () => {
  assert.equal(resolveWithCase(join(REPO, 'x.md'), './layer1.md').ok, true);
});

test('a broken anchor is caught', () => {
  const files = [
    { path: join(REPO, 'a.md'), text: '[x](./layer1.md#no-such-heading)' },
  ];
  const { problems } = check(files);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no heading gives the anchor/);
});

test('a real anchor passes', () => {
  const files = [
    { path: join(REPO, 'a.md'), text: '[x](./layer1.md#verification)' },
  ];
  assert.deepEqual(check(files).problems, []);
});
