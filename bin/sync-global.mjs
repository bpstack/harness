#!/usr/bin/env node
// Distributes the global harness — agents and commands — to the folders each
// tool reads. One source here, two dialects out.
//
//   node bin/sync-global.mjs --dest /tmp/try
//   node bin/sync-global.mjs --dest /tmp/try --apply
//
// **Dry-run by default**, and it also **deletes** — but only a file that
// carries the harness mark and is no longer in the source (ADR-175, ADR-194).
// A renamed agent does not stay alive; a file without the mark is someone's,
// and it is named and left alone. `reference/` is never pruned.
//
// 🔴 `--dest` is required, and that is deliberate for now. Writing into the
// real config would put two sources behind one destination, and the last one
// to run would win silently.
//
// Only effects live here. The dialects are in `lib/dialects.mjs`.

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  rmSync,
  existsSync,
  statSync,
} from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  parseSource,
  DIALECTS,
  OPENCODE_HOME,
  MARK,
  chooseHarnesses,
} from '../lib/dialects.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

// A managed folder relative to the destination, with `/` separators, so the
// notices read the same on the three machines.
const keyFor = (dest, dir) => relative(dest, dir).split(sep).join('/');

// The install seal: which version is on this machine, since when, for which
// tools, and where the clone is — the commands find the scripts through
// `source` (ADR-174, ADR-181, ADR-193).
export const SEAL = join('.claude', 'harness', 'install.json');

// The clone's commit, marked `-dirty` when it has uncommitted changes: a seal
// must not claim a clean version it was not installed from.
function versionOf(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'describe', '--always', '--dirty'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

export function sealFor({ targets, version, now = new Date() }) {
  return {
    version,
    installedAt: now.toISOString(),
    tools: targets,
    source: REPO,
  };
}

// What is copied, and where each dialect expects it.
const KINDS = ['agents', 'commands'];
const LAYOUT = {
  claude: (dest, kind) => join(dest, '.claude', kind),
  opencode: (dest, kind) => join(dest, '.config', 'opencode', kind),
};

// 🔴 Templates and reference are copied verbatim, recursively, and to one
// place only. They have no dialect: nothing reads them automatically — a
// person, or the `security` agent, opens one on demand. Without this they
// never reach the machine, and the rules that demand those files would ship
// without the means to write them.
//
// Recursive and byte for byte, both on purpose. `reference/security/source/`
// holds the CSV the ASVS sheets are generated from, and a PDF: a reader that
// filters by extension or skips folders drops them **silently, with no
// error** — which is exactly what the previous tool did.
const VERBATIM = {
  templates: (dest) => join(dest, '.claude', 'reference', 'templates'),
  reference: (dest) => join(dest, '.claude', 'reference'),
};

// The notice for what is being respected. It is emitted **whenever anything
// foreign is found**, `--apply` included: staying quiet would leave the user
// believing the destination is a faithful copy of the source when it is not,
// and that kind of silence is what this project exists to remove.
export function foreignNotice(foreign, folder) {
  if (foreign.length === 0) return null;
  const noun =
    foreign.length === 1
      ? 'file this harness did not put there'
      : 'files this harness did not put there';
  return (
    `⚠️  ${folder}: ${foreign.length} ${noun} and **left alone** — ` +
    `${foreign.join(', ')}. Yours are still there; delete spares by hand.`
  );
}

// 🔴 The shared reference goes to `.claude/reference/` whichever tool asked for
// it, and the `security` agent's prompt carries that path written in. opencode
// reaches outside its workspace only when told to: `permission.external_directory`
// defaults to **ask**, so without a rule the subagent stops mid-review to ask —
// or, unattended, reviews without the sheet it was told to cite.
//
// 📐 That it can read there **was measured in execution on 2026-08-07**: the
// `security` subagent opened the sheet and quoted four requirements with their
// line numbers. What was never checked is who puts the rule there. **Nobody
// does** — this tool writes agents and commands, never config, and the machine
// where it was measured already had the line from months earlier. That is
// exactly the shape of "it works because the old harness was here first".
//
// ⚠️ Reported, never written. `opencode.json` is the owner's, like the settings
// file beside it. And the failure it prevents is loud, not silent: the agent
// says in its header that it had no sheet and marks every finding as its own
// judgement — a worse review, not a false one.
export function opencodePermission(config) {
  if (config === null) return null; // no opencode here: nothing to say
  const external = config?.permission?.external_directory;
  // A blanket allow covers it, and so does any rule naming the reference path.
  if (external === 'allow') return null;
  if (
    external &&
    typeof external === 'object' &&
    Object.entries(external).some(
      ([pattern, verdict]) =>
        verdict === 'allow' && pattern.includes('.claude/reference'),
    )
  )
    return null;
  return (
    '📌 `opencode.json` has no rule letting agents read ' +
    '`~/.claude/reference/**`, and `permission.external_directory` defaults ' +
    'to **ask**. The `security` agent is told to cite the ASVS sheet from ' +
    'there, so without it that agent stops to ask mid-review — or reviews ' +
    'without the sheet and says so. Add ' +
    '`"permission": { "external_directory": { "~/.claude/reference/**": ' +
    '"allow" } }`. This harness does not write that file.'
  );
}

// Layer 1 tells every project to check documentation through Context7 (rule
// 17), so a machine without it is said at install time, not mid-task
// (ADR-191). Read, never written (ADR-173). `null` means the tool is not being
// written here, so nothing is said about it.
export function context7Notice({ claude, opencode }) {
  const lacks = (names) => names && !names.some((n) => /context7/i.test(n));
  const missing = [
    lacks(claude) && '`~/.claude.json` (`mcpServers`)',
    lacks(opencode) && '`~/.config/opencode/opencode.json` (`mcp`)',
  ].filter(Boolean);
  if (!missing.length) return null;
  return (
    `📌 No Context7 MCP server in ${missing.join(' or ')}. Rule 17 has ` +
    'agents check library documentation through it. If it reaches you ' +
    'through a plugin or a connector it does not show there, and this can be ' +
    'ignored. This harness does not write that file.'
  );
}

// 🔴 A file this harness never manages, sitting where it will be read anyway.
// `~/.claude/CLAUDE.md` is the user-level memory: Claude Code loads it in
// **every** session, alongside whatever the project carries — and in a folder
// with no `AGENTS.md` it is the only thing loaded at all.
//
// This tool does not write it, does not delete it and must not: those rules are
// the owner's, like the settings file next to it. But saying nothing is its own
// failure, measured on 2026-09-07: it sits outside every managed folder, so it
// never appears in the foreign notice either. **A file that is read on every
// session and mentioned by nothing is one nobody remembers is there.**
export function unmanagedMemory(present) {
  if (!present) return null;
  return (
    '📌 There is a `CLAUDE.md` at the destination root. This harness does not ' +
    'write it, delete it or update it: those rules are yours, and Claude Code ' +
    'loads them in every session — in a folder with no `AGENTS.md` they are ' +
    'the only ones it loads. Keep in it what must hold **without** a project; ' +
    'what a project needs arrives in its own `AGENTS.md`.'
  );
}

export function parseArgs(argv) {
  const at = argv.indexOf('--dest');
  return {
    apply: argv.includes('--apply'),
    check: argv.includes('--check'),
    dest: at > -1 ? argv[at + 1] : null,
    // Writes opencode even where its directory is not there yet.
    opencode: argv.includes('--opencode'),
  };
}

// opencode counts as installed when its own directory exists.
const hasOpencode = (dest) =>
  existsSync(join(dest, ...OPENCODE_HOME.split('/')));

// 🔴 The deployed copy drifting from the source is a failure with no symptom.
// Everything looks fine: the repo says one thing, the tool runs another, and
// the tests still pass — because the tests read the source and the tool reads
// the copy. Two ways in: the source changes and nobody re-syncs, or someone
// edits the copy by hand.
//
// This is not an age stamp. `park`-style stamps exist for checks too expensive
// to run; comparing two folders takes under a second, so there is nothing to
// guess: it can just look.
export const FIX = 'pnpm run sync:global --dest <folder> --apply';

export function driftNotice({ destinationExists, changes, total }) {
  // ⚠️ In CI there is no deployed harness at all, so everything would report
  // as missing. Cutting there leaves a red the CI cannot fix, and a red nobody
  // can fix is a red that gets ignored — taking the ones that mattered with it.
  if (!destinationExists) {
    return {
      text: 'no harness deployed here: nothing to compare.',
      cuts: false,
    };
  }
  if (changes === 0) {
    // ⚠️ No count here. The caller knows what changed, not how many files are
    // managed in total, and printing a number it cannot support is how a
    // figure ends up lying — it said "0 files" on a perfectly synced copy.
    return { text: 'the deployed copy is current.', cuts: false };
  }
  const noun = changes === 1 ? 'file has' : 'files have';
  return {
    text:
      `🔴 ${changes} ${noun} drifted from the source. What runs is not what ` +
      `this repo says: the tests read the source and the tool reads the copy. ` +
      `Sync with \`${FIX}\`.`,
    cuts: true,
  };
}

// Every file under `dir`, as a path relative to it with `/` separators.
export function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, base));
    else out.push(relative(base, path).split(sep).join('/'));
  }
  return out;
}

function sources(kind) {
  const dir = join(REPO, kind);
  if (kind in VERBATIM) {
    return walk(dir).map((file) => ({
      file,
      data: readFileSync(join(dir, file)),
    }));
  }
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') }));
}

// Tests inject strings; disk gives Buffers. One shape from here on.
const bytes = (entry) => entry.data ?? Buffer.from(entry.text, 'utf8');

// What each destination should contain, and what is there now.
export function planSync({
  dest,
  read = sources,
  targets = Object.keys(LAYOUT),
}) {
  const writes = [];
  const prunes = [];
  const collisions = [];
  const warnings = [];
  const foreign = [];

  // 🔴 A spare file goes only if it carries the mark: without it, it is
  // someone's work, and it is named and left alone.
  const decide = (dir, generated, present) => {
    const spare = present.filter((f) => !generated.includes(f));
    const ours = spare.filter((f) =>
      readFileSync(join(dir, f), 'utf8').includes(MARK),
    );
    for (const file of ours) prunes.push({ path: join(dir, file), file });
    const notice = foreignNotice(
      spare.filter((f) => !ours.includes(f)),
      keyFor(dest, dir),
    );
    if (notice) foreign.push(notice);
  };

  for (const kind of KINDS) {
    const found = read(kind);
    for (const dialect of targets) {
      const layout = LAYOUT[dialect];
      const dir = layout(dest, kind);
      const expected = new Set();

      for (const { file, text } of found) {
        const { front, body } = parseSource(text, file);
        const { content, warnings: w } = DIALECTS[dialect](front, body, file);
        expected.add(file);
        warnings.push(...w.map((line) => `${dialect}: ${line}`));

        const path = join(dir, file);
        const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
        // 🔴 Overwriting is as final as deleting: a file of that name without
        // the mark is someone's, and the install stops (ADR-175).
        if (current !== null && !current.includes(MARK)) collisions.push(path);
        else if (current !== content) {
          writes.push({ path, content, fresh: current === null });
        }
      }

      // Prune only inside the folders this tool manages, and only Markdown.
      const present = existsSync(dir)
        ? readdirSync(dir).filter((f) => f.endsWith('.md'))
        : [];
      decide(dir, [...expected], present);
    }
  }

  // Verbatim trees: byte for byte, no dialect, one destination each, and
  // **never pruned** — a CSV or a PDF has nowhere to carry the mark (ADR-175).
  for (const [kind, at] of Object.entries(VERBATIM)) {
    const root = at(dest);
    for (const entry of read(kind)) {
      const path = join(root, entry.file);
      const content = bytes(entry);
      const current = existsSync(path) ? readFileSync(path) : null;
      if (current === null || !current.equals(content)) {
        writes.push({ path, content, fresh: current === null });
      }
    }
  }

  // A config file that is absent, or unreadable, answers the same as one
  // without the rule: the notice is about what the agent will find, not about
  // whose fault it is.
  const readJson = (file) => {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return {};
    }
  };

  // Read on every session and managed by nobody: it has to be named, or it is
  // a file nobody remembers is there.
  const unmanaged = unmanagedMemory(
    existsSync(join(dest, '.claude', 'CLAUDE.md')),
  );
  if (unmanaged) foreign.push(unmanaged);

  // Only where opencode is actually being written to: telling a Claude-only
  // machine to edit a config it does not have is the noise this file avoids.
  const permission = opencodePermission(
    targets.includes('opencode')
      ? readJson(join(dest, '.config', 'opencode', 'opencode.json'))
      : null,
  );
  if (permission) foreign.push(permission);

  // `~/.claude.json` sits at the home root, not under `.claude`. Only the
  // server names are looked at: the entries may carry an API key.
  const context7 = context7Notice({
    claude: Object.keys(readJson(join(dest, '.claude.json')).mcpServers ?? {}),
    opencode: targets.includes('opencode')
      ? Object.keys(
          readJson(join(dest, '.config', 'opencode', 'opencode.json')).mcp ??
            {},
        )
      : null,
  });
  if (context7) foreign.push(context7);

  return { writes, prunes, collisions, warnings, foreign };
}

export function render(
  { writes, prunes, collisions = [], warnings, foreign = [] },
  { apply, dest },
) {
  const lines = [`destination  ${dest}`];

  if (collisions.length) {
    lines.push(
      `🔴 ${collisions.length} in the way, without the harness mark — nothing will be written:`,
      ...collisions.map((p) => `  · ${p}`),
      '   Move or delete them by hand, then run again.',
      '',
    );
  }

  const fresh = writes.filter((w) => w.fresh).length;
  lines.push(
    `${writes.length} to write (${fresh} new, ${writes.length - fresh} changed)`,
  );

  if (prunes.length) {
    lines.push(
      '',
      `🔴 ${prunes.length} to DELETE — this harness put them there:`,
    );
    for (const p of prunes) lines.push(`  · ${p.path}`);
    lines.push('   Check this list before applying. Deletion is not undone.');
  }

  // Said on every run, `--apply` included: staying quiet would leave the user
  // believing the destination is a faithful copy when it is not.
  if (foreign.length) {
    lines.push('', ...foreign.map((line) => `  ${line}`));
  }

  if (warnings.length) {
    lines.push('', 'What does not travel:');
    for (const w of [...new Set(warnings)]) lines.push(`  ⚠️  ${w}`);
  }

  if (!apply) {
    lines.push('', 'Dry run. Nothing written, nothing deleted. Add --apply.');
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('sync-global.mjs')) {
  const { apply, check, dest, opencode } = parseArgs(process.argv.slice(2));

  // 🔴 The reason `--dest` is required is about **writing**: two sources behind
  // one destination, and the last to run wins silently. `--check` writes
  // nothing, so that reason does not reach it — and requiring it there had a
  // cost that was paid for months: the check existed and **nobody ran it**,
  // because `verify` had no folder to pass. A guard nobody runs is not a guard.
  //
  // So a bare `--check` asks about **this machine's home**, which is the one
  // destination a developer always means. On a runner with nothing deployed it
  // says so and passes; the answer is honest either way.
  const home = check && !dest ? homedir() : dest;
  if (!home) {
    console.log(
      'usage: node bin/sync-global.mjs --dest <folder> [--apply]\n' +
        '\n--dest is required to write: putting two sources behind one\n' +
        'destination means the last to run wins, silently. `--check` reads\n' +
        'only, so it defaults to your home.',
    );
    process.exit(2);
  }

  const root = resolve(home);

  // --check answers one question — has the deployed copy drifted? — and cuts
  // when it has. It writes nothing, ever.
  //
  // 🔴 It looks at the layouts that are **actually deployed**, which is what
  // `--apply` writes to, and not at every layout there is. It used to do the
  // latter, reasoning that a read-only question must not depend on which tools
  // are installed. Measured on 2026-09-07: a destination this tool had just
  // written **failed its own check immediately** — 9 files "drifted", exit 1 —
  // and they were the files of the harness that is not installed there. The
  // absence of a program is not drift, and a check that a fresh `--apply`
  // cannot satisfy is red forever on any machine with one tool. It was the
  // pair that broke, not the idea: writing stopped going to both, and this did
  // not follow.
  //
  // ⚠️ What it must NOT do is go quiet, so a layout that IS deployed is
  // checked whole — a file missing from it still counts as drift.
  if (check) {
    const { targets } = chooseHarnesses({ opencode: hasOpencode(root) });
    const seen = planSync({ dest: root, targets });
    const { text, cuts } = driftNotice({
      // No `.claude` means nothing deployed — the CI case — not drift.
      destinationExists: existsSync(join(root, '.claude')),
      changes: seen.writes.length + seen.prunes.length,
      total: seen.writes.filter((w) => !w.fresh).length + seen.prunes.length,
    });
    console.log(text);
    process.exit(cuts ? 1 : 0);
  }

  const { targets, why } = chooseHarnesses({
    opencode: hasOpencode(root),
    forced: opencode,
  });

  const plan = planSync({ dest: root, targets });

  console.log(render(plan, { apply, dest: root }));
  console.log(`harnesses    ${why}`);

  if (apply && plan.collisions.length) process.exit(1);

  if (apply) {
    // 🔴 Counted while it happens, not read back from the plan (ADR-148). This
    // is the one command here that deletes, so the count that matters is what
    // the disk took, and a directory found among the prunes is skipped: saying
    // "3 deleted" after skipping one would be the same lie in a shorter form.
    let written = 0;
    let deleted = 0;
    for (const w of plan.writes) {
      mkdirSync(dirname(w.path), { recursive: true });
      writeFileSync(w.path, w.content);
      written += 1;
    }
    for (const p of plan.prunes) {
      // A directory here would mean something unexpected; refuse rather than
      // recurse into someone else's tree.
      if (statSync(p.path).isDirectory()) continue;
      rmSync(p.path);
      deleted += 1;
    }
    // Written last, and only after the pass succeeded. Failing to write it is
    // reported, not fatal: the commands then ask for the path.
    const sealName = SEAL.split(sep).join('/');
    let sealed = true;
    try {
      const seal = sealFor({ targets, version: versionOf(REPO) });
      mkdirSync(dirname(join(root, SEAL)), { recursive: true });
      writeFileSync(join(root, SEAL), JSON.stringify(seal, null, 2) + '\n');
    } catch (e) {
      sealed = false;
      console.log(`⚠️  could not write ${sealName} → ${e.code ?? e.message}.`);
    }

    // 🔴 Said after everything, so the count includes the seal. Reporting
    // "39 written" while 40 files appear invites the reader to go looking for
    // the one that was not mentioned, which is the same distrust the silent
    // `--apply` used to create.
    console.log(
      `\n${written} written, ${deleted} deleted in ${root}` +
        (sealed ? `, plus ${sealName}.` : '.') +
        (deleted < plan.prunes.length
          ? ` ${plan.prunes.length - deleted} left alone: a folder was found` +
            ' where a file was expected.'
          : ''),
    );
  }
  process.exit(0);
}
