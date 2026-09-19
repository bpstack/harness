#!/usr/bin/env node
// Removes what this harness put somewhere, and nothing else.
//
//   node bin/uninstall.mjs ../a-project            what would go
//   node bin/uninstall.mjs --apply ../a-project    take it out
//   node bin/uninstall.mjs --global --dest <folder> [--apply]
//
// **Dry-run by default**, like everything here that writes.
//
// 🔴 Why it exists: installing something you cannot remove turns a trial into
// a commitment. This is the inverse of `propagate` and of `sync-global`, and it
// leans on what those two already built: the block marks in a project, and
// the harness mark on every deployed agent and command.
//
// Two scopes, and they answer different questions:
//
//   · a project — the blocks between the marks leave the `AGENTS.md`, and
//     everything outside them stays byte for byte. The file itself is **never**
//     deleted: layer 3 was written by a person.
//   · --global — the agents and commands that carry the harness mark, the
//     files under `reference/` that this clone still ships, and the install
//     seal. What this harness cannot claim, it names and does not touch.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  readdirSync,
  rmdirSync,
} from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stripBlocks, CLEAN } from '../lib/uninstall.mjs';
import { outside } from '../lib/propagate.mjs';
import { SEAL, walk } from './sync-global.mjs';
import { MARK } from '../lib/dialects.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 'AGENTS.md';
const POINTER = 'CLAUDE.md';

// 🔴 Files this harness has a mould for but never generates: a person seeds
// them and then writes them. They are **never** removed — what is written in
// them is the project's — but they are named, so an uninstall does not leave
// material that came from here without saying so.
//
// ⚠️ **Derived from `templates/`, not written by hand.** The first version was
// a two-item array and was already missing four — `ci.yml`, `README.md`,
// `ROADMAP.md` and `TODO.md` — which the owner spotted, not a test. A list of
// this kind drifts the moment a mould is added and nothing notices, so a mould
// with no home declared below is **reported as unplaced** rather than silently
// skipped.
const MOULD_HOMES = {
  'ci.yml': ['.github/workflows/ci.yml'],
  'DECISIONS.md': ['docs/DECISIONS.md', 'DECISIONS.md'],
  'SESSION.md': ['docs/SESSION.md', 'SESSION.md'],
  'ROADMAP.md': ['docs/ROADMAP.md', 'ROADMAP.md'],
  'TODO.md': ['docs/TODO.md', 'TODO.md'],
  'README.md': ['README.md'],
};

// AGENTS.md and CLAUDE.md are handled on their own: they are the two this
// command actually changes.
const HANDLED = new Set([TARGET, POINTER]);

function mouldedFiles(dir) {
  const out = [];
  let moulds = [];
  try {
    moulds = readdirSync(join(REPO, 'templates'));
  } catch {
    return out;
  }
  for (const mould of moulds) {
    if (HANDLED.has(mould)) continue;
    const homes = MOULD_HOMES[mould];
    if (!homes) {
      out.push({ mould, unplaced: true });
      continue;
    }
    for (const rel of homes) {
      const path = join(dir, ...rel.split('/'));
      if (!existsSync(path)) continue;
      let same = false;
      try {
        same =
          readFileSync(path, 'utf8') ===
          readFileSync(join(REPO, 'templates', mould), 'utf8');
      } catch {
        // Unreadable is not a reason to fail an uninstall that will not touch
        // the file either way.
      }
      out.push({ mould, path, same });
    }
  }
  return out;
}

export function parseArgs(argv) {
  const dest = argv.includes('--dest')
    ? argv[argv.indexOf('--dest') + 1]
    : null;
  return {
    apply: argv.includes('--apply'),
    global: argv.includes('--global'),
    dest,
    paths: argv.filter((a, i) => {
      if (a.startsWith('--')) return false;
      return argv[i - 1] !== '--dest';
    }),
  };
}

// ── A project ────────────────────────────────────────────────────────────────

function planProject(dir) {
  const file = join(dir, TARGET);
  if (!existsSync(dir)) return { dir, absent: true };
  if (!existsSync(file)) return { dir, missing: true };

  const before = readFileSync(file, 'utf8');
  const result = stripBlocks(before);
  if (result.violation) return { dir, file, violation: result.violation };

  // 🔴 The promise, checked on the real file and not only in a test: what was
  // outside the marks is still there, byte for byte. `outside` replaces each
  // block with a placeholder, so removing those placeholders from the before
  // must give exactly the after — whitespace at the seams aside.
  const flat = (t) => String(t).replace(/\s+/g, ' ').trim();
  const kept = flat(
    outside(before)
      .replaceAll('⟦layer1⟧', '')
      .replaceAll('⟦layer2⟧', '')
      .replaceAll('⟦rules⟧', ''),
  );
  const safe = flat(result.next) === kept;

  // 🔴 `AGENTS.md` is not the only file that can carry a block. Measured on a
  // real repo on 2026-09-07: its `docs/SESSION.md` and `docs/DECISIONS.md` each
  // hold a `rules` block — a family this harness declares — and **neither
  // `propagate` nor this command looked at them**. So that block was never
  // updated and never removed: harness material living in a project with
  // nothing to maintain it and nothing to take it away.
  //
  // The rest of a moulded file is the project's, so only the block goes.
  const seeded = mouldedFiles(dir).map((f) => {
    if (f.unplaced || !existsSync(f.path)) return f;
    const text = readFileSync(f.path, 'utf8');
    const stripped = stripBlocks(text);
    if (stripped.violation) return { ...f, violation: stripped.violation };
    if (!stripped.removed.length) return f;
    return { ...f, next: stripped.next, removed: stripped.removed };
  });

  return {
    dir,
    file,
    next: result.next,
    removed: result.removed,
    action: result.action,
    safe,
    seeded,
    remain: result.next.split('\n').length - 1,
  };
}

export function renderProject(plans, { apply }) {
  const lines = [];
  for (const p of plans) {
    if (p.absent) {
      lines.push(`  ✖ GONE   ${p.dir} does not exist — check the path`);
      continue;
    }
    if (p.missing) {
      lines.push(`  none    ${p.dir} has no ${TARGET}: nothing of ours in it`);
      continue;
    }
    if (p.violation) {
      lines.push(
        `  REFUSED ${p.file}`,
        `          ${p.violation.reason}. Nothing written: its marks cannot be` +
          ` read one way only, and which one you meant is not this tool's to` +
          ` guess.`,
      );
      continue;
    }
    if (p.action === CLEAN) {
      lines.push(`  none    ${p.file} carries no block of ours`);
      continue;
    }
    if (!p.safe) {
      lines.push(
        `  REFUSED ${p.file}`,
        `          removing the blocks would change text outside them. This is` +
          ` the one thing this tool promises never to do, so it stops.`,
      );
      continue;
    }
    lines.push(
      `  strip   ${p.file}  [${p.removed.join(' + ')}]`,
      `          ${p.remain} lines remain, all of them yours`,
    );
    for (const f of p.seeded ?? []) {
      if (f.unplaced) {
        lines.push(
          `  ⚠️  the mould ${f.mould} has no home declared, so this command` +
            ` cannot say whether the project carries a copy of it`,
        );
        continue;
      }
      if (f.violation) {
        lines.push(
          `  REFUSED ${f.path}`,
          `          ${f.violation.reason}. Nothing written.`,
        );
        continue;
      }
      if (f.removed) {
        lines.push(
          `  strip   ${f.path}  [${f.removed.join(' + ')}]`,
          `          the block goes; the rest of the file is yours and stays`,
        );
        continue;
      }
      lines.push(
        `  keep    ${f.path} — from a mould of ours` +
          (f.same
            ? ', still identical to it'
            : ', but what is written in it is yours'),
      );
    }
  }

  lines.push(
    '',
    '🔴 AGENTS.md and CLAUDE.md are never deleted: only the layer 1 block',
    '   leaves AGENTS.md. What remains was written by a person, and CLAUDE.md',
    '   is what lets Claude Code keep reading it.',
  );
  if (!apply) {
    lines.push('', 'Dry run. Nothing removed. Add --apply to remove.');
  }
  return lines.join('\n');
}

// ── The global copy ──────────────────────────────────────────────────────────

// Where the installer writes agents and commands, for both tools.
const MARKED = [
  '.claude/agents',
  '.claude/commands',
  '.config/opencode/agents',
  '.config/opencode/commands',
];
const REFERENCE = '.claude/reference';

const at = (root, rel) => join(root, ...rel.split('/'));

// `reference/` in the destination holds this clone's `reference/` plus its
// `templates/` under `reference/templates/`.
function shippedHere(rel) {
  const [head, ...rest] = rel.split('/');
  if (head === 'templates' && existsSync(join(REPO, 'templates', ...rest))) {
    return true;
  }
  return existsSync(join(REPO, 'reference', ...rel.split('/')));
}

export function planGlobal(root) {
  const files = [];
  const spare = [];
  for (const dir of MARKED) {
    const abs = at(root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs).filter((n) => n.endsWith('.md'))) {
      const path = join(abs, name);
      // Without the mark it is someone's: not listed, not touched.
      if (readFileSync(path, 'utf8').includes(MARK)) files.push(path);
    }
  }
  const seal = existsSync(join(root, SEAL)) ? join(root, SEAL) : null;
  // 🔴 `reference/` cannot carry the mark (a CSV, a PDF), so only the seal
  // proves this harness put it there — without it, the paths may be another
  // install's (measured 2026-09-17: 28 files of the old harness). With it,
  // what this clone still ships goes; anything else is named and left.
  for (const rel of seal ? walk(at(root, REFERENCE)) : []) {
    (shippedHere(rel) ? files : spare).push(at(root, `${REFERENCE}/${rel}`));
  }
  if (!files.length && !seal) return { root, unclaimed: true };
  return { root, files, spare, seal };
}

export function renderGlobal(plan, { apply }) {
  if (plan.unclaimed) {
    return (
      `nothing of this harness at ${plan.root}: no install seal and no file\n` +
      'carrying its mark, so it removes nothing.'
    );
  }
  const lines = [`destination  ${plan.root}`, `${plan.files.length} to delete`];
  for (const f of plan.files) lines.push(`  · ${relative(plan.root, f)}`);
  if (plan.spare.length) {
    lines.push(
      '',
      `⚠️  ${plan.spare.length} under reference/ this harness no longer ships — left alone:`,
      ...plan.spare.map((f) => `  · ${relative(plan.root, f)}`),
    );
  }
  lines.push(
    '',
    'Agents and commands without the harness mark stay.' +
      (plan.seal ? ' The install seal goes last.' : ''),
  );
  if (!apply) lines.push('', 'Dry run. Nothing removed. Add --apply.');
  return lines.join('\n');
}

// Empty folders under `dir`, deepest first, and `dir` itself if it ends up
// empty. A folder holding anything at all is left alone.
function removeEmpty(dir) {
  if (!existsSync(dir)) return 0;
  let gone = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) gone += removeEmpty(join(dir, entry.name));
  }
  try {
    if (readdirSync(dir).length === 0) {
      rmdirSync(dir);
      gone += 1;
    }
  } catch {
    // Not being able to remove an empty folder is not a failure of the
    // uninstall: the files are gone, which is what was asked.
  }
  return gone;
}

if (process.argv[1] && process.argv[1].endsWith('uninstall.mjs')) {
  const {
    apply,
    global: isGlobal,
    dest,
    paths,
  } = parseArgs(process.argv.slice(2));

  if (isGlobal) {
    if (!dest) {
      console.log(
        'usage: node bin/uninstall.mjs --global --dest <folder> [--apply]\n' +
          '\n--dest is required, exactly as it is for sync-global: the folder to\n' +
          'clean is never assumed.',
      );
      process.exit(2);
    }
    const root = resolve(dest);
    const plan = planGlobal(root);
    console.log(renderGlobal(plan, { apply }));
    if (apply && !plan.unclaimed) {
      let removed = 0;
      for (const f of plan.files) {
        try {
          unlinkSync(f);
          removed += 1;
        } catch (e) {
          // Already absent is the goal, not a failure. Anything else is
          // reported and the pass keeps going: stopping half way is how an
          // uninstall leaves the mess it exists to prevent.
          if (e.code !== 'ENOENT')
            console.log(`⚠️  ${f} → ${e.code ?? e.message}`);
        }
      }
      // The seal goes last: while it exists, a run interrupted halfway can be
      // repeated and will remove what is left.
      if (plan.seal) unlinkSync(plan.seal);
      const dirs = [...MARKED, REFERENCE, '.claude/harness'].reduce(
        (n, d) => n + removeEmpty(at(root, d)),
        0,
      );
      console.log(
        `\n${removed} removed` +
          (plan.seal ? ', plus the install seal' : '') +
          (dirs ? `, and ${dirs} empty folder(s)` : '') +
          `, in ${root}.`,
      );
    }
    process.exit(0);
  }

  if (!paths.length) {
    console.log(
      'usage: node bin/uninstall.mjs [--apply] <project> [project...]\n' +
        '       node bin/uninstall.mjs --global --dest <folder> [--apply]',
    );
    process.exit(2);
  }

  const plans = paths.map((p) => planProject(resolve(p)));
  console.log(renderProject(plans, { apply }));

  const failed = plans.some((p) => p.absent || p.violation || p.safe === false);
  if (apply) {
    const done = [];
    for (const p of plans) {
      if (p.absent || p.missing || p.violation || p.safe === false) continue;

      // A moulded file carrying a block is stripped like the AGENTS.md is —
      // the block was ours, the rest of the file never was. This runs even
      // when the AGENTS.md itself had nothing left to remove.
      for (const f of p.seeded ?? []) {
        if (!f.removed || f.violation) continue;
        writeFileSync(f.path, f.next, 'utf8');
        done.push(f.path);
      }

      if (p.action === CLEAN) continue;
      writeFileSync(p.file, p.next, 'utf8');
      done.push(p.file);
    }
    console.log(
      done.length
        ? `\n${done.length} file(s) changed or removed:\n` +
            done.map((f) => `  · ${f}`).join('\n')
        : '\nNothing to remove.',
    );
  }
  process.exit(failed ? 1 : 0);
}
