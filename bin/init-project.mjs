#!/usr/bin/env node
// Writes a project's first AGENTS.md: a title and layer 1 between its marks,
// and nothing else — the rest is the project's to write.
//
//   node bin/init-project.mjs ../a-project
//   node bin/init-project.mjs --apply ../a-project
//
// **Dry-run by default.** Nothing is written without `--apply`.
//
// 🔴 It does not overwrite an existing AGENTS.md. When one is already there,
// this refreshes layer 1 in place and removes a stack layer 2 — the same plan
// `propagate` uses — and leaves everything outside the marks byte for byte
// identical. That file is the project's, and a generator that replaces it
// destroys the one section nobody can regenerate — what the model gets wrong
// with *this* code. The rest of the flow (foundations, CLAUDE.md,
// docs/DECISIONS.md, skills) still runs: an existing AGENTS.md is not a
// reason to skip them.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  lstatSync,
} from 'node:fs';
import { join, dirname, resolve, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { formatterFor } from '../lib/format.mjs';
import {
  plan,
  planRemoval,
  renderBlock,
  SKIP,
  UPDATE,
  GRAFT,
} from '../lib/propagate.mjs';
import { foundations, readCi } from '../lib/foundations.mjs';
import { ruleTitles, citations, renderCitations } from '../lib/citations.mjs';
import { detectPackageManager, servesRepo } from '../lib/detect.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

// Directories a sweep of someone else's repo has no business entering. They are
// large, they are not theirs, and a `CLAUDE.md` inside one is not a rule of this
// project.
const NOT_OURS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

// Every `CLAUDE.md` below the root, which is the one the migration never
// touches. Returned as paths relative to the root, sorted, so the report reads
// the same on two machines.
export function nestedClaudeFiles(root, readdir = readdirSync) {
  const out = [];
  const walk = (sub) => {
    let entries;
    try {
      entries = readdir(join(root, ...sub), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (NOT_OURS.has(entry.name) || entry.name.startsWith('.')) continue;
        walk([...sub, entry.name]);
      } else if (entry.name === 'CLAUDE.md' && sub.length) {
        out.push([...sub, entry.name].join('/'));
      }
    }
  };
  walk([]);
  return out.sort();
}

// Comments that talk about a template itself must not reach the project: a
// generated file explaining how templates work is material about the tool
// sitting inside someone else's repo.
export function stripTemplateOnly(text) {
  return String(text).replace(/<!--\s*template-only:[\s\S]*?-->\n*/g, '');
}

export function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    path: argv.find((a) => !a.startsWith('--')) ?? null,
  };
}

function readPkg(dir) {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    // A broken package.json is the project's problem, not a reason to crash:
    // detection simply has one less signal.
    return null;
  }
}

function layer1Body() {
  const raw = readFileSync(join(REPO, 'layer1.md'), 'utf8');
  const i = raw.indexOf('\n---\n');
  if (i === -1) throw new Error('layer1.md carries no separator');
  return raw.slice(i + 5).trim();
}

// Which of the files we are about to write does git already ignore. Asked of
// **git**, never of `.gitignore`: the pattern that hides a file can come from a
// parent directory, from `.git/info/exclude` or from the global config, and
// none of those is in the file people open to check.
//
// 🔴 A harness written into an ignored path is the quietest failure there is.
// The file is on this machine, so nothing here breaks and nobody suspects; on
// the next clone it is simply absent, with no error either. Measured on a real
// repo on 2026-09-08: the generator reported writing `CLAUDE.md` and `git
// status` never listed it — and `CLAUDE.md` is the one file without which
// Claude Code reads none of the harness.
//
// 🔴 `-v` prints negation patterns too, **and returns exit 0 with them**. A
// file re-included by `!/docs/DECISIONS.md` under a `/docs/*` was therefore
// reported as ignored, and the warning survived fixing the very thing it
// denounced. A warning that does not go away when obeyed teaches you to ignore
// every other one.
// ⚠️ The paths go in **relative and with forward slashes**, because git echoes
// back the pathname it was given: an absolute Windows one comes back wrapped in
// quotes, and everything downstream then reads a quote as part of the name.
// Caught by the test written for this guard, not by running it.
export function ignoredAmong(dir, dests, run = spawnSync) {
  if (!dests.length) return [];
  const rels = dests.map((d) => relative(dir, d).split(sep).join('/'));
  const r = run('git', ['check-ignore', '-v', '--no-index', '--', ...rels], {
    cwd: dir,
    encoding: 'utf8',
  });
  // 0 = something is ignored · 1 = nothing is · 128 = not a git repo.
  if (r.error || r.status !== 0) return [];
  return (r.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [source, dest] = line.split('\t');
      // The pattern is whatever follows `file:line:`, rejoined because a
      // pattern may itself contain a colon.
      return { dest, source, pattern: source.split(':').slice(2).join(':') };
    })
    .filter((i) => i.dest && !i.pattern.startsWith('!'));
}

// A `CLAUDE.md` is a pointer when it **imports** `AGENTS.md` with `@`. Content
// specific to Claude Code may sit below it — the mould says so — and the file is
// still a pointer. What does not count is the `@` being absent, because then it
// imports nothing.
//
// 🔴 Length is not the test. A seven-line file saying "read AGENTS.md before
// doing anything" is prose, not an import: measured once, the pointer reached
// the session and `AGENTS.md` did not, and the whole session ran without it.
// **Short is not the same as pointer.**
export function isPointer(text) {
  return /^\s*@AGENTS\.md\s*$/m.test(String(text));
}

// Whether this is still the pointer as we write it, compared with whitespace
// normalised rather than byte for byte: the file is written with the
// destination's formatter, so two projects with different settings both hold an
// untouched pointer that differs in bytes. One line added by the owner survives
// the normalisation and answers false, which is what makes the silence safe.
function isUntouchedPointer(text) {
  const canon = (s) => String(s).replace(/\s+/g, ' ').trim();
  return canon(text) === canon(POINTER_TEXT);
}

// The whole `CLAUDE.md` this command writes: one line, and nothing else.
// Written as is — cleaning the template left a blank line behind.
const POINTER_TEXT = '@AGENTS.md\n';

// What is wrong with a `CLAUDE.md` that already exists. Only an existing one:
// the file this run creates is born a one-line pointer, inside the repo.
//
// 🔴 The damage of a non-pointer is not the duplication, it is the asymmetry.
// `CLAUDE.md` is read only by Claude Code; `AGENTS.md` is the standard every
// other tool reads. Two files that drift do not error — they make the repo
// behave differently depending on which harness opened it.
//
// 🔴 **Two problems, two prices, and the warning keeps them apart.** The missing
// import costs one line and moves nothing; migrating the rules out is someone
// else's content and needs their say-so. Stated as one thing, it reads as
// all-or-nothing — and measured on 2026-09-17, a repo answered that by
// declaring a standing exception against the import, keeping prose the import
// never threatened and losing `AGENTS.md` to every Claude Code session for six
// weeks.
export function pointerWarnings({ text, isSymlink, versioned }) {
  const out = [];
  if (isSymlink) {
    out.push(
      '`CLAUDE.md` is a symbolic link. Where git cannot create one — Windows ' +
        'without developer mode — it materialises **a text file containing the ' +
        'path**, which the harness then reads as its whole ruleset: no error, ' +
        'no warning. A real one-line file does the same job everywhere.',
    );
  }
  if (text !== null && !isPointer(text)) {
    out.push(
      '`CLAUDE.md` has no `@AGENTS.md` line, so **`AGENTS.md` does not ' +
        'reach a Claude Code session at all** — everything layer 1 writes ' +
        'there is invisible to the tool it was written for. **The fix is one ' +
        'line at the top of `CLAUDE.md`, and it moves nothing**: content ' +
        'specific to Claude Code may stay below it and the file is still a ' +
        'pointer. Offer that first and on its own. Moving the rules out is a ' +
        'separate question with a separate price — show the move whole, get ' +
        'it authorised, write into `AGENTS.md` first, confirm it landed, and ' +
        'only then shrink this one; what migrates goes at the end, under a ' +
        'heading naming where it came from, or a second run migrates it again.',
    );
  }
  // ⚠️ Only alongside a migration, which is the deliberate narrowing here: the
  // point of this warning is that **moving content publishes it**, so on a file
  // that is already a pointer there is nothing to move and saying it is noise.
  // A proper pointer carrying a Claude-specific note under it is the common
  // case, and warning about that one teaches you to skip the warning that
  // matters.
  if (text !== null && !isPointer(text) && versioned === false) {
    out.push(
      '`CLAUDE.md` is not in git, so its content has never left this machine. ' +
        'Moving it into `AGENTS.md` puts it in the repository. **Ask whether ' +
        'the repo is public — do not look it up**, the owner knows, and a ' +
        'failed lookup reads as "private". There is a fourth exit and it is ' +
        'usually the right one: **split it in two**.',
    );
  }
  return out;
}

export function report({
  dir,
  manager,
  apply,
  missing = [],
  checked = 0,
  skipped = 0,
  nested = [],
  existed = false,
  layerAction = SKIP,
  layerMigrates = false,
  layerRemoves = false,
  layerViolations = [],
}) {
  const lines = [
    `project   ${basename(dir)}`,
    `manager   ${manager.manager ?? 'none'} — ${manager.evidence}`,
  ];

  // 🔴 Only printed once the file already existed: on a first write there is
  // no "before" to compare against, and the action is always the same —
  // there being nothing to graft onto or update.
  if (existed) {
    const label = layerViolations.length
      ? 'REFUSED'
      : { [SKIP]: 'already current', [UPDATE]: 'update', [GRAFT]: 'graft' }[
          layerAction
        ];
    lines.push(
      `layers    ${label}` +
        (layerMigrates ? ' (migrates from Spanish)' : '') +
        (layerRemoves ? ' (removes the stack layer 2)' : ''),
    );
  }

  // 🔴 **After the plan, and whether anything is written or not.** These are
  // not about the file being generated: they are about the project being able
  // to work at all, and layer 1 demands four of them. Until 2026-09-07 this
  // harness handed out those rules and **never said when they were missing** —
  // it asked for a pinned version, a pinned manager, LF endings and a CI, and
  // looked at none of it.
  // 🔴 Silence is not an answer. Saying nothing when nothing is missing reads
  // exactly like never having looked — reported from a real repo on 2026-09-07,
  // where the reader had to check the four by hand to learn the check had run
  // at all. It is the same defect as an `--apply` that announced itself by
  // omission, one floor down: **a positive statement can be verified, an
  // absence cannot.**
  // 🔴 **And the denominator is what ran, not what exists.** It used to be the
  // constant `CHECKS = 7`, so a repo with no `package.json` — where five of the
  // checks cannot run — was told `7 checked` on the strength of two. The number
  // lent the misses a credibility they had not earned. What does not apply is
  // now said out loud instead of being counted as a pass.
  const notApplicable = skipped
    ? `; ${skipped} ${skipped === 1 ? 'does' : 'do'} not apply`
    : '';
  if (missing.length) {
    lines.push(
      '',
      `Foundations: ${missing.length} of ${checked} missing${notApplicable}. ` +
        'Reported, not touched:',
    );
    for (const m of missing) lines.push(`  · ${m}`);
  } else if (checked) {
    lines.push(
      '',
      `Foundations: ${checked} checked, none missing${notApplicable}.`,
    );
  }

  // 🔴 Only the root `CLAUDE.md` is ever migrated, so the others have to be
  // **named**. A nested one keeps holding rules that Claude Code reads and no
  // other tool does, which is the asymmetry the migration exists to end — and
  // an agent asked to find them by hand finds most of them.
  if (nested.length) {
    lines.push(
      '',
      `Nested \`CLAUDE.md\`: ${nested.length}, left untouched — only the root ` +
        'one is migrated:',
    );
    for (const n of nested) lines.push(`  · ${n}`);
  }

  if (!apply) lines.push('', 'Dry run. Nothing written. Add --apply to write.');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('init-project.mjs')) {
  const { apply, path } = parseArgs(process.argv.slice(2));
  if (!path) {
    console.log('usage: node bin/init-project.mjs [--apply] <project>');
    process.exit(2);
  }

  const dir = resolve(path);
  if (!existsSync(dir)) {
    console.log(`${dir} does not exist.`);
    process.exit(1);
  }
  // The harness is not a project: its own AGENTS.md is written by hand.
  if (dir === resolve(REPO)) {
    console.log(`${dir} is the harness itself. Nothing was written.`);
    process.exit(1);
  }

  const target = join(dir, 'AGENTS.md');
  const existed = existsSync(target);

  const files = readdirSync(dir);
  const pkg = readPkg(dir);
  const manager = detectPackageManager({ files, pkg });

  // 🔴 Before anything is written. Rule 10 is an invariant, so a repo on
  // another manager is turned away rather than handed rules it breaks.
  const serving = servesRepo({ manager: manager.manager });
  if (!serving.serves) {
    console.log(
      `${basename(dir)}: ${serving.reason}
` +
        `
Evidence: ${manager.evidence}. Nothing was written.`,
    );
    process.exit(1);
  }

  // Read once, here, where the directory is already known. The CI answer is
  // three-valued: no workflow at all, one that invokes the check, or one that
  // enumerates its own — and the third looks like coverage while drifting.
  const readTextsIn = (sub, pattern) => {
    const here = join(dir, ...sub);
    try {
      return readdirSync(here)
        .filter((f) => pattern.test(f))
        .map((f) => {
          try {
            return {
              path: [...sub, f].join('/'),
              text: readFileSync(join(here, f), 'utf8'),
            };
          } catch {
            return { path: [...sub, f].join('/'), text: '' };
          }
        });
    } catch {
      return [];
    }
  };

  const workflows = readTextsIn(['.github', 'workflows'], /\.ya?ml$/);

  // Where a `pnpm <script>` without `run` does damage: the workflows that run
  // it, and the documents that teach someone to type it. Two levels, not a
  // recursive walk — this runs in someone else's repo and a sweep of
  // `node_modules` is not a favour.
  const shortFormSources = [
    ...workflows,
    ...readTextsIn([], /\.md$/),
    ...readTextsIn(['docs'], /\.md$/),
  ];

  const nested = nestedClaudeFiles(dir);

  const found = foundations({
    pkg,
    ci: readCi(workflows.map((f) => f.text)),
    exists: (name) => existsSync(join(dir, name)),
    read: (name) => {
      try {
        return readFileSync(join(dir, name), 'utf8');
      } catch {
        return null;
      }
    },
    sources: shortFormSources,
  });
  const missing = found.missing;

  // 🔴 The first write uses the destination's format, exactly like an update
  // does. Fixing this on one path and leaving the other is the original defect:
  // a freshly harnessed repo was born with its own `format:check` red.
  const notices = [];
  const { format, hadConfig } = await formatterFor(target, (why) =>
    notices.push(
      `its Prettier config cannot be applied from here (${why}). The block ` +
        `goes with this repo's format: if the project's own \`format\` reaches ` +
        `this file, its \`format:check\` will turn red`,
    ),
  );
  // 🔴 Here the **whole file** is formatted, and `propagate` formats only the
  // block. The difference is not an inconsistency: on a first write every line
  // is ours. Once the file exists, everything outside the marks belongs to the
  // project and must come out byte for byte identical, so an existing file is
  // read as-is and never passed through the whole-file formatter.
  // A new file is a title and layer 1, nothing below. An existing one
  // is read as-is: everything outside the marks is the project's.
  let out;
  if (existed) {
    out = readFileSync(target, 'utf8');
  } else {
    const text = `# ${basename(dir)}\n\n${renderBlock('layer1', layer1Body())}\n`;
    out = hadConfig ? await format(text) : text;
  }
  const originalText = out;

  // 🔴 And then the blocks are settled by `propagate`'s own planner, not by a
  // second implementation here. Formatting the file reflows around the marks,
  // and the two paths ended up one blank line apart — enough for a freshly
  // written file to report as "update" on the very next pass. A tool that says
  // work is pending when there is none trains people to ignore it.
  const asBlock = async (t) => (t && hadConfig ? (await format(t)).trim() : t);

  const [settled] = plan(
    [{ path: target, text: out }],
    'layer1',
    await asBlock(layer1Body()),
  );
  const layerResults = [settled];
  if (!settled.violation) out = settled.next;
  // The stack layer 2 is retired, so a block of it is taken out.
  const gone = settled.violation ? null : planRemoval(out, 'layer2');
  if (gone?.violation)
    layerResults.push({ ...settled, violation: gone.violation });
  if (gone?.removed) out = gone.next;
  const layerRemoves = gone?.removed ?? false;
  const layerViolations = layerResults.filter((r) => r.violation);
  // The more disruptive of the two is what gets reported when both fired:
  // `graft` adds a block that was not there and `update` only refreshes one,
  // so saying "update" while a whole section was grafted in understates what
  // happened to the file. 🔴 Not "the first that is not skip": layer 1 is
  // planned first, and that order alone decided the label.
  const layerAction =
    [GRAFT, UPDATE].find((a) => layerResults.some((r) => r.action === a)) ??
    (layerRemoves ? UPDATE : SKIP);
  const layerMigrates = layerResults.some((r) => r.migrates);

  // 🔴 Without the pointer the whole file is invisible to Claude Code, which
  // does not read `AGENTS.md`. Measured on 2026-09-06: a folder holding only
  // an `AGENTS.md` loads none of it, and the same content in a `CLAUDE.md`
  // loads. Writing one without the other produces a project that looks
  // harnessed and is not — the worst of the three outcomes.
  const pointer = join(dir, 'CLAUDE.md');
  const decisions = join(dir, 'docs', 'DECISIONS.md');
  const pointerNeeded = !existsSync(pointer);
  if (pointerNeeded) {
    notices.push(
      'writing `CLAUDE.md` too: it is one line importing `AGENTS.md`, and ' +
        'without it Claude Code reads none of this.',
    );
  }

  // Asked before writing, so the answer can still change what happens. The
  // files listed are only the ones this run creates: one that already exists is
  // not ours to warn about.
  // Only about a `CLAUDE.md` that was already here. 🔴 And an untouched pointer
  // is skipped entirely: without that guard the run after `--apply` warns about
  // the file this script wrote itself, and a warning that fires on its own work
  // teaches you to ignore the rest.
  const pointerNotices = pointerNeeded
    ? []
    : (() => {
        const text = readFileSync(pointer, 'utf8');
        if (isUntouchedPointer(text)) return [];
        // `lstat`, not `stat`: `stat` follows the link and answers for its
        // target, reporting an ordinary file — which is the thing to detect.
        const isSymlink = (() => {
          try {
            return lstatSync(pointer).isSymbolicLink();
          } catch {
            return false;
          }
        })();
        // Status 0 = tracked · 1 = not · 128 = not a git repo. With no repo
        // there is nothing to publish yet, so nothing is claimed.
        const r = spawnSync(
          'git',
          ['ls-files', '--error-unmatch', '--', 'CLAUDE.md'],
          { cwd: dir, encoding: 'utf8' },
        );
        const versioned = r.error || r.status === 128 ? null : r.status === 0;
        return pointerWarnings({ text, isSymlink, versioned });
      })();

  const ignored = ignoredAmong(dir, [
    target,
    ...(pointerNeeded ? [pointer] : []),
    ...(existsSync(decisions) ? [] : [decisions]),
  ]);

  console.log(
    report({
      dir,
      manager,
      apply,
      missing,
      checked: found.checked,
      skipped: found.skipped,
      nested,
      existed,
      layerAction,
      layerMigrates,
      layerRemoves,
      layerViolations,
    }),
  );
  for (const line of notices) console.log(`⚠️  ${line}`);

  // 🔴 Same check `propagate` runs, for the same reason: a rule cited by
  // number in the project's own prose goes stale silently when layer 1 gains
  // or loses a rule. Only meaningful on a file that already had prose of its
  // own — a fresh write cites nothing yet.
  if (existed) {
    const titles = ruleTitles(readFileSync(join(REPO, 'layer1.md'), 'utf8'));
    const found = citations(originalText, titles);
    for (const line of renderCitations(found, target)) console.log(line);
  }
  for (const line of pointerNotices)
    console.log(`
🔴 ${line}`);
  if (ignored.length) {
    console.log(
      `\n🔴 git ignores ${ignored.length === 1 ? 'one of the files' : `${ignored.length} of the files`} this writes, so ${ignored.length === 1 ? 'it does' : 'they do'} not travel:`,
    );
    for (const i of ignored) {
      // `i.dest` is already the relative path git was handed: passing it
      // through `relative` again resolves it against the process's own cwd and
      // prints a path into whatever directory the command happened to run from.
      console.log(
        `  · ${i.dest} — ${i.source.split(':').slice(0, 2).join(':')}`,
      );
    }
    console.log(
      '  The file lands on this machine and is absent on every clone, with no\n' +
        '  error on either side. Ask the owner, with the line above in front of\n' +
        '  them, whether the pattern goes or the harness stays local here — and\n' +
        '  do not edit their `.gitignore` on your own account.',
    );
  }

  // 🔴 `skills-lock.json` is asked about **separately**, because this script
  // does not write it and so it never reaches the block above — while rule 16
  // requires it committed all the same.
  //
  // 📐 And the objection that kept this unwritten turns out to be wrong. It was
  // "an unconditional warning would be noise in every project that has no
  // skills", which assumed we had to detect whether skills are used. We do not:
  // we ask whether **something is actively hiding the lock**, and a pattern only
  // exists because a person wrote it. A project with no skills has no such
  // pattern and hears nothing. **The check is noise-free by construction.**
  //
  // Measured on a real repo on 2026-09-08: `.claude/` and `.agents/` were
  // ignored — correct — and `skills-lock.json` was ignored too, which is rule 16
  // exactly backwards. Nothing said so, and the lock is the one of the three
  // that has to travel: the other two rebuild from it.
  const lockIgnored = ignoredAmong(dir, [join(dir, 'skills-lock.json')]);
  if (lockIgnored.length) {
    const { source } = lockIgnored[0];
    console.log(
      `\n🔴 rule 16 wants \`skills-lock.json\` committed, and this repo hides it:\n` +
        `  · skills-lock.json — ${source.split(':').slice(0, 2).join(':')}\n` +
        '  Skills rebuild **from that lock**, so ignoring it leaves every other\n' +
        '  machine rebuilding something else, or nothing. `.claude/` and\n' +
        '  `.agents/` are the two that stay ignored. Removing the pattern is the\n' +
        "  owner's call, and a declared exception is a legitimate answer.",
    );
  }

  if (apply) {
    // 🔴 What was written is named **after** writing it. Until 2026-09-07 the
    // only difference between a dry run and an `--apply` was that the "nothing
    // written" line disappeared: the run announced itself by an absence, and
    // the only way to learn whether it had worked was to go and look at the
    // folder. This command was rewritten from scratch rather than
    // translated, and the confirmation is what the rewrite dropped.
    const written = [];
    // 🔴 An existing file with a mark violation is never touched: the same
    // refusal `propagate` makes, for the same reason — the marks cannot be
    // read one way only, and guessing which one was meant is not this tool's
    // call. A file that did not change is skipped too, silently, exactly like
    // `propagate` reports "already current" without writing.
    if (layerViolations.length) {
      console.log(
        `\n🔴 ${target}: nothing written. ` +
          layerViolations
            .map((v) =>
              v.violation.reason
                ? `${v.violation.reason}.`
                : `text outside the marks would change at ${v.violation.at}.`,
            )
            .join(' '),
      );
    } else if (!existed || out !== originalText) {
      writeFileSync(target, out, 'utf8');
      written.push(relative(dir, target));
    }
    // An existing `CLAUDE.md` is never touched: it may carry content specific
    // to one tool, and this command does not own it.
    if (pointerNeeded) {
      writeFileSync(pointer, POINTER_TEXT, 'utf8');
      written.push(relative(dir, pointer));
    }

    // 🔴 The generated file **points at this one three times** — where the
    // reasoning goes, where an exception is argued, what to read first — and
    // until 2026-09-07 nothing created it. The mould travelled to
    // `reference/templates/` and no command used it, so every harnessed repo
    // was left referring to a document that did not exist.
    //
    // Same rule as the pointer: never overwritten. A project's decisions are
    // the one thing here that cannot be regenerated.
    if (!existsSync(decisions)) {
      mkdirSync(dirname(decisions), { recursive: true });
      writeFileSync(
        decisions,
        stripTemplateOnly(
          readFileSync(join(REPO, 'templates', 'DECISIONS.md'), 'utf8'),
        ).replace(/^\s+/, ''),
        'utf8',
      );
      written.push(relative(dir, decisions));
    }

    console.log(
      written.length
        ? `\nWritten in ${dir}: ${written.join(', ')}.`
        : `\nNothing to write in ${dir}: layers already current.`,
    );
  }
  process.exit(0);
}
