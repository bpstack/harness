import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  planSync,
  render,
  parseArgs,
  driftNotice,
  foreignNotice,
  unmanagedMemory,
  opencodePermission,
  context7Notice,
} from '../../bin/sync-global.mjs';
import { MARK } from '../../lib/dialects.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Every file under a tree, so a claimed count can be checked against the disk.
const countFiles = (dir) =>
  readdirSync(dir).reduce(
    (n, e) =>
      n + (statSync(join(dir, e)).isDirectory() ? countFiles(join(dir, e)) : 1),
    0,
  );

const AGENT = [
  '---',
  'name: a',
  'description: d',
  'kind: agent',
  'tools: read',
  '---',
  '',
  'body',
].join('\n');

// A fake source tree, so the plan can be tested without touching disk.
const read = (kind) =>
  ({
    agents: [{ file: 'a.md', text: AGENT }],
    commands: [],
    templates: [{ file: 'T.md', text: 'a template' }],
  })[kind] ?? [];

test('--dest is parsed, and nothing is assumed without it', () => {
  assert.deepEqual(parseArgs(['--dest', '/x']), {
    apply: false,
    check: false,
    dest: '/x',
    opencode: false,
  });
  assert.equal(parseArgs(['--dest', '/x', '--opencode']).opencode, true);
  assert.equal(parseArgs([]).dest, null);
  assert.equal(parseArgs(['--dest', '/x', '--apply']).apply, true);
});

test('an agent is planned for both dialects', () => {
  const { writes } = planSync({ dest: '/dest', read });
  const paths = writes.map((w) => w.path.replace(/\\/g, '/'));
  assert.ok(paths.some((p) => p.endsWith('/dest/.claude/agents/a.md')));
  assert.ok(
    paths.some((p) => p.endsWith('/dest/.config/opencode/agents/a.md')),
  );
});

// 🔴 Without this the templates never reach the machine, and the rules that
// demand those files would ship with no means to write them.
test('templates are planned, verbatim and to one place', () => {
  const { writes } = planSync({ dest: '/dest', read });
  const t = writes.find((w) =>
    w.path.replace(/\\/g, '/').includes('templates'),
  );
  assert.ok(t, 'no template was planned');
  assert.equal(
    t.content.toString('utf8'),
    'a template',
    'a template must be copied byte for byte',
  );
  assert.equal(
    writes.filter((w) => w.path.includes('T.md')).length,
    1,
    'a template has no dialect: exactly one destination',
  );
});

test('a run with nothing to do says so rather than staying silent', () => {
  const text = render(
    { writes: [], prunes: [], warnings: [] },
    { apply: false, dest: '/d' },
  );
  assert.match(text, /0 to write/);
  assert.match(text, /Dry run/);
});

test('deletions are listed by name before anything is applied', () => {
  const text = render(
    { writes: [], prunes: [{ path: '/d/x.md', file: 'x.md' }], warnings: [] },
    { apply: false, dest: '/d' },
  );
  assert.match(text, /to DELETE/);
  assert.match(text, /x\.md/);
  assert.match(text, /not undone/);
});

// 🔴 The rules published in layer 1 name files by name. Shipping the
// obligation without the means to meet it manufactures violations.
//
// ⚠️ **`CLAUDE.md` left this list on 2026-09-18, and the test is what forced
// the check.** It said "three files", and by then layer 1 named two: rule 12
// names `docs/SESSION.md`, rule 13 names `docs/DECISIONS.md`, and **nothing
// names `CLAUDE.md`** — the pointer is one line the generator writes inline
// inline. The mould had no reader left and went with it; the obligation it
// existed to cover had gone before it did.
test('every template the rules demand exists in this repo', () => {
  const dir = join(REPO, 'templates');
  const present = readdirSync(dir);
  for (const required of ['SESSION.md', 'DECISIONS.md']) {
    assert.ok(present.includes(required), `templates/${required} is missing`);
  }
});

test('no template still carries the old-language rules block', () => {
  const dir = join(REPO, 'templates');
  for (const file of readdirSync(dir)) {
    const text = readFileSync(join(dir, file), 'utf8');
    assert.doesNotMatch(text, /reglas:inicio/, `${file} carries an old mark`);
  }
});

// --- drift between the source and the deployed copy ---

// 🔴 The failure with no symptom: the repo says one thing, the tool runs
// another, and the tests pass because they read the source, not the copy.
test('a drifted copy cuts, and names the command that fixes it', () => {
  const { text, cuts } = driftNotice({
    destinationExists: true,
    changes: 3,
    total: 3,
  });
  assert.equal(cuts, true);
  assert.match(text, /drifted from the source/);
  assert.match(text, /sync:global/);
});

test('a current copy says so and does not cut', () => {
  const { text, cuts } = driftNotice({
    destinationExists: true,
    changes: 0,
    total: 26,
  });
  assert.equal(cuts, false);
  assert.match(text, /is current./);
});

// ⚠️ In CI nothing is deployed, so everything reads as missing. Cutting there
// leaves a red the CI cannot fix, and a red nobody can fix gets ignored.
test('with nothing deployed it reports and never cuts', () => {
  const { text, cuts } = driftNotice({ destinationExists: false, changes: 99 });
  assert.equal(cuts, false);
  assert.match(text, /nothing to compare/);
});

test('one file drifted is singular, not "1 files"', () => {
  assert.match(
    driftNotice({ destinationExists: true, changes: 1, total: 1 }).text,
    /1 file has drifted/,
  );
});

test('--check is parsed and is not --apply', () => {
  const args = parseArgs(['--dest', '/x', '--check']);
  assert.equal(args.check, true);
  assert.equal(args.apply, false);
});

// 🔴 Written after --check shipped broken while twelve unit tests were green:
// none of them ran the command. Testing the module is not testing the command.
test('the command itself runs, and --check reports without writing', () => {
  const out = execFileSync(
    process.execPath,
    [
      join(REPO, 'bin', 'sync-global.mjs'),
      '--dest',
      '/definitely-not-here',
      '--check',
    ],
    { encoding: 'utf8' },
  );
  assert.match(out, /nothing to compare/);
});

test('the command refuses without --dest, and says why', () => {
  try {
    execFileSync(process.execPath, [join(REPO, 'bin', 'sync-global.mjs')], {
      encoding: 'utf8',
    });
    assert.fail('it should have exited non-zero');
  } catch (error) {
    assert.equal(error.status, 2);
    assert.match(String(error.stdout), /--dest is required/);
  }
});

// --- verbatim trees: recursive, and byte for byte ---

// 🔴 `reference/security/source/` holds a CSV and a PDF under a subfolder. A
// reader that filters by extension or skips folders drops them **silently**,
// which is exactly what the previous tool did.
test('a file in a subfolder is planned, keeping its subpath', () => {
  const nested = (kind) =>
    kind === 'reference'
      ? [{ file: 'security/source/asvs.csv', text: 'id,name' }]
      : [];
  const { writes } = planSync({ dest: '/dest', read: nested });
  const paths = writes.map((w) => w.path.replace(/\\/g, '/'));
  assert.ok(
    paths.some((p) =>
      p.endsWith('/dest/.claude/reference/security/source/asvs.csv'),
    ),
    `nested file not planned: ${paths.join(', ')}`,
  );
});

test('binary content survives the plan untouched', () => {
  const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0xfe]);
  const binary = (kind) =>
    kind === 'reference' ? [{ file: 'x.pdf', data: pdf }] : [];
  const { writes } = planSync({ dest: '/dest', read: binary });
  assert.ok(Buffer.isBuffer(writes[0].content));
  assert.ok(writes[0].content.equals(pdf));
});

// The templates destination sits inside the reference destination. Pruning
// the outer tree must not list the inner tree's own files as strangers.
test('pruning reference does not eat the templates it contains', () => {
  const { prunes } = planSync({ dest: '/dest', read });
  assert.equal(prunes.length, 0);
});

test('walk lists nested files with forward slashes', async () => {
  const { walk } = await import('../../bin/sync-global.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'walk-'));
  mkdirSync(join(dir, 'a', 'b'), { recursive: true });
  writeFileSync(join(dir, 'a', 'b', 'c.csv'), 'x');
  writeFileSync(join(dir, 'top.md'), 'y');
  assert.deepEqual(walk(dir).sort(), ['a/b/c.csv', 'top.md']);
});

// ── What may be deleted ──────────────────────────────────────────────────────
//
// These run against a real folder on purpose. The danger is only visible with
// files on disk, and it is the one defect of this tool that cannot be undone.

import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

function destWith(files) {
  const dest = mkdtempSync(join(tmpdir(), 'sync-'));
  for (const [rel, text] of Object.entries(files)) {
    const path = join(dest, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return dest;
}

test('🔴 a hand-written agent is never deleted, and is named', () => {
  const dest = destWith({ '.claude/agents/mine.md': 'my own agent' });
  const { prunes, foreign } = planSync({ dest, read });

  assert.deepEqual(prunes, [], 'a file without the mark is not ours');
  assert.equal(foreign.length > 0, true);
  assert.match(foreign.join('\n'), /mine\.md/);
  assert.match(foreign.join('\n'), /left alone/);
});

// 🔴 Overwriting is as final as deleting.
test('an unmarked file with a name we would write stops the plan', () => {
  const dest = destWith({ '.claude/agents/a.md': 'my own a' });
  const { writes, collisions } = planSync({ dest, read });
  assert.equal(collisions.length, 1);
  assert.match(collisions[0], /a\.md$/);
  assert.ok(!writes.some((w) => w.path === collisions[0]));
});

test('🔴 --apply with a collision writes nothing and fails', () => {
  const dest = destWith({ '.claude/agents/reviewer.md': 'my own reviewer' });
  const script = join(REPO, 'bin', 'sync-global.mjs');
  try {
    execFileSync(process.execPath, [script, '--dest', dest, '--apply'], {
      encoding: 'utf8',
    });
    assert.fail('it should have exited non-zero');
  } catch (error) {
    assert.equal(error.status, 1);
    assert.match(String(error.stdout), /without the harness mark/);
  }
  assert.equal(countFiles(dest), 1, 'something was written');
  assert.equal(
    readFileSync(join(dest, '.claude/agents/reviewer.md'), 'utf8'),
    'my own reviewer',
  );
});

test('a marked file no longer in the source is deleted; an unmarked one stays', () => {
  const dest = destWith({
    '.claude/agents/old.md': `---\nname: old\n---\n\n${MARK}\n\nbody`,
    '.claude/agents/mine.md': 'my own agent',
  });
  const { prunes, foreign } = planSync({ dest, read });

  assert.deepEqual(
    prunes.map((p) => p.file),
    ['old.md'],
  );
  assert.match(foreign.join('\n'), /mine\.md/);
});

// 🔴 reference/ holds a CSV and a PDF, with nowhere to carry the mark: it is
// overwritten, never pruned.
test('a spare file in reference is never deleted, even with the mark', () => {
  const dest = destWith({ [`.claude/reference/old.md`]: MARK });
  assert.deepEqual(planSync({ dest, read }).prunes, []);
});

test('--apply writes the seal and no record, and a second run finds nothing foreign', () => {
  const dest = destWith({});
  const node = process.execPath;
  const script = join(REPO, 'bin', 'sync-global.mjs');
  execFileSync(node, [script, '--dest', dest, '--apply']);

  assert.ok(existsSync(join(dest, '.claude', 'harness', 'install.json')));
  assert.equal(existsSync(join(dest, '.harness-sync.json')), false);
  const second = execFileSync(node, [script, '--dest', dest]).toString();
  assert.doesNotMatch(second, /did not put there/);
  assert.doesNotMatch(second, /to DELETE/);
});

// 🔴 The mirror of a rule that delegates to an empty place: material that is
// deployed to every machine and that **nothing tells an agent to open**. It
// fails silently in the worst way — the file is there, correct, and unread.
// Found on 2026-09-06: `reference/traps.md` shipped with no reader at all.
test('every top-level entry of reference/ is named by something outside it', () => {
  const refDir = join(REPO, 'reference');
  // Anything that can send a reader there: prompts, rules and the front door.
  const readers = ['agents', 'commands', 'templates', 'layer2']
    .flatMap((dir) => {
      const at = join(REPO, dir);
      return existsSync(at) ? readdirSync(at).map((f) => join(at, f)) : [];
    })
    .concat([join(REPO, 'README.md'), join(REPO, 'layer1.md')])
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  for (const entry of readdirSync(refDir, { withFileTypes: true })) {
    const named = entry.isDirectory()
      ? readdirSync(join(refDir, entry.name)).some((f) =>
          readers.includes(f),
        ) || readers.includes(`reference/${entry.name}`)
      : readers.includes(entry.name);
    assert.ok(
      named,
      `reference/${entry.name} is deployed and nothing names it: an agent ` +
        `will never open it. Point a prompt or the README at it, or drop it.`,
    );
  }
});

// 🔴 This is the command of the three that deletes. An `--apply`
// used to differ from a dry run only by the absence of the "nothing written"
// line: measured against a virgin folder it created 39 files and said nothing
// about any of them. The count is taken while writing, and includes the record
// so that the number matches what appears on disk.
test('--apply says how much it wrote and deleted, record included', () => {
  const dest = mkdtempSync(join(tmpdir(), 'sync-'));
  mkdirSync(join(dest, '.claude'), { recursive: true });
  const run = () =>
    execFileSync(
      process.execPath,
      [join(REPO, 'bin', 'sync-global.mjs'), '--dest', dest, '--apply'],
      { encoding: 'utf8' },
    );

  const first = run();
  const written = Number(first.match(/\n(\d+) written, (\d+) deleted/)[1]);
  assert.ok(written > 0, 'a virgin destination wrote nothing');
  assert.match(first, /plus \.claude\/harness\/install\.json\./);
  // The number is only worth printing if it matches the folder.
  const onDisk = countFiles(dest);
  assert.equal(onDisk, written + 1, `${written} claimed, ${onDisk} on disk`);

  // A second pass has nothing to do, and must claim nothing.
  assert.match(run(), /\n0 written, 0 deleted/);

  // The seal: four fields, and source is this clone.
  const seal = JSON.parse(
    readFileSync(join(dest, '.claude', 'harness', 'install.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(seal), [
    'version',
    'installedAt',
    'tools',
    'source',
  ]);
  assert.deepEqual(seal.tools, ['claude']);
  assert.equal(seal.source, REPO);
  assert.ok(seal.version.length > 0);
  assert.ok(!Number.isNaN(Date.parse(seal.installedAt)));
});

// What the harness put there and no longer wants is deleted, and the count says
// so: a deletion that happens silently is the one nobody can audit.
test('--apply counts a deletion it actually made', () => {
  const dest = mkdtempSync(join(tmpdir(), 'sync-'));
  mkdirSync(join(dest, '.claude'), { recursive: true });
  const run = () =>
    execFileSync(
      process.execPath,
      [join(REPO, 'bin', 'sync-global.mjs'), '--dest', dest, '--apply'],
      { encoding: 'utf8' },
    );
  run();

  // A marked file the source no longer has: the next pass prunes it.
  const folder = join('.claude', 'agents');
  writeFileSync(join(dest, folder, 'ghost.md'), `${MARK}\nfrom the harness\n`);

  assert.match(run(), /\n0 written, 1 deleted/);
  assert.equal(existsSync(join(dest, folder, 'ghost.md')), false);
});

// 🔴 Measured on 2026-09-07: a destination this tool had just written failed
// its own --check immediately — 9 files "drifted", exit 1 — and those 9 were
// the files of the harness that is not installed there. Writing stopped going
// to both dialects and the check did not follow, so the pair could never agree
// on a machine with one tool: red forever, and `sync:check` is meant to join
// `verify`. The absence of a program is not drift.
test('🔴 what --apply just wrote passes --check', () => {
  const dest = mkdtempSync(join(tmpdir(), 'sync-'));
  mkdirSync(join(dest, '.claude'), { recursive: true });
  const cli = join(REPO, 'bin', 'sync-global.mjs');
  const check = () => {
    try {
      return {
        out: execFileSync(process.execPath, [cli, '--check', '--dest', dest], {
          encoding: 'utf8',
        }),
        code: 0,
      };
    } catch (e) {
      return { out: String(e.stdout ?? ''), code: e.status };
    }
  };

  execFileSync(process.execPath, [cli, '--dest', dest, '--apply'], {
    encoding: 'utf8',
  });
  const fresh = check();
  assert.equal(fresh.code, 0, `a fresh apply did not pass its own check`);
  assert.match(fresh.out, /the deployed copy is current\./);

  // And it must not have gone quiet in exchange: a file deleted from a layout
  // that IS deployed is drift, not absence.
  const agents = join(dest, '.claude', 'agents');
  rmSync(join(agents, readdirSync(agents)[0]));
  const after = check();
  assert.equal(after.code, 1, 'a deleted file did not cut');
  assert.match(after.out, /drifted from the source/);
});

// Claude Code is always written; opencode only where its directory exists.
test('without opencode only claude is written; with it, both', () => {
  const cli = join(REPO, 'bin', 'sync-global.mjs');
  const dest = mkdtempSync(join(tmpdir(), 'sync-'));
  const run = () =>
    execFileSync(process.execPath, [cli, '--dest', dest, '--apply'], {
      encoding: 'utf8',
    });

  assert.match(run(), /claude only/);
  assert.equal(existsSync(join(dest, '.config', 'opencode', 'agents')), false);

  mkdirSync(join(dest, '.config', 'opencode'), { recursive: true });
  assert.match(run(), /opencode found here/);
  assert.ok(existsSync(join(dest, '.config', 'opencode', 'agents')));
});

// 🔴 The check existed for months and **nobody ran it**, because `verify` had
// no folder to pass and `--dest` was required. A guard nobody runs is not a
// guard. The reason `--dest` is required is about writing — two sources behind
// one destination, last one wins silently — and that reason does not reach a
// read-only question.
test('🔴 --check with no --dest asks about this machine instead of refusing', () => {
  // Drift exits 1 and is a legitimate answer here; only the usage text is not.
  let out;
  try {
    out = execFileSync(
      process.execPath,
      [join(REPO, 'bin', 'sync-global.mjs'), '--check'],
      { encoding: 'utf8' },
    );
  } catch (e) {
    out = e.stdout;
  }
  assert.doesNotMatch(out, /usage:/, 'a read-only check still demanded a dest');
});

// And the half that must not move: writing still requires being told where.
test('--apply with no --dest still refuses', () => {
  let out = '';
  let code = 0;
  try {
    execFileSync(
      process.execPath,
      [join(REPO, 'bin', 'sync-global.mjs'), '--apply'],
      { encoding: 'utf8' },
    );
  } catch (error) {
    out = String(error.stdout ?? '');
    code = error.status;
  }
  assert.match(out, /usage:/);
  assert.match(out, /required to write/);
  assert.equal(code, 2);
});

// ── What is said, and never written ─────────────────────────────────────────

test('the foreign notice names every file, and says they stay', () => {
  const line = foreignNotice(['mine.md', 'theirs.md'], '.claude/agents');
  assert.match(line, /mine\.md, theirs\.md/);
  assert.match(line, /left alone/);
  assert.match(line, /\.claude\/agents/);
});

test('one foreign file reads as one, not as «1 files»', () => {
  assert.match(foreignNotice(['mine.md'], 'x'), /1 file this harness/);
});

test('no foreign files produces no notice at all', () => {
  assert.equal(foreignNotice([], '.claude/agents'), null);
});

// 🔴 `~/.claude/CLAUDE.md` is the user-level memory: Claude Code loads it in
// **every** session, and in a folder with no AGENTS.md it is the only thing it
// loads. This harness must not write or delete it — those rules are the
// owner's — but it sat outside every managed folder, so it never appeared in
// the foreign notice either. Measured 2026-09-07: written by nobody, deleted by
// nobody, **mentioned by nobody**.
test('the memory this harness does not manage is still named', () => {
  const said = unmanagedMemory(true);
  assert.ok(said, 'a CLAUDE.md at the root went unmentioned');
  assert.match(said, /does not write it, delete it or update it/);
  assert.match(said, /every session/);
  // And it says where the rest belongs, so the file does not grow back.
  assert.match(said, /arrives in its own `AGENTS\.md`/);
});

test('and nothing is said when there is none', () => {
  assert.equal(unmanagedMemory(false), null);
  assert.equal(unmanagedMemory(undefined), null);
});

// 🔴 That an opencode agent can read `~/.claude/reference/` was measured in
// execution on 2026-08-07 — the `security` subagent opened the sheet and quoted
// four requirements with their line numbers. What nobody checked is **who puts
// the permission rule there**. Nothing does: this tool writes agents and
// commands, never config, and the machine it was measured on already had the
// line from months earlier. It works there because the old harness came first.
test('🔴 opencode without the rule is told, because the default is ask', () => {
  const notice = opencodePermission({});
  assert.match(notice, /no rule letting agents read/);
  assert.match(notice, /defaults to \*\*ask\*\*/);
  assert.match(notice, /does not write that file/);
});

test('a rule naming the reference path silences it', () => {
  const config = {
    permission: { external_directory: { '~/.claude/reference/**': 'allow' } },
  };
  assert.equal(opencodePermission(config), null);
});

// Someone who allows every external directory has answered the question too,
// and repeating it at them is the noise this file exists to avoid.
test('a blanket allow silences it as well', () => {
  assert.equal(
    opencodePermission({ permission: { external_directory: 'allow' } }),
    null,
  );
});

// A rule that names the path and denies it is a decision, not an omission —
// but it is not an allow either, so the notice stands: the agent still cannot
// read what it is told to cite.
test('a rule that denies the path still gets the notice', () => {
  const config = {
    permission: { external_directory: { '~/.claude/reference/**': 'deny' } },
  };
  assert.match(opencodePermission(config), /no rule letting agents read/);
});

// 🔴 The other half: a machine with no opencode must hear nothing. Telling a
// Claude-only user to edit a config they do not have is exactly the kind of
// notice that teaches people to skip notices.
test('🔴 a machine without opencode is not told to edit a config it lacks', () => {
  assert.equal(opencodePermission(null), null);
});

// --- Context7 ---

test('Context7 in both configs says nothing', () => {
  assert.equal(
    context7Notice({ claude: ['context7'], opencode: ['context7'] }),
    null,
  );
});

test('a missing Context7 names the file it is missing from', () => {
  const said = context7Notice({ claude: [], opencode: ['context7'] });
  assert.match(said, /~\/\.claude\.json/);
  assert.doesNotMatch(said, /opencode\.json/);
});

test('opencode not written here is not asked about', () => {
  assert.equal(context7Notice({ claude: ['Context7'], opencode: null }), null);
});

// 🔴 The entry may carry an API key: only the name is read, and nothing of the
// entry reaches the output.
test('🔴 the Context7 check reads names only and never prints the entry', () => {
  const dest = destWith({
    '.claude.json': JSON.stringify({
      mcpServers: { other: { headers: { Authorization: 'SECRET-123' } } },
    }),
  });
  const said = planSync({ dest, read }).foreign.join('\n');
  assert.match(said, /No Context7/);
  assert.doesNotMatch(said, /SECRET-123/);

  writeFileSync(
    join(dest, '.claude.json'),
    JSON.stringify({ mcpServers: { context7: { headers: { k: 'SECRET' } } } }),
  );
  const again = planSync({ dest, read, targets: ['claude'] });
  assert.doesNotMatch(again.foreign.join('\n'), /Context7/);
});
