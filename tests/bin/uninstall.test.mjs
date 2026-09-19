// What the command does on disk. The calculation is tested in `lib/`; this is
// for the effects, and it exists because the first version of the global path
// crashed half way through — which a unit test could not have seen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO, 'bin', 'uninstall.mjs');
const SYNC = join(REPO, 'bin', 'sync-global.mjs');

const run = (cli, args) => {
  try {
    return execFileSync(process.execPath, [cli, ...args], {
      encoding: 'utf8',
    });
  } catch (error) {
    return String(error.stdout ?? '') + String(error.stderr ?? '');
  }
};

const count = (dir) =>
  readdirSync(dir).reduce(
    (n, e) =>
      n + (statSync(join(dir, e)).isDirectory() ? count(join(dir, e)) : 1),
    0,
  );

// 🔴 The record names the same file twice — under `reference` with a nested
// name, and again under `reference/templates`. The first version counted 47
// where 40 existed and then threw ENOENT on the second unlink, **stopping half
// way** and leaving exactly the mess an uninstall exists to prevent.
test('🔴 the global pass removes what it deployed, in one go', () => {
  const dest = mkdtempSync(join(tmpdir(), 'unin-'));
  mkdirSync(join(dest, '.claude'), { recursive: true });
  run(SYNC, ['--dest', dest, '--apply']);
  const deployed = count(dest);

  // Something of theirs, which must survive.
  const mine = join(dest, '.claude', 'agents', 'mine.md');
  writeFileSync(mine, 'written by a person\n');

  const dry = run(CLI, ['--global', '--dest', dest]);
  const planned = Number(dry.match(/(\d+) to delete/)[1]);
  // The seal is not in the plan: it goes last.
  assert.equal(planned, deployed - 1, 'the plan double-counted');
  assert.equal(count(dest), deployed + 1, 'the dry run removed something');

  const out = run(CLI, ['--global', '--dest', dest, '--apply']);
  assert.doesNotMatch(out, /ENOENT|Error:/, 'the pass threw');
  assert.match(out, new RegExp(`${planned} removed`));
  assert.ok(existsSync(mine), 'a file we did not deploy was deleted');
  assert.equal(count(dest), 1, 'something of ours was left behind');
});

// 🔴 What the mark cannot decide: a spare file under reference/, a record left
// by the old harness, and the empty folders nested in reference/.
test('🔴 the global pass names what it cannot claim and leaves no empty folder', () => {
  const dest = mkdtempSync(join(tmpdir(), 'unin-'));
  run(SYNC, ['--dest', dest, '--apply']);
  const extra = join(dest, '.claude', 'reference', 'mine.txt');
  writeFileSync(extra, 'mine\n');
  const record = join(dest, '.harness-sync.json');
  writeFileSync(record, JSON.stringify({ source: dest }));

  const out = run(CLI, ['--global', '--dest', dest, '--apply']);
  assert.match(out, /no longer ships — left alone/);
  assert.match(out, /mine\.txt/);
  assert.ok(existsSync(extra), 'a spare reference file was deleted');
  assert.ok(existsSync(record), "the old harness's record was deleted");
  assert.doesNotMatch(out, /harness-sync/);

  // Only the folders that still hold something remain.
  const dirs = [];
  const walkDirs = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) {
        dirs.push(p);
        walkDirs(p);
      }
    }
  };
  walkDirs(dest);
  const empty = dirs.filter((d) => readdirSync(d).length === 0);
  assert.deepEqual(empty, [], 'empty folders were left behind');
});

// Without the mark or the seal there is nothing to claim, and guessing is not
// an option.
test('with nothing marked and no seal it removes nothing and says why', () => {
  const dest = mkdtempSync(join(tmpdir(), 'unin-'));
  mkdirSync(join(dest, '.claude', 'agents'), { recursive: true });
  const theirs = join(dest, '.claude', 'agents', 'theirs.md');
  writeFileSync(theirs, 'not ours\n');

  const out = run(CLI, ['--global', '--dest', dest, '--apply']);
  assert.match(out, /nothing of this harness/);
  assert.ok(existsSync(theirs));
});

test('--global without --dest refuses instead of assuming a folder', () => {
  assert.match(run(CLI, ['--global', '--apply']), /--dest is required/);
});

// 🔴 Noticed by the owner, not by a test: `docs/SESSION.md` and
// `docs/DECISIONS.md` come from moulds this harness ships, and the uninstall
// left them without a word. Measured on two real repos: 89 and 143 lines with
// **zero placeholders** — written over time by people. They must never be
// removed, and they must be named, because leaving material that came from
// here unmentioned is the same silence this whole pass has been removing.
test('the seeded docs are named and never removed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unin-'));
  mkdirSync(join(dir, 'docs'), { recursive: true });
  writeFileSync(
    join(dir, 'AGENTS.md'),
    '# X\n\nMine.\n\n<!-- layer1:start · a -->\nours\n<!-- layer1:end -->\n',
  );
  const session = join(dir, 'docs', 'SESSION.md');
  writeFileSync(session, '# SESSION\n\nWhere we left it.\n');

  const out = run(CLI, ['--apply', dir]);
  assert.match(out, /SESSION\.md — from a mould of ours/);
  assert.ok(existsSync(session), 'a seeded doc was removed');
  assert.equal(
    readFileSync(session, 'utf8'),
    '# SESSION\n\nWhere we left it.\n',
    'a seeded doc was rewritten',
  );
});

// 🔴 The list of moulded files was hand-written with two entries and was
// already missing four — ci.yml, README.md, ROADMAP.md and TODO.md — which the
// owner spotted, not a test. Deriving it from `templates/` is the fix; this
// guard is what stops it drifting again, because a mould with nowhere declared
// has to be reported rather than skipped.
test('🔴 every mould is accounted for, none silently skipped', () => {
  const moulds = readdirSync(join(REPO, 'templates')).filter(
    (m) => m !== 'AGENTS.md' && m !== 'CLAUDE.md',
  );
  const dir = mkdtempSync(join(tmpdir(), 'unin-'));
  writeFileSync(
    join(dir, 'AGENTS.md'),
    '# X\n\nMine.\n\n<!-- layer1:start · a -->\nours\n<!-- layer1:end -->\n',
  );
  // One copy of every mould, in the place the command expects it.
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  const homes = {
    'ci.yml': ['.github', 'workflows', 'ci.yml'],
    'DECISIONS.md': ['docs', 'DECISIONS.md'],
    'SESSION.md': ['docs', 'SESSION.md'],
    'ROADMAP.md': ['ROADMAP.md'],
    'TODO.md': ['TODO.md'],
    'README.md': ['README.md'],
  };
  for (const m of moulds) {
    assert.ok(homes[m], `the mould ${m} has no home in this test either`);
    writeFileSync(join(dir, ...homes[m]), 'written by a person\n');
  }

  const out = run(CLI, ['--apply', dir]);
  for (const m of moulds) {
    assert.match(out, new RegExp(m.replace('.', '\.')), `${m} went unnamed`);
    assert.ok(existsSync(join(dir, ...homes[m])), `${m} was removed`);
  }
  assert.doesNotMatch(out, /has no home declared/);
});

// 🔴 Measured on 2026-09-17 against a machine with only the old harness: with
// no seal, the paths under reference/ matched this clone and 28 files of
// another install were listed to delete. Without the seal, reference/ is not
// ours to claim.
test('🔴 without the seal nothing under reference is claimed', () => {
  const dest = mkdtempSync(join(tmpdir(), 'unin-'));
  run(SYNC, ['--dest', dest, '--apply']);
  rmSync(join(dest, '.claude', 'harness', 'install.json'));
  const out = run(CLI, ['--global', '--dest', dest]);
  assert.doesNotMatch(out, /reference/);
});

// Neither file is deleted: only the layer 1 block leaves AGENTS.md. The
// one-line CLAUDE.md stays, so Claude Code keeps reading what remains.
test('🔴 a project keeps both AGENTS.md and CLAUDE.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unin-'));
  const agents = join(dir, 'AGENTS.md');
  const pointer = join(dir, 'CLAUDE.md');
  writeFileSync(
    agents,
    '# X\n\n<!-- layer1:start · a -->\nours\n<!-- layer1:end -->\n',
  );
  writeFileSync(pointer, '@AGENTS.md\n');

  run(CLI, ['--apply', dir]);
  assert.equal(readFileSync(agents, 'utf8'), '# X\n');
  assert.equal(readFileSync(pointer, 'utf8'), '@AGENTS.md\n');
});
