#!/usr/bin/env node
// Propagates the layers into the repos that carry a copy of them.
//
//   node bin/propagate.mjs ../a-project ../another
//   node bin/propagate.mjs --apply ../a-project
//
// **Dry-run by default**, and here with more reason than usual: it touches
// files in N repos at once. Nothing is written without `--apply`.
//
// 🔴 Only what sits between the marks changes. What is outside belongs to the
// project and must come out byte for byte identical — checked by the tests
// **and again here, on the real file, right before writing**. A promise that
// lives only in a test does not protect against the case the test never
// imagined.
//
// Only effects live here. The calculation is in `lib/propagate.mjs`.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  plan,
  planRemoval,
  summarize,
  UPDATE,
  GRAFT,
  SKIP,
} from '../lib/propagate.mjs';
import { detectPackageManager, servesRepo } from '../lib/detect.mjs';
import { formatterFor } from '../lib/format.mjs';
import { ruleTitles, citations, renderCitations } from '../lib/citations.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

// The file every project carries. `CLAUDE.md` is a pointer, never a copy, so
// it is deliberately not in this list.
const TARGET = 'AGENTS.md';

export function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const paths = argv.filter((a) => !a.startsWith('--'));
  return { apply, paths };
}

function layer1Body() {
  const raw = readFileSync(join(REPO, 'layer1.md'), 'utf8');
  const i = raw.indexOf('\n---\n');
  if (i === -1) throw new Error('layer1.md carries no separator');
  return raw.slice(i + 5).trim();
}

// Whether this harness writes into that repo at all. Rule 10 is an invariant,
// so a repo on another manager is skipped rather than handed rules it breaks
// on every command — and skipped, not fatal: one such repo must not abort a
// sweep over twenty.
function servingOf(dir) {
  const pkgFile = join(dir, 'package.json');
  let pkg = null;
  try {
    if (existsSync(pkgFile)) pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
  } catch {
    pkg = null;
  }
  const { manager } = detectPackageManager({ files: readdirSync(dir), pkg });
  return servesRepo({ manager });
}

function collect(paths) {
  const files = [];
  const missing = [];
  const absent = [];
  const skipped = [];
  const harness = [];
  for (const p of paths) {
    const dir = resolve(p);
    const file = join(dir, TARGET);
    // 🔴 A path that does not exist is a typo, not a repo without an
    // AGENTS.md, and they used to print the same benign line and exit 0. In a
    // sweep over twenty repos a mistyped one looked like an ordinary outcome:
    // the tool reported having considered a folder that was never there.
    if (!existsSync(dir)) {
      absent.push(dir);
      continue;
    }
    // The harness is not a project: its own AGENTS.md is written by hand.
    if (dir === resolve(REPO)) {
      harness.push(dir);
      continue;
    }
    if (!existsSync(file)) {
      missing.push(dir);
      continue;
    }
    const serving = servingOf(dir);
    if (!serving.serves) {
      skipped.push({ dir, manager: serving.manager });
      continue;
    }
    files.push({
      path: file,
      text: readFileSync(file, 'utf8'),
    });
  }
  return { files, missing, absent, skipped, harness };
}

const LABEL = { [UPDATE]: 'update', [GRAFT]: 'graft ', [SKIP]: 'ok    ' };

export function render(
  results,
  missing,
  { apply, skipped = [], absent = [], harness = [] },
) {
  const lines = [];
  for (const r of results) {
    const tag = r.violation ? 'REFUSED' : LABEL[r.action];
    const note =
      (r.removed ? '  (removes the stack layer 2)' : '') +
      (r.migrates ? '  (migrates from the old language)' : '');
    lines.push(`  ${tag}  ${r.path}${note}`);
    if (r.violation) {
      lines.push(
        r.violation.reason
          ? `          ${r.violation.reason}. Nothing written: its marks cannot` +
              ` be read one way only, and which one you meant is not this` +
              ` tool's to guess.`
          : `          text outside the marks would change at ${r.violation.at}`,
      );
    }
  }
  for (const m of missing)
    lines.push(
      `  none    ${m} has no ${TARGET}: not harnessed, use /init-project`,
    );
  for (const h of harness) lines.push(`  REFUSED ${h} is the harness itself`);
  for (const a of absent)
    lines.push(`  ✖ GONE   ${a} does not exist — check the path`);
  for (const s of skipped) {
    lines.push(
      `  SKIP    ${s.dir} declares ${s.manager}; this harness sets up pnpm`,
    );
  }

  const s = summarize(results);
  lines.push(
    '',
    `${s.update} to update, ${s.graft} to graft, ${s.skip} already current` +
      (s.migrates ? `, ${s.migrates} migrating language` : ''),
  );
  if (s.unsafe) {
    lines.push(
      `🔴 ${s.unsafe} REFUSED: writing would change text outside the marks.`,
      '   Nothing was written for those, with or without --apply.',
    );
  }
  if (!apply) lines.push('', 'Dry run. Nothing written. Add --apply to write.');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('propagate.mjs')) {
  const { apply, paths } = parseArgs(process.argv.slice(2));
  if (!paths.length) {
    console.log('usage: node bin/propagate.mjs [--apply] <repo> [repo...]');
    process.exit(2);
  }

  const { files, missing, absent, skipped, harness } = collect(paths);

  // Layer 1 first, then the stack layer 2 is taken out of the result,
  // so one pass produces one write per file rather than two.
  const body = layer1Body();
  const results = [];
  const notices = [];
  for (const file of files) {
    // 🔴 Each block goes with the format its own repo declares, not with this
    // one's. Two destinations, two formats, one source.
    const { format, hadConfig } = await formatterFor(file.path, (why) =>
      notices.push(
        `${file.path}: its Prettier config cannot be applied from here ` +
          `(${why}). The block goes with this repo's format: if the project's ` +
          `own \`format\` reaches this file, its \`format:check\` will turn red`,
      ),
    );
    const formatted = async (t) =>
      t && hadConfig ? (await format(t)).trim() : t;

    const [first] = plan([file], 'layer1', await formatted(body));
    const gone = first.violation ? null : planRemoval(first.next, 'layer2');
    results.push({
      ...first,
      next: gone?.next ?? first.next,
      removed: gone?.removed ?? false,
      // A removal alone is still a change to the file.
      action: first.action === SKIP && gone?.removed ? UPDATE : first.action,
      violation: first.violation ?? gone?.violation ?? null,
    });
  }

  console.log(render(results, missing, { apply, skipped, absent, harness }));
  for (const line of notices) console.log(`⚠️  ${line}`);

  // 🔴 Migrating a repo is exactly when a rule cited by number goes stale, and
  // until 2026-09-08 nothing said so: layer 1 went from 33 rules to 22, and a
  // real project kept five citations pointing elsewhere — one of them holding
  // up a declared exception on a rule that had been cut. This reports and
  // stops there; the prose is the project's.
  const titles = ruleTitles(readFileSync(join(REPO, 'layer1.md'), 'utf8'));
  for (const file of files) {
    const found = citations(file.text, titles);
    for (const line of renderCitations(found, file.path)) console.log(line);
  }

  // 🔴 The layers just written name two files this command never creates —
  // only `init-project` does. So a project that was only ever propagated can
  // lack both.
  //
  // It is the defect fixed on 2026-09-07 one floor along: the generated file
  // cited the decisions document and nothing wrote it. Layer 1 cites it too,
  // and here nothing wrote it either. Found on 2026-09-08 by comparing a
  // grafted branch against an initialised one.
  //
  // ⚠️ Reported, never created. Updating a block a repo already had is one
  // thing; adding files to someone else's tree is another, and a deliberate
  // ignore is a legitimate answer — measured on a public repo that keeps its
  // `CLAUDE.md` out of git on purpose.
  for (const r of results.filter((x) => x.action !== SKIP)) {
    const dir = dirname(r.path);
    const gone = [
      !existsSync(join(dir, 'CLAUDE.md')) && [
        'CLAUDE.md',
        'the pointer to `AGENTS.md`, and **without it Claude Code reads none of what was just ' +
          'written** — the repo looks harnessed and is invisible to the tool ' +
          'it was harnessed for',
      ],
      !existsSync(join(dir, 'docs', 'DECISIONS.md')) && [
        'docs/DECISIONS.md',
        'rule 13, which the layers you just wrote point at — a rule citing a ' +
          'file that does not exist teaches that the citations are decoration',
      ],
    ].filter(Boolean);
    if (!gone.length) continue;
    console.log(`\n🔴 ${dir} — the layers name what nothing here creates:`);
    for (const [name, why] of gone) console.log(`  · ${name} — ${why}`);
    console.log(
      '  Moulds are in `~/.claude/reference/templates/`. **Offer them; do not\n' +
        '  write them.** A repo that ignores one on purpose has already answered.',
    );
  }

  // A path that is not there is a failure of the invocation, not an outcome:
  // it exits non-zero so a sweep cannot swallow a typo.
  const failed =
    results.some((r) => r.violation) || absent.length > 0 || harness.length > 0;
  if (apply) {
    // 🔴 Counted while writing, not taken from the plan above. Until
    // 2026-09-07 an `--apply` differed from a dry run only by the absence of
    // the "nothing written" line, so a run that touched N repos looked exactly
    // like one that touched none. Reprinting the plan's own numbers would
    // repeat that mistake one step later: what belongs here is what the disk
    // actually took.
    const written = [];
    for (const r of results) {
      if (r.violation || r.action === SKIP) continue;
      writeFileSync(r.path, r.next, 'utf8');
      written.push(r.path);
    }
    console.log(
      written.length
        ? `\n${written.length} written:\n` +
            written.map((p) => `  · ${p}`).join('\n')
        : '\nNothing to write: every file was already current.',
    );
  }
  process.exit(failed ? 1 : 0);
}
