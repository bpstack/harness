# Traps — what behaves differently from how it looks

> **What it answers:** the things that will bite an agent on a real machine and
> that no rule of layer 1 should carry, because they belong to an OS, a version
> manager or a tool — not to the project. · **Who reads it:** an agent before
> touching the environment. · **How it is pruned:** an entry leaves when the
> tool that caused it changes; each one names its trigger.

Every entry passes the same two questions as a rule: it is true with its
evidence, and an agent would get it wrong without the line. What differs is the
scope: a rule is an invariant of every project; a trap is a fact about a machine
class.

## Windows + fnm: `fnm exec` only launches real executables

`fnm exec --using=NN pnpm|npm|npx` fails with
`Can't spawn program: program not found`. `npm i -g` generates `.cmd`/`.ps1`
shims, never `.exe`, and `fnm exec` spawns executables only. Installing the
package under that Node does not fix it — measured with pnpm already present, it
fails the same. The portable form, on Windows and Linux: launch `node` and
resolve the tool's `*-cli.js` from `process.execPath`.

_Trigger: Windows, fnm. Leaves if fnm starts resolving shims._

## `corepack enable` next to a pnpm from `npm -g`

Corepack's shims overlap the pnpm installed with `npm -g`, and a machine with
both — plus a standalone one — ends up with three installs fighting for one
`pnpm.cmd` (`EPERM`, 2026-06-07). A machine where corepack is the **only**
source of pnpm has no conflict: declare it as the exception rather than
disabling it, which would create the overlap.

_Trigger: two pnpm sources on one machine. Corepack is not shipped with Node 25;
the trap ages out with it._

## "pnpm global" is not one fact per machine

Under a version manager there is **one global pnpm per installed Node**, not one
per machine. Reading `pnpm -v` inside a repo reports the one the pinned Node
resolves, not "the machine's". A figure that varies along a dimension is
recorded as a table over that dimension — one number per machine hid a deviation
for two months.

_Trigger: any machine with more than one Node installed._

## `pnpm config get` proves the key is read, not that pnpm honours it

It answers from the file it parsed; it does not say whether the value has any
effect in this pnpm version, nor whether the key exists at all. To prove an
option works, trigger the behaviour it controls.

_Trigger: any pnpm. Measured on 2026-09-17 with pnpm 10.34.1, in
`pnpm-workspace.yaml`: an invented key answered `42`, and
`minimumReleaseAgeStrict: true` answered `true` and changed nothing._

⚠️ _Corrected on 2026-09-17. The example used to be "a key ignored in `.npmrc`
reads back fine", and that is not what was measured: in `.npmrc`,
`minimumReleaseAge` answers `undefined` and is ignored, while
`minimum-release-age` answers its value **and is applied**. The lesson stands;
the example did not._

## Windows: `pnpm verify` goes green when the script does not exist

Without `run`, pnpm falls through to the shell when it finds no script of that
name — and `verify` is a **builtin of cmd**, which exits 0. So the one command
that defines "done" reports success by not existing. `pnpm run verify` exits 1,
correctly. The short form is only safe while the script is there, and a rename
is all it takes.

Only names that collide with a shell builtin are affected, so this is not a
reason to distrust `pnpm test`; it is a reason to write `run` and stop having to
know which names collide.

_Trigger: Windows, PowerShell or cmd, any pnpm. Reproduced on 2026-09-07 in a
folder whose `package.json` had no `verify`: short form `LASTEXITCODE=0`, long
form `1`._

## A formatter can make the linter worse, and the code did not change

Reflowing a line moves the line above it too. An `eslint-disable-next-line`
stops pointing at the statement it was written for, and the rule it was
suppressing comes back — so the count goes **up** after a formatting pass that
touched no logic at all.

The reading it invites is the wrong one: that formatting broke something, or
that the code got worse. Neither happened. What moved was a comment.

**So measure lint after formatting, never before**, and when a count rises
across a `format`, look at what the reflow did to the suppressions before
looking at the code.

_Trigger: any formatter that reflows, next to any linter with line-scoped
suppressions. Measured on 2026-08-09: a chained call was reflowed and lint went
from 19 problems to 21._

## A session on the wrong Node: how it shows

A session keeps the Node it was launched with (layer 1, rule 9). When that is
not the repo's version, what breaks depends on what else the machine has:

- `ERR_PNPM_UNSUPPORTED_ENGINE` — another Node is on the PATH: the session
  starts, on the wrong version.
- `"node" is not recognized` — no Node outside the manager: nothing starts.
- `pnpm` is found and still fails — its shim needs a `node` to run.

These say it already happened. The fix is rule 9's: relaunch the session from a
terminal already on the repo's version.

_Trigger: any machine with a version manager. Moved out of layer 1 on
2026-09-17: it diagnoses, it does not prevent._

## Moving a list of settings: count the items

A list moved between files — permissions, allowed builds, dependencies — can
lose an item without anything failing. `onlyBuiltDependencies` went from four
packages to two, and with `node_modules` already populated the install did not
notice; it would have surfaced weeks later on another machine. Count before and
after.

_Trigger: any migration of a list-valued setting. Moved out of layer 1 on
2026-09-17._

## `minimumReleaseAge` does not fail an install: it quietly picks an older one

With the quarantine on, asking for something published inside the window does
not error. pnpm resolves the newest version old enough, installs it, and exits 0
— nothing in the output says so, and only the lockfile shows it. So when a
version is not the one you asked for, look at its publish date before looking at
the code.

`minimumReleaseAgeStrict: true` is documented to make this fail instead. **In
pnpm 10.34.1 it does not**: same request, same older build, exit 0.

_Trigger: pnpm with `minimumReleaseAge`. Measured on 2026-09-17 with pnpm
10.34.1: `typescript@next`, published 14 hours earlier, resolved to the build
from eight days before, exit 0 — with and without the strict setting._

## A `CLAUDE.md` you did not write hides the `AGENTS.md` you did

Claude Code reads `AGENTS.md` on its own from **v2.1.277** — but only where no
`CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` sits in the working
directory **or any directory above it**. Any of the three switches the native
path off, and nothing announces it: the session runs without the project's
instructions and reports nothing missing.

Two shapes bite, and neither is in the repo's own diff:

- **`CLAUDE.local.md`** — the file meant for your own uncommitted notes. Adding
  one to a project whose instructions live in `AGENTS.md` costs you `AGENTS.md`,
  and only you: the repo keeps working for everybody else.
- **A `CLAUDE.md` in a parent folder** — say in the directory your repos sit
  under. It is outside the repo, absent from its git, and it covers every
  project below it at once.

`~/.claude/CLAUDE.md` and managed instructions do **not** count; those keep
loading alongside `AGENTS.md`.

**How to tell**, because the usual check does not work here: an `AGENTS.md` read
natively is **not** listed by `/memory` or under **Memory files** in `/context`,
so that list cannot confirm it. What confirms it is the line an interactive
session prints at start — `no CLAUDE.md found; AGENTS.md loaded: <path>` — and
its **absence** is the signal. The fix is an `@AGENTS.md` import inside whatever
`CLAUDE.md` is shadowing it.

_Trigger: Claude Code v2.1.277 or later, any project whose instructions live in
`AGENTS.md`. Measured on 2026-09-21 with v2.1.278: a folder holding only an
`AGENTS.md` answered a question from it; a one-line `CLAUDE.local.md` about tabs
added beside it turned the same answer to `NONE`, and so did a one-line
`CLAUDE.md` placed one directory above. Leaves if the default **Project
instructions** value stops being `claude-md-or-agents-md`._
