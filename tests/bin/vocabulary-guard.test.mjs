// What the guard finds and, just as much, what it leaves alone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanVocabulary,
  report,
  REJECTED,
} from '../../bin/vocabulary-guard.mjs';

test('🔴 a word an ADR ruled out is found, with the word that won', () => {
  const found = scanVocabulary('the mold lives in templates/\n');
  assert.equal(found.length, 1);
  assert.equal(found[0].word, 'mold');
  assert.equal(found[0].chosen, 'template');
  assert.equal(found[0].line, 1);
});

// 🔴 Without boundaries `mold` matches inside `moulded` and `remodel`, and a
// substring hit reads exactly like a real finding — which is how a guard
// teaches you to skim past it.
test('🔴 it matches whole words, not substrings', () => {
  assert.deepEqual(scanVocabulary('remodelled, moulded, smoldering\n'), []);
});

// The other half, and the one that decides whether this is worth having: the
// chosen words are everywhere and must never be reported.
test('the words that won are never reported', () => {
  const text = 'the template, the guard, the drift, the mark, the block\n';
  assert.deepEqual(scanVocabulary(text), []);
});

// 📐 Measured before this guard existed: the Spanish source terms appear in
// seven files and **every one is legitimate** — `lib/marks.mjs` holds them
// because reading an old mark means knowing its old key. They are deliberately
// not in the list, and this asserts that decision rather than leaving it to
// whoever reads the array next.
test('🔴 the Spanish source terms are deliberately not scanned', () => {
  const words = REJECTED.map(([w]) => w);
  for (const spanish of ['capa1', 'capa2', 'reglas', 'inicio', 'fin'])
    assert.ok(!words.includes(spanish), `${spanish} would fire on marks.mjs`);
  assert.deepEqual(scanVocabulary('const LEGACY = { capa1: "layer1" };\n'), []);
});

test('a clean run says so rather than staying quiet', () => {
  const { text, failed } = report([]);
  assert.equal(failed, false);
  assert.match(text, /no word an ADR ruled out/);
});

test('a finding cuts, and says where to change it', () => {
  const { text, failed } = report([
    { file: 'a.md', line: 3, word: 'watchdog', chosen: 'guard', why: 'x' },
  ]);
  assert.equal(failed, true);
  assert.match(text, /a\.md:3/);
  assert.match(text, /takes an ADR, not an edit/);
});
