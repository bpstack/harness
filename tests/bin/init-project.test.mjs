// What the command does on disk, run as a command. The pure pieces are tested
// in `lib/`; this file exists for the effects a unit test cannot see.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'bin', 'init-project.mjs');

// A small committed repo: a manifest and one real file.
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'init-'));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'p', dependencies: { astro: '5.1.0' } }),
  );
  writeFileSync(join(dir, 'index.js'), 'export default 1;\n');
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-qm', 'x');
  return dir;
}

const run = (dir, ...args) => {
  try {
    return execFileSync(process.execPath, [CLI, ...args, dir], {
      encoding: 'utf8',
    });
  } catch (error) {
    // It exits 1 while placeholders remain, which is the normal path here.
    return String(error.stdout ?? '');
  }
};

// 🔴 Measured on 2026-09-06: a folder holding only an `AGENTS.md` loads none
// of it — Claude Code does not read that file — and the same content in a
// `CLAUDE.md` loads. Writing one without the other produces a project that
// looks harnessed and is invisible to the tool it was harnessed for.
test('it writes the pointer, or the whole file is invisible', () => {
  const dir = repo();
  run(dir, '--apply');
  assert.ok(existsSync(join(dir, 'AGENTS.md')), 'no AGENTS.md written');
  assert.ok(existsSync(join(dir, 'CLAUDE.md')), 'no CLAUDE.md written');
  // One line and nothing else.
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
});

test('the dry run writes neither, and says the pointer is coming', () => {
  const dir = repo();
  const out = run(dir);
  assert.equal(existsSync(join(dir, 'AGENTS.md')), false);
  assert.equal(existsSync(join(dir, 'CLAUDE.md')), false);
  assert.match(out, /CLAUDE\.md/);
});

// An existing pointer may carry content specific to one tool. This command
// creates the file when it is missing; it does not own it afterwards.
test('an existing CLAUDE.md is left exactly as it was', () => {
  const dir = repo();
  const mine = '@AGENTS.md\n\nMy own note that must survive.\n';
  writeFileSync(join(dir, 'CLAUDE.md'), mine);
  run(dir, '--apply');
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), mine);
});

// 🔴 Until 2026-09-07 an `--apply` differed from a dry run only by the absence
// of the "nothing written" line: it announced itself by omission, and the only
// way to learn whether it had worked was to look at the folder. This asserts
// the presence of a statement, not the absence of one, because an absence is
// what went unnoticed for a whole rewrite.
test('--apply names what it wrote, and does not report a file it skipped', () => {
  const fresh = repo();
  const first = run(fresh, '--apply');
  // 🔴 Three files, not two. The generated AGENTS.md points at the decisions
  // document three times and nothing created it until 2026-09-07, so every
  // harnessed repo referred to a file that did not exist.
  assert.match(first, /Written in .*AGENTS\.md/);
  assert.match(first, /CLAUDE\.md/);
  assert.match(first, /docs.DECISIONS\.md/);
  assert.ok(existsSync(join(fresh, 'docs', 'DECISIONS.md')));

  // And neither of the two it does not own is claimed when already there.
  const kept = repo();
  writeFileSync(join(kept, 'CLAUDE.md'), '@AGENTS.md\n');
  mkdirSync(join(kept, 'docs'), { recursive: true });
  writeFileSync(join(kept, 'docs', 'DECISIONS.md'), 'mine\n');
  const out = run(kept, '--apply');
  assert.match(out, /Written in .*: AGENTS\.md\./);
  assert.doesNotMatch(out, /CLAUDE\.md/, 'claimed a pointer it never wrote');
  assert.doesNotMatch(out, /DECISIONS/, 'claimed a file it never wrote');
  assert.equal(
    readFileSync(join(kept, 'docs', 'DECISIONS.md'), 'utf8'),
    'mine\n',
  );
});

// 🔴 The harness handed out rules demanding a pinned version, a pinned manager,
// LF endings and a CI, and its generator looked at none of them. Ported on
// 2026-09-07; this asserts the report carries them, because a check that exists
// in a library and never reaches the output is a check nobody has.
test('the report names the foundations layer 1 asks for and the repo lacks', () => {
  const dir = repo();
  const out = run(dir);
  // The denominator is what ran, and what did not run is said out loud instead
  // of being counted as a pass — so that tail is part of the sentence.
  assert.match(
    out,
    /Foundations: \d+ of \d+ missing(; \d+ does not apply)?\. Reported, not touched:/,
  );
  assert.match(out, /`\.gitattributes` is missing/);
  assert.match(out, /Node version is not pinned/);
  // Reported, not touched: nothing of the sort is created.
  assert.equal(existsSync(join(dir, '.gitattributes')), false);
  assert.equal(existsSync(join(dir, '.nvmrc')), false);
});

test('a repo with its foundations in place is not nagged', () => {
  const dir = repo();
  writeFileSync(join(dir, '.gitattributes'), '* text=auto eol=lf\n');
  writeFileSync(join(dir, '.nvmrc'), '24\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'p',
      packageManager: 'pnpm@10.34.1',
      dependencies: { astro: '5.1.0' },
      scripts: { verify: 'node --test' },
    }),
  );
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  writeFileSync(
    join(dir, '.github', 'workflows', 'ci.yml'),
    'jobs:\n  v:\n    steps:\n      - run: pnpm run verify\n',
  );
  // 🔴 And it says so, rather than staying quiet: silence reads exactly like
  // never having looked. Reported from a real repo on 2026-09-07.
  const out = run(dir);
  assert.doesNotMatch(out, /missing\. Reported/);
  assert.match(
    out,
    /Foundations: \d+ checked, none missing(; \d+ does not apply)?\./,
  );
});

// 🔴 A harness written into an ignored path is the quietest failure there is:
// the file is on this machine, so nothing breaks and nobody suspects, and on
// the next clone it is simply absent with no error either. Measured on a real
// repo on 2026-09-08 — the generator reported writing `CLAUDE.md` and `git
// status` never listed it. An absent `CLAUDE.md` is now the one case Claude
// Code's native `AGENTS.md` reading covers (v2.1.277+), but `docs/DECISIONS.md`
// under the same pattern has no fallback, and neither has a session that
// cannot read `AGENTS.md` directly.
test('🔴 a file git ignores is named before it is written', () => {
  const dir = repo();
  writeFileSync(join(dir, '.gitignore'), 'CLAUDE.md\n');
  const out = run(dir);
  assert.match(out, /git ignores one of the files this writes/);
  // 🔴 Anchored to the start of the line on purpose. Unanchored, this passed
  // while the printed path had a `../<some-other-dir>/` prefix on it — the
  // destination resolved against whatever directory the command was run from.
  // The assertion was loose enough to accept the bug it existed to catch.
  assert.match(out, /^ {2}· CLAUDE\.md — \.gitignore:1$/m);
  // It is asked before anything is written, so the answer can still change it.
  assert.match(out, /Dry run\. Nothing written\./);
  // And it never offers to fix someone else's `.gitignore` on its own account.
  assert.match(out, /do not edit their `\.gitignore` on your own account/);
});

// A guard that only ever fires is a guard nobody can trust: this is the other
// half, that what already worked keeps working.
test('a repo that ignores none of them says nothing', () => {
  const dir = repo();
  writeFileSync(join(dir, '.gitignore'), 'node_modules/\n');
  assert.doesNotMatch(run(dir), /git ignores/);
});

// 🔴 `check-ignore -v` prints negation patterns too **and returns exit 0 with
// them**, so a file re-included by `!` was reported as ignored. The warning
// then survived fixing the very thing it denounced, and one that does not go
// away when obeyed teaches you to ignore every other one.
test('🔴 a file re-included by a negation pattern is not reported', () => {
  const dir = repo();
  writeFileSync(join(dir, '.gitignore'), 'docs/*\n!docs/DECISIONS.md\n');
  const out = run(dir);
  assert.doesNotMatch(out, /DECISIONS\.md — /);
});

// 🔴 The damage of a `CLAUDE.md` that is not a pointer is not the duplication,
// it is the asymmetry: only Claude Code reads it, while `AGENTS.md` is what
// every other tool reads, so the repo behaves differently depending on which
// harness opened it. Two files that drift do not error.
test('🔴 a CLAUDE.md carrying its own rules is reported, not overwritten', () => {
  const dir = repo();
  writeFileSync(join(dir, 'CLAUDE.md'), '# Rules\n\n- never push on Fridays\n');
  const out = run(dir);
  assert.match(out, /has no `@AGENTS\.md` line/);
  // 🔴 Two problems, two prices, and the cheap one comes first. Stated as one
  // thing it reads as all-or-nothing — measured on 2026-09-17, a repo answered
  // that by declaring a standing exception against the import itself.
  assert.match(out, /The fix is one line at the top of `CLAUDE\.md`/);
  assert.match(out, /`AGENTS\.md` does not reach a Claude Code session at all/);
  // ⚠️ It used to say «propose the migration, do not perform it», and what the
  // agent did in testing was migrate anyway, having asked first. The
  // instruction was what was wrong: stopping one step short leaves the
  // asymmetry in place. What the script asks for now is the authorisation.
  assert.match(out, /show the move whole, get it authorised/);
  // 🔴 And the provenance heading, because nothing else makes a second run a
  // no-op: without it the same content migrates twice.
  assert.match(out, /under a heading naming where it came from/);
  // The file is the project's: **this script** writes over nothing.
  assert.equal(
    readFileSync(join(dir, 'CLAUDE.md'), 'utf8'),
    '# Rules\n\n- never push on Fridays\n',
  );
});

// 🔴 Short is not the same as pointer. Only `@AGENTS.md` imports; a sentence
// asking the agent to go and read it merely asks for compliance — measured
// once, the pointer reached the session's context, `AGENTS.md` did not, and the
// whole session ran without it despite being told to.
test('🔴 a short CLAUDE.md that only asks you to read AGENTS.md is not a pointer', () => {
  const dir = repo();
  writeFileSync(
    join(dir, 'CLAUDE.md'),
    'Read AGENTS.md before doing anything.\n',
  );
  assert.match(run(dir), /has no `@AGENTS\.md` line/);
});

// 🔴 Content specific to Claude Code may sit **below** the import line and the
// file is still a pointer — the mould ships that way. The prompt used to demand
// the file hold one line and nothing else, which is not what this checks, and
// the contradiction turned a one-line fix into "migrate everything or refuse".
test('a pointer carrying its own notes below the import is left in peace', () => {
  const dir = repo();
  writeFileSync(
    join(dir, 'CLAUDE.md'),
    '@AGENTS.md\n\n## Versions\n\nnode 24, pnpm 10.\n',
  );
  assert.doesNotMatch(run(dir), /has no `@AGENTS\.md` line/);
});

// Content specific to Claude Code may sit below the import, and the mould says
// so. A file like that is still a pointer and must stay silent.
test('a pointer with Claude-specific notes under it stays silent', () => {
  const dir = repo();
  writeFileSync(
    join(dir, 'CLAUDE.md'),
    '@AGENTS.md\n\nUse the wide terminal.\n',
  );
  const out = run(dir);
  assert.doesNotMatch(out, /does not import/);
  assert.doesNotMatch(out, /is not in git/);
});

// 🔴 The other half: a warning that fires on the harness's own work teaches you
// to ignore every other one. After `--apply` the pointer this script wrote is
// untracked and untouched, and it must say nothing about it.
test('🔴 the pointer this script wrote is not warned about on the next run', () => {
  const dir = repo();
  writeFileSync(join(dir, '.gitignore'), 'node_modules/\n');
  run(dir, '--apply');
  const second = run(dir);
  assert.doesNotMatch(second, /does not import/);
  assert.doesNotMatch(second, /is not in git/);
});

// 🔴 The publishing warning belongs with a migration and nowhere else. A file
// that is not a pointer and is not in git means proposing to move content that
// has never left this machine — that is the case worth stopping for.
test('🔴 content outside git is flagged as publishing, before any migration', () => {
  const dir = repo();
  writeFileSync(join(dir, 'CLAUDE.md'), '# Rules\n\n- internal notes\n');
  const out = run(dir);
  assert.match(out, /is not in git/);
  assert.match(out, /Ask whether the repo is public — do not look it up/);
  assert.match(out, /split it in two/);
});

// 🔴 Rule 21 wants `skills-lock.json` committed, and this script never writes
// it — so it never reaches the block that checks what is written. Measured on a
// real repo on 2026-09-08: `.claude/` and `.agents/` were ignored, correctly,
// and the lock was ignored too, which is the rule exactly backwards. Nothing
// said so.
test('🔴 a repo that hides skills-lock.json is told, before the file exists', () => {
  const dir = repo();
  writeFileSync(
    join(dir, '.gitignore'),
    '.claude/\n.agents/\nskills-lock.json\n',
  );
  // The lock is deliberately NOT created: the warning has to land before the
  // owner runs autoskills, so the pattern goes first and the lock is born
  // versioned instead of being rescued afterwards.
  assert.equal(existsSync(join(dir, 'skills-lock.json')), false);
  const out = run(dir);
  assert.match(out, /rule 16 wants `skills-lock\.json` committed/);
  assert.match(out, /^ {2}· skills-lock\.json — \.gitignore:3$/m);
  // The two that are correctly ignored are named as such, not denounced.
  assert.doesNotMatch(out, /rule 16[\s\S]*`\.agents\/` — /);
});

// 📐 The objection that kept this unwritten was that an unconditional warning
// would be noise in every project without skills. It is not unconditional: a
// pattern exists only because someone wrote it, so a project with no skills
// hears nothing. This is that half.
test('a repo with no pattern hiding the lock hears nothing about rule 16', () => {
  const dir = repo();
  writeFileSync(join(dir, '.gitignore'), '.claude/\n.agents/\nnode_modules/\n');
  assert.doesNotMatch(run(dir), /rule 21/);
});

// 🔴 Until 2026-09-09 an existing `AGENTS.md` made the command exit 1 before
// doing anything at all. Protecting that file was right; skipping the
// foundations report, the pointer, the decisions document and the skills check
// along with it was not, and nothing said so because nothing tested it. These
// four cover the path the refusal used to occupy.
const withAgents = (body) => {
  const dir = repo();
  writeFileSync(join(dir, 'AGENTS.md'), body);
  return dir;
};

const MINE = `# AGENTS.md — p

Prose of my own, which no detector can regenerate.

## Where the model gets it wrong

It assumes the database is Postgres. It is not.
`;

test('🔴 an existing AGENTS.md gets the layers, and keeps its own prose', () => {
  const dir = withAgents(MINE);
  const out = run(dir, '--apply');
  assert.match(out, /^layers {4}graft$/m);
  const text = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(text, /<!-- layer1:start/);
  // The title stays first, the block goes under it, and everything
  // else the project wrote follows byte for byte.
  const [title, ...rest] = MINE.split('\n');
  assert.ok(text.startsWith(`${title}\n\n<!-- layer1:start`));
  assert.ok(text.endsWith(rest.join('\n').trimStart()));
  assert.match(text, /It assumes the database is Postgres\./);
});

test('the rest of the flow runs instead of being skipped with the file', () => {
  const dir = withAgents(MINE);
  const out = run(dir, '--apply');
  assert.match(out, /Foundations: /);
  assert.match(out, /Written in .*CLAUDE\.md/);
  assert.ok(existsSync(join(dir, 'CLAUDE.md')));
  assert.ok(existsSync(join(dir, 'docs', 'DECISIONS.md')));
});

// A second pass changes nothing, and says so rather than rewriting the file:
// the same "already current" `propagate` reports.
test('a second run writes nothing and reports the layers as current', () => {
  const dir = withAgents(MINE);
  run(dir, '--apply');
  const after = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  const out = run(dir, '--apply');
  assert.match(out, /^layers {4}already current$/m);
  assert.match(out, /Nothing to write/);
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), after);
});

// 🔴 Marks that do not pair cannot be read one way only, so the file is not
// touched and the run says why. The same refusal `propagate` makes, and the
// only case where an existing AGENTS.md still stops the write.
test('an AGENTS.md with unbalanced marks is refused, not rewritten', () => {
  const broken = `${MINE}\n<!-- layer1:start -->\nno end mark\n`;
  const dir = withAgents(broken);
  const out = run(dir, '--apply');
  assert.match(out, /^layers {4}REFUSED$/m);
  assert.match(out, /nothing written/);
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), broken);
});

// The harness is not a project. The command's prompt already said so; until
// 2026-09-17 the script did not. Dry run on purpose: if the refusal broke, an
// --apply here would write into this repo.
test('🔴 the harness itself is refused', () => {
  assert.match(run(REPO), /is the harness itself/);
});

// 🔴 Only the root `CLAUDE.md` is ever migrated, so the rest have to be named.
// A nested one goes on holding rules that Claude Code reads and no other tool
// does — the asymmetry the migration exists to end — and an agent asked to find
// them by hand finds most of them.
test('the nested `CLAUDE.md` files are listed, and left alone', () => {
  const dir = repo();
  mkdirSync(join(dir, 'packages', 'api'), { recursive: true });
  mkdirSync(join(dir, 'node_modules', 'dep'), { recursive: true });
  writeFileSync(join(dir, 'packages', 'api', 'CLAUDE.md'), 'local rules\n');
  writeFileSync(join(dir, 'node_modules', 'dep', 'CLAUDE.md'), 'not ours\n');

  const out = run(dir);
  assert.match(out, /Nested `CLAUDE\.md`: 1, left untouched/);
  assert.match(out, /packages\/api\/CLAUDE\.md/);
  // Someone else's dependency is not a rule of this project.
  assert.doesNotMatch(out, /node_modules/);
  // Listed, not touched.
  assert.equal(
    readFileSync(join(dir, 'packages', 'api', 'CLAUDE.md'), 'utf8'),
    'local rules\n',
  );
});

test('a repo with no nested `CLAUDE.md` says nothing about them', () => {
  assert.doesNotMatch(run(repo()), /Nested `CLAUDE\.md`/);
});
