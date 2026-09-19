// Vocabulary guard: the words an ADR chose against, and **cuts `verify`** when
// one comes back.
//
// 🔴 The risk is not translating badly, it is **terminology drifting between
// sessions**. Every session that meets a concept without an arbiter picks its
// own word, and the file that results reads as if two people wrote it. It has
// already happened once in this family: five identifiers went in the wrong
// language and **no tool caught them** — a human reading did.
//
// 📐 **What is scanned, and what deliberately is not.** Measured across this
// repo on 2026-09-08, before writing a line of it:
//
//   · **rejected alternatives** (`mold`, `watchdog`, `sync-drift`…) — 0 hits,
//     and no false-positive risk: they are not ordinary words here, they are
//     options a decision ruled out. **This is what the guard scans.**
//   · **the Spanish source terms** (`capa1`, `reglas`, `inicio`…) — 7 files,
//     and **every one of them legitimate**: `lib/marks.mjs` holds them on
//     purpose, because reading an old mark means knowing its old key, and the
//     tests carry fixtures with those marks. Scanning them would fire on the
//     one file that must contain them.
//   · **the chosen terms** (`mark`, `block`, `plan`, `case`) — never scanned.
//     They are the right answer and they are everywhere.
//
// ⚠️ So a term earns its place here by having been **rejected in writing**, not
// by being foreign. The arbiter is the glossary in the private notebook; this
// file is the half that can be executed, and it is deliberately shorter.

import { readFileSync } from 'node:fs';
import { relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { walk } from './leak-guard.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

// Each entry: the word ruled out, and the word that won. The second half is
// what makes a finding actionable — a guard that only says "no" sends you to
// look up why somewhere else.
export const REJECTED = [
  ['mold', 'template', 'a mould and a template are the same thing here'],
  [
    'watchdog',
    'guard',
    'these run inside `verify` once, not in the background',
  ],
  [
    'sync-drift',
    'drift',
    'a shared root makes `drift` mean nothing on its own',
  ],
  ['node-drift', 'unmanaged', 'a Node the version manager does not manage'],
  ['version-drift', 'outdated', 'a module outside its declared range'],
];

// 🔴 Third-party text is not ours to police. The security reference is OWASP's
// wording, and rewriting it to match our vocabulary would make it stop being a
// quotation — which is the whole reason `security` may cite it.
const SKIP = ['reference/security'];

export function scanVocabulary(text, rejected = REJECTED) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const [word, chosen, why] of rejected) {
      // Word boundaries on both sides: without them `mold` matches inside
      // `moulded`, and worse, a substring hit reads as a real finding.
      if (new RegExp(`\\b${word}\\b`, 'i').test(line))
        out.push({ line: i + 1, word, chosen, why });
    }
  });
  return out;
}

export function report(findings) {
  if (!findings.length)
    return { text: '✔ vocabulary: no word an ADR ruled out.', failed: false };
  const lines = [`✖ ${findings.length} word(s) an ADR ruled out:`];
  for (const f of findings)
    lines.push(
      `  · ${f.file}:${f.line} — \`${f.word}\` → \`${f.chosen}\`, ${f.why}`,
    );
  lines.push(
    '',
    'The arbiter is the glossary; changing one takes an ADR, not an edit.',
  );
  return { text: lines.join('\n'), failed: true };
}

if (process.argv[1] && process.argv[1].endsWith('vocabulary-guard.mjs')) {
  const findings = [];
  for (const file of walk(REPO)) {
    const rel = relative(REPO, file).split('\\').join('/');
    if (SKIP.some((s) => rel.startsWith(s))) continue;
    // This file names every rejected word by definition.
    if (rel === 'bin/vocabulary-guard.mjs') continue;
    if (rel === 'tests/bin/vocabulary-guard.test.mjs') continue;
    for (const hit of scanVocabulary(readFileSync(file, 'utf8')))
      findings.push({ ...hit, file: rel });
  }
  const { text, failed } = report(findings);
  console.log(text);
  process.exit(failed ? 1 : 0);
}
