// What the command does on disk, run as a command. The planner is tested in
// `lib/propagate.test.mjs`; this file exists for the effects a unit test
// cannot see — and it is the first test this CLI has ever had.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INIT = join(REPO, 'bin', 'init-project.mjs');
const CLI = join(REPO, 'bin', 'propagate.mjs');

const call = (cli, args) => {
  try {
    return execFileSync(process.execPath, [cli, ...args], {
      encoding: 'utf8',
    });
  } catch (error) {
    // A refusal exits 1 and still prints its report, which is what is read
    // here: swallowing the output would hide the very line under test.
    return String(error.stdout ?? '');
  }
};

// A repo that already carries the block, built by the generator rather than by
// a fixture: a hand-written copy of the block would drift from the real one and
// the test would go on passing while measuring nothing.
function harnessed() {
  const dir = mkdtempSync(join(tmpdir(), 'prop-'));
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
  call(INIT, ['--apply', dir]);
  return dir;
}

// Take one line out of the generated block so the file is genuinely stale.
function stale(dir) {
  const file = join(dir, 'AGENTS.md');
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.includes('layer1:start'));
  lines.splice(start + 3, 1);
  writeFileSync(file, lines.join('\n'));
  return file;
}

// 🔴 Until 2026-09-07 an `--apply` differed from a dry run only by the absence
// of the "nothing written" line, so a pass that rewrote N repos looked exactly
// like one that touched none. This command writes into other people's repos, so
// silence there is worse than in the generator.
test('--apply names the files it wrote', () => {
  const dir = harnessed();
  const file = stale(dir);
  const out = call(CLI, ['--apply', dir]);
  assert.match(out, /^1 written:$/m);
  assert.ok(out.includes(file), 'the written file is not named');
});

// The count comes from the writes, not from the plan. A file that needed
// nothing must not be reported as written.
test('a file already current is reported as written by nobody', () => {
  const dir = harnessed();
  const out = call(CLI, ['--apply', dir]);
  assert.match(out, /Nothing to write: every file was already current\./);
  assert.doesNotMatch(out, /written:/);
});

// The dry run keeps its own promise: it must claim nothing.
test('the dry run neither writes nor claims to have written', () => {
  const dir = harnessed();
  const file = stale(dir);
  const before = readFileSync(file, 'utf8');
  const out = call(CLI, [dir]);
  assert.match(out, /Dry run\. Nothing written\./);
  assert.doesNotMatch(out, /written:/);
  assert.equal(readFileSync(file, 'utf8'), before, 'the dry run wrote');
});

// 🔴 A path that is not there used to print the same benign line as a real
// repo without an AGENTS.md — "has no AGENTS.md" — and exit 0. In a sweep over
// twenty repos a mistyped path looked like an ordinary outcome, and the tool
// reported having considered a folder that never existed.
test('a path that does not exist is not the same as a repo without the file', () => {
  const gone = join(tmpdir(), 'harness-not-here-' + Date.now());
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [CLI, gone], { encoding: 'utf8' });
  } catch (error) {
    out = String(error.stdout ?? '');
    code = error.status;
  }
  assert.match(out, /does not exist/);
  assert.doesNotMatch(out, /has no AGENTS\.md/, 'a typo read as a normal repo');
  assert.equal(code, 1, 'a mistyped path did not fail the run');
});

// And a real repo that simply has no AGENTS.md stays benign: it is a fact
// about that repo, not a mistake by the caller.
test('a repo with no AGENTS.md still reports and does not cut', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prop-'));
  const out = call(CLI, [dir]);
  assert.match(out, /has no AGENTS\.md/);
  assert.doesNotMatch(out, /does not exist/);
});

// 🔴 The layers name two files this command never writes, and the generator
// that does write them refuses on a repo that already has an `AGENTS.md` — which
// is every repo this command is for. So a project harnessed by grafting could
// get them from nobody. Found on 2026-09-08 by comparing a grafted branch
// against an initialised one.
test('🔴 a grafted repo is told about the files the layers name and nothing wrote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prop-'));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'p', dependencies: { astro: '5.1.0' } }),
  );
  writeFileSync(join(dir, 'index.js'), 'export default 1;\n');
  // Its own AGENTS.md, with no marks: the graft case, and the reason the
  // generator refuses here.
  writeFileSync(join(dir, 'AGENTS.md'), '# Rules\n\n- ours, and nobody else\n');
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-qm', 'x');

  const out = call(CLI, ['--apply', dir]);
  assert.match(out, /the layers name what nothing here creates/);
  assert.match(out, /· CLAUDE\.md — the pointer to `AGENTS\.md`/);
  assert.match(out, /· docs\/DECISIONS\.md — rule 13/);
  // Reported, never created: adding files to someone else's tree is not this
  // command's business.
  assert.equal(existsSync(join(dir, 'CLAUDE.md')), false);
  assert.equal(existsSync(join(dir, 'docs', 'DECISIONS.md')), false);
});

// The other half. A repo the generator set up already has both, so the warning
// must stay silent — one that fires on the harness's own work teaches you to
// ignore the rest.
test('a repo the generator set up hears nothing about them', () => {
  const dir = harnessed();
  assert.doesNotMatch(call(CLI, ['--apply', dir]), /nothing here creates/);
});

// The harness is not a project: pointing propagate at it would strip its own
// layer 2 block (seen in a dry run on 2026-09-17).
test('🔴 the harness itself is refused, and the run fails', () => {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [CLI, REPO], { encoding: 'utf8' });
  } catch (error) {
    out = String(error.stdout ?? '');
    code = error.status;
  }
  assert.match(out, /is the harness itself/);
  assert.equal(code, 1);
});

test('a repo without AGENTS.md is pointed at /init-project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prop-'));
  assert.match(call(CLI, [dir]), /not harnessed, use \/init-project/);
});
