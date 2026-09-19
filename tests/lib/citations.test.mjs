import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ruleTitles,
  citations,
  renderCitations,
} from '../../lib/citations.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAYER1 = readFileSync(join(REPO, 'layer1.md'), 'utf8');

test('reads every rule layer 1 declares, not almost every one', () => {
  const titles = ruleTitles(LAYER1);
  const declared = LAYER1.match(/^\d+\.\s+\*\*/gm).length;
  assert.equal(titles.size, declared);
  // 🔴 The regression this pins: rule 3's bold title wraps onto a second line,
  // and a `.`-based pattern dropped it while reporting a plausible 21.
  assert.match(titles.get(3), /credentials/);
});

test('a number past the end of the list is certain, not a suspicion', () => {
  const found = citations('We follow rule 26 here.', ruleTitles(LAYER1));
  assert.equal(found.length, 1);
  assert.equal(found[0].status, 'gone');
  assert.equal(found[0].today, null);
});

test('a valid number is a suspicion, and carries what it says today', () => {
  const titles = ruleTitles(LAYER1);
  const [c] = citations('As rule 13 requires.', titles);
  assert.equal(c.status, 'suspect');
  assert.equal(c.today, titles.get(13));
});

test('both languages, because migration is when this fires', () => {
  const found = citations('la regla 16 y las reglas 3', ruleTitles(LAYER1));
  assert.deepEqual(
    found.map((c) => c.n),
    [16, 3],
  );
});

test("what sits between the marks is the harness's own text", () => {
  const text =
    '<!-- layer1:start -->\nrule 21 says so\n<!-- layer1:end -->\nand rule 21 again';
  const found = citations(text, ruleTitles(LAYER1));
  // Only the one outside. Flagging the harness's own correct citations would
  // teach the reader to skip the report.
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 4);
});

test('the old Spanish marks are owned too', () => {
  const text = '<!-- capa1:inicio -->\nla regla 21\n<!-- capa1:fin -->';
  assert.deepEqual(citations(text, ruleTitles(LAYER1)), []);
});

test('the line number points at the citation', () => {
  const [c] = citations('a\nb\nc\nrule 7 here', ruleTitles(LAYER1));
  assert.equal(c.line, 4);
});

test('nothing found prints nothing', () => {
  assert.deepEqual(renderCitations([], 'AGENTS.md'), []);
});

test('the report says it changed nothing, and names the file', () => {
  const out = renderCitations(
    citations('rule 26 and rule 13', ruleTitles(LAYER1)),
    'AGENTS.md',
  ).join('\n');
  assert.match(out, /^ {2}⚠️ {2}AGENTS\.md cites 2 rules by number/m);
  assert.match(out, /^ {6}🔴 line 1: "rule 26"$/m);
  assert.match(out, /^ {9}no rule carries that number any more\.$/m);
  assert.match(out, /^ {6}🔴 Nothing was changed: that prose is yours\.$/m);
});

test('a long rule title is cut so the number stays on screen', () => {
  const out = renderCitations(
    citations('rule 3 here', ruleTitles(LAYER1)),
    'AGENTS.md',
  ).join('\n');
  assert.match(out, /…$/m);
  for (const line of out.split('\n')) assert.ok(line.length <= 80, line);
});

test('the five citations a real repo carried are all reported', () => {
  // Measured on 2026-09-08 while migrating a real project: four
  // valid numbers meaning something else, and one cut away. A check that only
  // caught the high number would have found one of five.
  const prose = 'la regla 4, la regla 16 dos veces: regla 16, y la regla 26.';
  const found = citations(prose, ruleTitles(LAYER1));
  assert.deepEqual(
    found.map((c) => c.n),
    [4, 16, 16, 26],
  );
  assert.equal(found.filter((c) => c.status === 'suspect').length, 3);
});
