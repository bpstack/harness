// What a project needs to **be able** to work, as opposed to what the generator
// writes, which is documentation of **how** it works. Layer 1 demands four of
// these things — a pinned version, a pinned package manager, LF endings and a
// CI that runs one command — and until now nothing looked at whether they were
// there. **The harness handed out the rules and never mentioned the gaps.**
//
// 🔴 **It warns, it does not install.** Writing into another repo's
// `package.json` is configuring on your own account, and that is not the
// script's to decide. Out comes a list of sentences; the decision stays with
// whoever reads them.
//
// The order matters, and it goes from most fundamental to most derived: a CI
// built on an unpinned version verifies an environment that is not yours.

// 🔴 **It declares what does NOT check, not what does.** A closed list of five
// names leaves a project whose scripts are called something else with no
// candidates at all — measured on a repo whose checks were named `check` and
// `format`: neither was on the list, and the proposal came out with no type
// checking and without the only candidate that was failing.
//
// 📐 **And the cheap mistake is one too many, not one too few.** A bad
// candidate costs **one command**: you run it, see it checks nothing, and drop
// it. A missing one costs **the whole check, forever**, and nobody finds out.
const NEVER_CHECKS = new Set([
  'dev',
  'start',
  'serve',
  'preview',
  'watch',
  'verify',
]);

// ⚠️ `format` is **not** excluded, though the name suggests it writes: it is
// often `prettier --check .`. Excluding it by its name would repeat the mistake
// in the other direction, which is why the warning prints **the command next to
// the name**: the name misleads and the command does not.

// 🔴 `build` opens the list, and that is not a detail: it is the check most
// often green and the only one that proves the project **builds**. It was
// missing from an earlier version of this list, and the tool left out the one
// thing that was passing.
const CANONICAL = ['build', 'lint', 'typecheck', 'format:check', 'test'];

// Lifecycle scripts are invoked by the package manager, not by CI: chaining
// them into `verify` would run them twice.
const isLifecycle = (name) => /^(pre|post)/.test(name);

// Anything that admits more than one version: a comparator, a caret, a tilde,
// an OR, or a space-separated set. `24.x` and a bare `24` are pins and stay
// out; `24.x.x` never appears in the wild so it is not special-cased.
const RANGE = />=|<=|[<>~^]|\|\||\s/;

// The major both pins are really talking about, so `24`, `v24.16.0`, `24.x` and
// a file that ends in CRLF all answer the same thing. Anything with no leading
// number — `lts/jod`, an empty file — answers `null` and is not compared: a
// wrong guess here would report a disagreement that does not exist.
const majorOf = (value) => {
  const match = /^v?(\d+)/.exec(String(value ?? '').trim());
  return match ? match[1] : null;
};

export function verifyCandidates(scripts = {}) {
  const all = Object.keys(scripts).filter(
    (n) => !NEVER_CHECKS.has(n) && !isLifecycle(n),
  );
  // The canonical ones first and in their order; the rest behind, alphabetical,
  // so the output does not depend on the order they sit in `package.json`.
  const canonical = CANONICAL.filter((n) => all.includes(n));
  return [...canonical, ...all.filter((n) => !canonical.includes(n)).sort()];
}

// What `pnpm <word>` means when the word is one of these: a command of pnpm's
// own, not a script of the project. `pnpm test` and `pnpm audit` are real
// commands and are **not** reported — `traps.md` says so in as many words, and
// flagging them would teach the reader to ignore the ones that matter.
const PNPM_COMMANDS = new Set([
  'run',
  'install',
  'i',
  'add',
  'remove',
  'rm',
  'update',
  'up',
  'test',
  't',
  'audit',
  'exec',
  'dlx',
  'create',
  'init',
  'publish',
  'pack',
  'config',
  'store',
  'why',
  'list',
  'ls',
  'outdated',
  'licenses',
  'link',
  'unlink',
  'prune',
  'rebuild',
  'fetch',
  'import',
  'patch',
  'deploy',
  'env',
  'dedupe',
  'doctor',
  'bin',
  'root',
  'start',
  'server',
  'approve-builds',
]);

// 🔴 Flags that take a **separate** value, because their value looks exactly
// like a script name. `pnpm --filter web run build` is correct, and a scan that
// does not know `web` belongs to `--filter` reports it as the short form — the
// false positive that would get this whole check ignored. The `--filter=web`
// spelling needs none of this.
const VALUE_FLAGS = new Set([
  '--filter',
  '-F',
  '--filter-prod',
  '--dir',
  '-C',
  '--reporter',
  '--config',
  '--loglevel',
]);

// 🔴 **Prose that mentions pnpm is not a command, and reading it as one is what
// would get this check ignored.** Measured on 2026-09-17 against a real repo:
// the first version reported _«Los ajustes de pnpm siguen en `.npmrc`»_ as a
// short-form invocation, because the word after `pnpm` was `siguen`. Four of
// its sixteen findings were sentences. So only **code** is scanned: a fenced
// block, the value of a `run:`/`cmd:` key, or a span between backticks —
// everywhere a reader could copy a line and run it.
function codeSegments(line, inFence) {
  if (inFence) return [line];
  const keyed = /(?:^|\s)(?:run|cmd|command|script|entrypoint):\s*(.+)$/.exec(
    line,
  );
  if (keyed) return [keyed[1]];
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

// Every `pnpm <script>` written without `run`, with the line it sits on so the
// reader sees the command rather than a count. Walked token by token rather
// than matched in one go: a regex cannot tell an option's value from a script
// name, and that is the distinction the whole check rests on.
export function shortFormHits(sources = []) {
  const hits = [];
  for (const { path, text } of sources) {
    let inFence = false;
    for (const raw of String(text ?? '').split(/\r?\n/)) {
      if (/^\s*(```|~~~)/.test(raw)) {
        inFence = !inFence;
        continue;
      }
      const script = codeSegments(raw, inFence).map(isShortForm).find(Boolean);
      if (script)
        hits.push({
          path,
          line: raw.trim(),
          script,
          risky: SHELL_BUILTINS.has(script),
        });
    }
  }
  return hits;
}

// 🔴 **The names where the short form actually bites.** Without `run`, pnpm
// falls through to the shell only when it has no command of that name, and the
// fall-through is harmless unless the shell *does* have one — then the line
// exits 0 and the check passes by not existing.
//
// 📐 Measured on 2026-09-17, in a folder whose `package.json` had no scripts at
// all: `pnpm verify` exited **0**; `lint`, `typecheck`, `build`, `dev` and
// `start` all exited 1. So this set is the whole risk, and everything else is
// one rename away from joining it — which is worth a line, not a list.
//
// These are `cmd` builtins that pnpm does not claim itself and that somebody
// might plausibly name a script.
const SHELL_BUILTINS = new Set([
  'verify',
  'type',
  'set',
  'path',
  'date',
  'time',
  'dir',
  'echo',
  'copy',
  'move',
  'del',
  'erase',
  'ren',
  'rename',
  'title',
  'pause',
  'call',
  'color',
  'ver',
  'vol',
  'cls',
  'mkdir',
  'rmdir',
]);

// The script a piece of code invokes without `run`, or `null` if it invokes
// nothing of the sort.
function isShortForm(segment) {
  const tokens = segment.split(/\s+/).filter(Boolean);
  const at = tokens.findIndex((t) => /(^|[/\\])pnpm$/.test(t));
  if (at === -1) return false;

  let i = at + 1;
  while (i < tokens.length && tokens[i].startsWith('-')) {
    const flag = tokens[i].split('=')[0];
    i += VALUE_FLAGS.has(flag) && !tokens[i].includes('=') ? 2 : 1;
  }
  const word = tokens[i]?.replace(/[`'",;)]+$/, '');
  if (!word || !/^[A-Za-z][\w:.-]*$/.test(word)) return null;
  return PNPM_COMMANDS.has(word) ? null : word;
}

// How many things this list looks at. Reported alongside the misses so that
// "nothing missing" is a statement with a number behind it rather than a
// silence: six checks ran, six passed.
//
// 🔴 **The count comes from the checks themselves, and used to be a constant.**
// `CHECKS = 7` said seven in a repo with no `package.json`, where five of them
// cannot run at all: the report read `7 checked` having looked at two. A figure
// that does not move when the code does is not a measurement, and this one sat
// next to the misses lending them its credibility. Now every check declares
// whether it applies, so "checked" and "skipped" are counted where the decision
// is taken and cannot drift from it.
export function foundations({
  pkg,
  ci,
  exists,
  read = () => null,
  sources = [],
}) {
  const out = [];
  const scripts = pkg?.scripts ?? {};

  let checked = 0;
  let skipped = 0;
  // A check that does not apply is **not** a check that passed. Both numbers
  // travel so the report can say "5 do not apply" instead of implying seven
  // clean results.
  const check = (applies, run) => {
    if (!applies) {
      skipped += 1;
      return;
    }
    checked += 1;
    const message = run();
    if (message) out.push(message);
  };

  // `.gitattributes` — the rule that asked for it became this file. It needs no
  // manifest, so it is the one check that runs in every repo.
  check(true, () =>
    exists('.gitattributes')
      ? null
      : '`.gitattributes` is missing. Without it line endings diverge between ' +
        'machines and a diff stops meaning anything — and `.nvmrc` read as ' +
        '"24\\r" breaks both the auto-switch and the CI',
  );

  // The version pin — the rule that asked for it became this check.
  check(Boolean(pkg), () =>
    !exists('.nvmrc') && !pkg.engines?.node
      ? 'the Node version is not pinned: no `.nvmrc`, no `engines.node`'
      : null,
  );

  // 🔴 The pin again, the half that presence alone does not catch. A range
  // like `>=22.0.0` satisfies "there is an `engines.node`" and pins nothing:
  // any Node from 22 up installs clean, which is what a fleet with several
  // versions on the same machine needs a real pin to prevent. Reported twice
  // from the same generator run on 2026-09-09.
  check(Boolean(pkg), () =>
    RANGE.test(pkg.engines?.node ?? '')
      ? `\`engines.node\` is \`${pkg.engines.node}\`, a range and not a pin: ` +
        'any version it admits installs without complaint. Match it to ' +
        '`.nvmrc` — a bare major (`24`) becomes `24.x`'
      : null,
  );

  // 🔴 **Two pins that disagree are worse than one pin missing.** Each of the
  // checks above passes on its own: there is an `.nvmrc`, and `engines.node` is
  // a pin and not a range — and they can still name different majors. Nothing
  // looked at the pair, so a repo pinned to 24 for the session and to 22 for
  // the install came out clean. The session runs one, the install enforces the
  // other, and the disagreement surfaces as an unrelated failure somewhere
  // else. `engines.node` is **derived** from `.nvmrc` (`24` → `24.x`), so the
  // one that moved is the one to fix, and only the owner knows which.
  check(Boolean(pkg && exists('.nvmrc') && pkg.engines?.node), () => {
    const pinned = majorOf(read('.nvmrc'));
    const declared = majorOf(pkg.engines.node);
    return pinned && declared && pinned !== declared
      ? `\`.nvmrc\` pins Node ${pinned} and \`engines.node\` declares ` +
          `\`${pkg.engines.node}\` (${declared}): two pins that disagree. ` +
          '`engines.node` derives from `.nvmrc` — a bare major (`24`) becomes ' +
          '`24.x` — so they answer the same question with two answers, and ' +
          'which one is right is not something this can know'
      : null;
  });

  // Rule 10.
  check(Boolean(pkg), () =>
    !pkg.packageManager
      ? '`packageManager` is not in `package.json`, so the pnpm version is ' +
        'not pinned and two machines can install differently'
      : null,
  );

  // 🔴 Candidates, not a finished `verify`. Composing one assumes the scripts
  // are green, and there is no way to know without running them — a proposal
  // once chained the only two that were failing. So what can be asserted here
  // is **what to look at**, not what to write.
  check(Boolean(pkg), () => {
    if (scripts.verify) return null;
    const found = verifyCandidates(scripts);
    return found.length
      ? 'there is no `verify` script, which is the only thing CI invokes. ' +
          `Candidates already here: ${found
            .map((s) => `\`${s}\` → \`${scripts[s]}\``)
            .join(' · ')}. **The name misleads and the command does not**: ` +
          'one of those may write rather than check, and you see it by ' +
          'reading what it runs. **Run them one at a time before chaining ' +
          'them**, and the ones that come out red stay out and are declared ' +
          'as a written exception: a `verify` born red is ignored from day ' +
          'one. 🔴 **But green is not enough**: what belongs in it is the ' +
          'check that **exits non-zero on a problem it reports itself**. ' +
          '`eslint` exits **0** on "1 problem (0 errors, 1 warning)", so it ' +
          'needs `--max-warnings=0` or its green asserts nothing'
      : 'there is no `verify` script and nothing to chain into one. Before a ' +
          'CI comes the first check: without one, green asserts nothing';
  });

  // 🔴 That a workflow exists says nothing about what it checks. A CI can sit
  // green for months running only `build` while the lint errors nobody sees
  // pile up. Existing is not working.
  //
  // 🔴 **Only with `pkg`.** The CI mould invokes `pnpm run verify` and nothing
  // else, so in a repo with no `package.json` there is no script for it to
  // invoke: the workflow is born red. And a CI red on day one is ignored from
  // day one, which is what this same file says three warnings above.
  check(Boolean(pkg), () => {
    if (ci === null)
      return (
        'there is no CI workflow, so "done" here is an opinion. The mould is ' +
        'at `~/.claude/reference/templates/ci.yml` and goes to ' +
        '`.github/workflows/ci.yml`'
      );
    if (ci === 'does-not-invoke-verify')
      return (
        'there is a CI workflow but it **does not invoke `verify`**: it lists ' +
        'its own checks, so what runs on your machine and what runs in CI are ' +
        'two lists that drift apart. The green of that CI does not assert ' +
        'what you think it asserts'
      );
    return null;
  });

  // 🔴 **The one command that defines "done" can report success by not
  // existing.** Without `run`, pnpm falls through to the shell when it finds no
  // script of that name, and `verify` is a **builtin of cmd**, which exits 0.
  // So the short form goes green on Windows in a repo where the script was
  // renamed or never written — see `reference/traps.md`, reproduced on
  // 2026-09-07: short form `LASTEXITCODE=0`, long form `1`.
  //
  // 🔴 **It is a sweep, not a judgement, which is why it is here and not in the
  // prompt.** One missed line in one workflow is the whole point of the check,
  // and reading every file for one exact string is what an agent does well
  // right up until it stops.
  //
  // `readCi` deliberately accepts the short form — it answers *what* a workflow
  // invokes, not how well it is written. This answers the other half.
  check(true, () => {
    const hits = shortFormHits(sources);
    if (!hits.length) return null;

    // 🔴 **Two tiers, because otherwise this is noise.** Measured on a real
    // repo on 2026-09-17: 14 lines used the short form and **not one of them
    // could fail** — no script was named after a shell builtin. Fourteen
    // findings that all mean "nothing is wrong" is how a reader learns to skip
    // the one that does.
    const risky = hits.filter((h) => h.risky);
    if (!risky.length) {
      return (
        `${hits.length} line(s) use \`pnpm <script>\` where ` +
        '`pnpm run <script>` belongs. **None of them can fail today** — the ' +
        'short form only goes green on Windows when the script name collides ' +
        'with a shell builtin, and none of these does. Worth `run` anyway: a ' +
        'rename is all it takes to join the other tier'
      );
    }
    const rest = hits.length - risky.length;
    return (
      '🔴 the short form `pnpm <script>` is used on a name that **collides ' +
      'with a shell builtin**, so on Windows it **exits 0 when the script is ' +
      'missing** and the check passes by not existing: ' +
      risky.map((h) => `\`${h.path}\` → \`${h.line}\``).join(' · ') +
      (rest
        ? `. Plus ${rest} more line(s) whose names cannot fail today`
        : '') +
      '. `pnpm run <script>` exits 1, correctly'
    );
  });

  // 🔴 A green `verify` on your machine only proves **your machine**. If the
  // repo has a `.env`, the build is using it and the runner **will not have
  // it**: rule 3 requires it gitignored, so it does not travel by construction.
  //
  // _Measured while harnessing a repo with months on it:_ `verify` gave exit 0
  // in place and **exit 1 on a clean clone**, because the prerender initialised
  // an SDK that demands ten environment variables. The CI would have been
  // committed **born red**, and nobody would have known until the first push.
  //
  // It is the lesson of the link checker one floor down: a check that runs in
  // one environment **only checks that environment**. There it was the
  // operating system; here it is having the variables file next to you.
  check(true, () =>
    exists('.env')
      ? 'this repo has a `.env`, so **your local `verify` leans on variables ' +
        'CI will not have** — rule 3 gitignores it, so it does not travel. ' +
        '**Check before committing the workflow**: clone clean, install with ' +
        'a frozen lockfile and run `verify` there. If it comes out red, the ' +
        'CI would be born red'
      : null,
  );

  return { missing: out, checked, skipped };
}

// Whether a CI exists and whether it invokes `verify`. Three answers, not two:
// `null` is no workflow at all, and the other two tell a workflow that runs the
// one command from a workflow that enumerates its own checks. The difference
// matters because the second looks like coverage and drifts.
//
// ⚠️ It accepts `pnpm verify` as well as `pnpm run verify`. The short form is a
// trap of its own on Windows — it goes green when the script does not exist —
// but a workflow using it **is** invoking the check, and this function answers
// what it invokes, not how well it is written.
export function readCi(files) {
  if (!files || !files.length) return null;
  const invokes = files.some((text) =>
    /\b(pnpm|npm|yarn)\s+(run\s+)?verify\b/.test(String(text)),
  );
  return invokes ? 'invokes-verify' : 'does-not-invoke-verify';
}
