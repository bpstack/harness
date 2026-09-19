import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  foundations,
  verifyCandidates,
  readCi,
  shortFormHits,
} from '../../lib/foundations.mjs';

const nothing = () => false;
const has =
  (...names) =>
  (n) =>
    names.includes(n);
const full = {
  packageManager: 'pnpm@10.34.1',
  engines: { node: '24.x' },
  scripts: { verify: 'pnpm run test' },
};

// 🔴 The harness demands a pinned version, a pinned manager, LF endings and a
// CI — four of layer 1's rules — and until 2026-09-07 it looked at none of them
// while generating the file that carries those very rules.
test('a bare project is told what layer 1 asks for and it lacks', () => {
  const { missing: out } = foundations({
    pkg: { scripts: { build: 'x' } },
    ci: null,
    exists: nothing,
  });
  const joined = out.join('\n');
  assert.match(joined, /`\.gitattributes` is missing/);
  assert.match(joined, /Node version is not pinned/);
  assert.match(joined, /`packageManager` is not in/);
  assert.match(joined, /no `verify` script/);
  assert.match(joined, /no CI workflow/);
  assert.equal(out.length, 5);
});

test('a project with all four in place is told nothing', () => {
  const { missing: out } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
  });
  assert.deepEqual(out, [], `it complained: ${out.join(' | ')}`);
});

// 🔴 Measured on 2026-09-09: a generator kept writing `>=22.0.0`, and the
// presence check above waved it through — there **was** an `engines.node`. A
// range admits any version above it, which is what a machine holding several
// installed Node versions needs a pin to rule out.
test('`engines.node` as a range is not a pin, even though it is there', () => {
  const { missing: out } = foundations({
    pkg: { ...full, engines: { node: '>=22.0.0' } },
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
  });
  assert.match(out.join('\n'), /`engines\.node` is `>=22\.0\.0`, a range/);
  assert.equal(out.length, 1);
});

test('a bare major or an `.x` pin are both accepted', () => {
  for (const node of ['24', '24.x', '24.16.0']) {
    const { missing: out } = foundations({
      pkg: { ...full, engines: { node } },
      ci: 'invokes-verify',
      exists: has('.gitattributes', '.nvmrc'),
    });
    assert.deepEqual(out, [], `${node} was rejected: ${out.join(' | ')}`);
  }
});

// 🔴 That a workflow exists says nothing about what it checks. One that lists
// its own steps looks like coverage and drifts from what runs on your machine.
test('a CI that does not invoke the check is worse than none in one way', () => {
  const { missing: out } = foundations({
    pkg: full,
    ci: 'does-not-invoke-verify',
    exists: has('.gitattributes', '.nvmrc'),
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /does not invoke/);
});

// 🔴 A green verify on your machine only proves your machine.
test('a .env is named, because CI will not have it', () => {
  const { missing: out } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc', '.env'),
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /leans on variables CI will not have/);
});

// 🔴 Only with a package.json. The CI mould invokes one command and nothing
// else, so in a repo with no manifest the workflow is born red — and a CI red
// on day one is ignored from day one.
test('a repo with no manifest is not told to add a CI', () => {
  const { missing: out } = foundations({
    pkg: null,
    ci: null,
    exists: nothing,
  });
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /gitattributes/);
});

// 🔴 It declares what does NOT check, not what does. A closed list of five
// names leaves a project whose scripts are called something else with no
// candidates at all.
test('a script with an unexpected name is still a candidate', () => {
  assert.deepEqual(verifyCandidates({ check: 'astro check', format: 'x' }), [
    'check',
    'format',
  ]);
});

test('what can never be a check is excluded, and lifecycles with it', () => {
  const c = verifyCandidates({
    dev: 'x',
    start: 'x',
    serve: 'x',
    preview: 'x',
    watch: 'x',
    verify: 'x',
    prebuild: 'x',
    postinstall: 'x',
    test: 'x',
  });
  assert.deepEqual(c, ['test']);
});

// 🔴 `build` opens the list: it is the check most often green and the only one
// that proves the project builds. And the rest are alphabetical so the output
// does not depend on the order they sit in package.json.
test('build comes first, and the order does not follow package.json', () => {
  const c = verifyCandidates({ zebra: 'x', test: 'x', build: 'x', alpha: 'x' });
  assert.deepEqual(c, ['build', 'test', 'alpha', 'zebra']);
});

// ⚠️ `format` is not excluded although its name suggests writing: it is often
// `prettier --check .`, and the warning prints the command beside the name
// because the name misleads and the command does not.
test('format is a candidate, and the command is what tells', () => {
  assert.ok(
    verifyCandidates({ format: 'prettier --check .' }).includes('format'),
  );
  const { missing: out } = foundations({
    pkg: { scripts: { format: 'prettier --check .' } },
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
  });
  assert.match(out.join(''), /`format` → `prettier --check \.`/);
});

test('the CI answer has three values, not two', () => {
  assert.equal(readCi([]), null);
  assert.equal(readCi(null), null);
  assert.equal(readCi(['- run: pnpm run build']), 'does-not-invoke-verify');
  assert.equal(readCi(['- run: pnpm run verify']), 'invokes-verify');
  // The short form is a trap of its own, but it is still invoking the check.
  assert.equal(readCi(['- run: pnpm verify']), 'invokes-verify');
});

// 🔴 Each pin passes on its own and the pair still disagrees: there is an
// `.nvmrc`, and `engines.node` is a pin rather than a range. Nothing looked at
// the two together, so a repo running one version per session and enforcing
// another at install came out clean.
test('two pins that disagree are caught, though each one is valid', () => {
  const { missing } = foundations({
    pkg: { ...full, engines: { node: '22.x' } },
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => '24\n',
  });
  assert.equal(missing.length, 1, missing.join(' | '));
  assert.match(missing[0], /`\.nvmrc` pins Node 24 and `engines\.node`/);
});

test('the same major written two ways is not a disagreement', () => {
  for (const [file, declared] of [
    ['24\n', '24.x'],
    ['24\r\n', '24'],
    ['v24.16.0\n', '24.x'],
  ]) {
    const { missing } = foundations({
      pkg: { ...full, engines: { node: declared } },
      ci: 'invokes-verify',
      exists: has('.gitattributes', '.nvmrc'),
      read: () => file,
    });
    assert.deepEqual(missing, [], `${file} vs ${declared}: ${missing.join()}`);
  }
});

// An `.nvmrc` with no number in it — `lts/jod`, an empty file — is not compared
// at all: a guess here would report a disagreement that does not exist.
test('an `.nvmrc` that names no number is not compared', () => {
  const { missing } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => 'lts/jod\n',
  });
  assert.deepEqual(missing, []);
});

// 🔴 `CHECKS = 7` was a constant, so a repo with no manifest was told `7
// checked` having looked at two. A figure that does not move when the code does
// is not a measurement, and it sat next to the misses lending them credibility.
test('the count is what ran, and what cannot run is not a pass', () => {
  const bare = foundations({ pkg: null, ci: null, exists: nothing });
  assert.equal(bare.checked + bare.skipped, 9);
  assert.ok(bare.skipped > 0, 'a repo with no manifest skips checks');
  assert.equal(bare.checked, 3);

  const whole = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => '24\n',
  });
  assert.equal(whole.skipped, 0);
  assert.equal(whole.checked, 9);
});

// 🔴 Windows: without `run`, pnpm falls through to the shell when no script of
// that name exists, and `verify` is a builtin of cmd — exit 0. The one command
// that defines "done" then passes by not existing.
test('`pnpm <script>` without `run` is found, with the line it sits on', () => {
  const hits = shortFormHits([
    { path: '.github/workflows/ci.yml', text: '      - run: pnpm verify\n' },
  ]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, '.github/workflows/ci.yml');
  assert.match(hits[0].line, /pnpm verify/);
});

// ⚠️ `pnpm test` and `pnpm audit` are commands of pnpm's own, not scripts, and
// `traps.md` says so in as many words. Flagging them would teach the reader to
// ignore the ones that matter.
test("pnpm's own commands are not reported as the short form", () => {
  const clean = [
    'pnpm test',
    'pnpm audit --audit-level=high',
    'pnpm install --frozen-lockfile',
    'pnpm run verify',
    'pnpm --filter web run build',
    'pnpm add -D prettier',
  ].map((text, i) => ({ path: `f${i}.md`, text }));
  assert.deepEqual(shortFormHits(clean), []);
});

test('the short-form check reaches the report, not just the library', () => {
  const { missing } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => '24\n',
    sources: [{ path: 'README.md', text: 'run `pnpm verify` before pushing' }],
  });
  assert.equal(missing.length, 1, missing.join(' | '));
  assert.match(missing[0], /short form `pnpm <script>`/);
});

// 🔴 Measured in a real repo on 2026-09-17: the first version of this check
// reported «Los ajustes de pnpm siguen en `.npmrc`» as an invocation, because
// the word after `pnpm` was `siguen`. Four of its sixteen findings were
// sentences — and a check whose findings are mostly prose gets ignored whole.
test('prose that merely mentions pnpm is not an invocation', () => {
  const prose = [
    'Los ajustes de pnpm siguen en `.npmrc`',
    'La regla 16 manda los ajustes de pnpm a `pnpm-workspace.yaml`',
    'we moved from npm to pnpm last year',
  ].map((text, i) => ({ path: `d${i}.md`, text }));
  assert.deepEqual(shortFormHits(prose), []);
});

// The flip side: inside a fence, in a backticked span, or as the value of a
// `run:` key, it is something a reader can copy and run.
test('code is scanned wherever a reader could copy it', () => {
  const fenced = {
    path: 'README.md',
    text: '```bash\npnpm typecheck\n```\n',
  };
  const inline = { path: 'docs/x.md', text: 'run `pnpm lint` before pushing' };
  const yaml = { path: 'ci.yml', text: '      - run: pnpm format:check\n' };
  for (const source of [fenced, inline, yaml])
    assert.equal(shortFormHits([source]).length, 1, source.path);
});

// The fence markers themselves are not code, and what follows a closing fence
// is prose again.
test('a closed fence stops being code', () => {
  const hits = shortFormHits([
    { path: 'a.md', text: '```\npnpm lint\n```\nluego pnpm hace lo suyo\n' },
  ]);
  assert.equal(hits.length, 1);
  assert.match(hits[0].line, /pnpm lint/);
});

// 📐 Measured on 2026-09-17 in a folder whose `package.json` had no scripts:
// `pnpm verify` exited **0** — the check passing by not existing — while
// `lint`, `typecheck`, `build`, `dev` and `start` all exited 1. So the risk is
// the name, not the short form, and the report says which one it found.
test('a name that collides with a shell builtin is the loud one', () => {
  const { missing } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => '24\n',
    sources: [{ path: 'ci.yml', text: '      - run: pnpm verify\n' }],
  });
  assert.equal(missing.length, 1, missing.join(' | '));
  assert.match(missing[0], /collides with a shell builtin/);
  assert.match(missing[0], /exits 0 when the script is missing/);
});

// 🔴 The other tier is one line, on purpose. A real repo produced 14 findings
// of which none could fail, and a warning that always fires teaches the reader
// to skip the one that matters.
test('names that cannot fail are counted, not listed', () => {
  const { missing } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => '24\n',
    sources: [
      { path: 'a.md', text: '```\npnpm lint\npnpm typecheck\npnpm build\n```' },
    ],
  });
  assert.equal(missing.length, 1);
  assert.match(missing[0], /3 line\(s\)/);
  assert.match(missing[0], /None of them can fail today/);
  // Counted, not listed: no file gets named.
  assert.doesNotMatch(missing[0], /a\.md/);
});

test('both tiers at once name the dangerous one and count the rest', () => {
  const { missing } = foundations({
    pkg: full,
    ci: 'invokes-verify',
    exists: has('.gitattributes', '.nvmrc'),
    read: () => '24\n',
    sources: [{ path: 'a.md', text: '```\npnpm lint\npnpm verify\n```' }],
  });
  assert.match(missing[0], /pnpm verify/);
  assert.match(missing[0], /Plus 1 more line\(s\)/);
  assert.doesNotMatch(missing[0], /pnpm lint/);
});
