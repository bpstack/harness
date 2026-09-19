// Marks guard: walks a project's files and answers two questions.
//
//   node bin/marks-guard.mjs <project> [project...]
//
// 1. **Is there a mark family nobody manages?** A block wrapped in an unknown
//    family is an orphan: the harness will not update it and the project will
//    assume it is being updated. That **cuts the run**.
// 2. **How much of the old language is left?** Marks migrate as files are
//    touched, so the Spanish reader can be deleted when this reaches zero —
//    on a number, not on a date.
//
// Reporting only, for the second: a repo still carrying old marks is not
// broken, it just has not been passed over yet.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import {
  scanMarks,
  unknownFamilies,
  FAMILIES,
  RETIRED,
} from '../lib/marks.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', '.next', 'coverage']);
const TEXT = /\.(md|mjs|js|json|yml|yaml|ts|tsx|astro)$/i;

// ⚠️ Test files are skipped, and the reason is not convenience: a test for
// this guard has to contain an invented family and an old-language mark, or it
// cannot prove the guard fires. Scanning them made the guard report its own
// fixtures as orphans on its first run against this repo. What is excluded is
// narrow — the `.test.` suffix — so a real mark cannot hide behind it.
const FIXTURE = /\.test\.[a-z]+$/i;

// ⚠️ Not just Markdown. Counting only `*.md` would miss a mark in any other
// kind of file entirely.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT.test(entry) && !FIXTURE.test(entry)) out.push(full);
  }
  return out;
}

export function survey(files) {
  const unknown = new Map(); // key → [where]
  const spanish = [];
  let total = 0;

  for (const { path, text } of files) {
    const marks = scanMarks(text);
    total += marks.length;
    for (const key of unknownFamilies(text)) {
      if (!unknown.has(key)) unknown.set(key, []);
      unknown.get(key).push(path);
    }
    for (const mark of marks) {
      if (mark.language === 'es') spanish.push({ path, key: mark.key });
    }
  }
  return { unknown, spanish, total };
}

export function report({ unknown, spanish, total }, { scanned }) {
  const lines = [`${scanned} files scanned, ${total} marks found.`];

  if (unknown.size) {
    lines.push('', `✖ ${unknown.size} unknown mark family:`);
    for (const [key, where] of unknown) {
      // A family this harness used to manage gets named as such. "Unknown" is
      // true and useless when the real answer is "we retired it, and here is
      // what that means for your file".
      const retired = RETIRED[key]
        ? ' — RETIRED by this harness, see below'
        : '';
      lines.push(
        `  · '${key}' in ${where.length} file(s)${retired} — e.g. ${where[0]}`,
      );
    }
    lines.push(
      '',
      `   Known families: ${FAMILIES.join(', ')}.`,
      '   A block nobody manages is an orphan: the harness will not update it',
      '   and the project will assume otherwise. Rename it or add the family.',
    );
    if ([...unknown.keys()].some((key) => RETIRED[key])) {
      lines.push(
        '',
        '   🔴 The repairs family was retired on 2026-09-06: it was declared',
        '   and nothing ever wrote it. Nothing of yours is lost — that block is',
        '   now ordinary project text, and every pass preserves it byte for',
        '   byte like the rest of your file. To clear this message, delete the',
        '   two marker lines by hand and keep or drop the text between them as',
        '   you see fit. It will not come back.',
      );
    }
  }

  if (spanish.length) {
    const files = new Set(spanish.map((s) => s.path)).size;
    lines.push(
      '',
      `⏳ ${spanish.length} mark(s) still in the old language, in ${files} file(s).`,
      '   They migrate as the harness passes over each file. The old reader',
      '   can be deleted when this reaches zero — on the number, not a date.',
    );
  } else if (total > 0) {
    lines.push('', '✔ no marks left in the old language.');
  }

  return { text: lines.join('\n'), failed: unknown.size > 0 };
}

if (process.argv[1] && process.argv[1].endsWith('marks-guard.mjs')) {
  const paths = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const roots = paths.length ? paths : ['.'];

  const files = [];
  for (const p of roots) {
    const dir = resolve(p);
    if (!existsSync(dir)) {
      console.log(`${dir} does not exist.`);
      process.exit(1);
    }
    for (const file of walk(dir)) {
      files.push({
        path: relative(process.cwd(), file).split(sep).join('/'),
        text: readFileSync(file, 'utf8'),
      });
    }
  }

  const { text, failed } = report(survey(files), { scanned: files.length });
  console.log(text);
  process.exit(failed ? 1 : 0);
}
