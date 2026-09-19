// A rule cited by number goes stale the day the numbering moves, and nothing
// says so. Layer 1 went from 33 rules to 22, and a real project's own prose
// kept **five** citations pointing elsewhere — one of them holding up a
// declared exception on a rule that no longer exists.
//
// 🔴 This reports. It never rewrites. The citation lives in the project's own
// prose, outside the marks, and the one rule `propagate` does not break is
// that only the owner deletes a line of theirs.

import { scanMarks } from './marks.mjs';

// Both languages: a project written before the harness moved to English cites
// `regla N`, and the migration is exactly when this has to fire.
const CITATION = /\b(?:rules?|reglas?)\s+(\d{1,3})\b/gi;

// The rules as layer 1 numbers them today: `1. **Verify before asserting.**`
//
// ⚠️ `.` would not do, and the first draft used it: **a rule's bold title can
// wrap onto a second line** once the formatter has been near it. That read 21
// of 22 and said nothing — the one it dropped being rule 4, on credentials.
export function ruleTitles(layer1) {
  const out = new Map();
  for (const m of String(layer1).matchAll(/^(\d+)\.\s+\*\*([\s\S]+?)\*\*/gm)) {
    out.set(Number(m[1]), m[2].replace(/\s+/g, ' ').trim());
  }
  return out;
}

// The spans the harness owns. Anything inside them is the harness's own text
// and its citations are correct by construction — flagging them would train
// the reader to ignore the report.
function ownedSpans(text) {
  const spans = [];
  const marks = scanMarks(text);
  let open = null;
  for (const m of marks) {
    if (m.opener) open = m;
    else if (open) {
      spans.push([open.index, m.index + m.length]);
      open = null;
    }
  }
  return spans;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

// `gone` is a certainty: that number is past the end of the list, so the rule
// it named was cut. `suspect` is not — the number is valid and may well be
// right. **The suspects are the valuable half**: the five found in a real repo
// were 4, 16, 16 and 26, and a check that only caught the high one would have
// found one of five.
export function citations(text, titles) {
  const spans = ownedSpans(text);
  const inside = (i) => spans.some(([a, b]) => i >= a && i < b);
  const highest = Math.max(0, ...titles.keys());
  const out = [];
  for (const m of String(text).matchAll(CITATION)) {
    if (inside(m.index)) continue;
    const n = Number(m[1]);
    if (n < 1) continue;
    out.push({
      n,
      line: lineOf(text, m.index),
      quote: m[0],
      status: n > highest ? 'gone' : 'suspect',
      today: titles.get(n) ?? null,
    });
  }
  return out;
}

// Enough of the rule to recognise it, not the rule itself.
function short(title) {
  return title.length > 52 ? title.slice(0, 51).trimEnd() + '…' : title;
}

// 🔴 The rule of the day goes on its own line, indented under the citation.
// Inline it overflowed 80 columns, and what scrolled off was the half that
// matters: the line number and the quote.
export function renderCitations(found, file) {
  if (!found.length) return [];
  const gone = found.filter((c) => c.status === 'gone').length;
  const lines = [
    '',
    `  ⚠️  ${file} cites ${found.length} rule${found.length > 1 ? 's' : ''} by number, outside the marks.`,
  ];
  for (const c of found) {
    lines.push(
      `      ${c.status === 'gone' ? '🔴' : '· '} line ${c.line}: "${c.quote}"`,
    );
    lines.push(
      c.status === 'gone'
        ? '         no rule carries that number any more.'
        : `         today rule ${c.n} is: ${short(c.today)}`,
    );
  }
  lines.push(
    gone
      ? `      ${gone} of those is certain. The rest may well be right — the number`
      : '      These may all be right — the number',
    '      is valid, so only you can say if it still means what you wrote.',
    '      🔴 Nothing was changed: that prose is yours.',
  );
  return lines;
}
