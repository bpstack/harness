# harness

A reusable starting harness for new projects: rules, templates, agents and
commands, so a new repo does not begin with an empty `AGENTS.md`.

> **Status: early.** The generator, `propagate`, `sync-global` and `uninstall`
> work and are tested. The scaffolding this repo demands of every project it
> sets up is applied to itself: pinned Node, pnpm, LF line endings, and CI from
> the first commit. **If it cannot start itself correctly, it has no business
> starting anything else.**

## What it does, in one pass

You run `pnpm run init` in a new repo and it writes that repo's `AGENTS.md`: the
file every agent reads before touching anything.

1. **It looks at the repo** — the package manager and the scripts that exist —
   and says what it found and why, so a wrong guess can be argued with.
2. **It writes two layers into one file.** Layer 1 is the invariants, copied
   word for word into every project, between marks. Layer 2 is everything
   outside the marks: what only that project knows, and the harness never
   touches it.
3. **It marks what is its own.** The generated blocks sit between markers, and
   everything outside them survives every later pass byte for byte. That is what
   makes it safe to run again on a repo someone has been editing by hand.
4. **It refuses when it should.** A repo that already has content is not
   scaffolded over, and marks that do not pair are not guessed at.

Alongside that, `pnpm run sync:global` distributes the **global harness** — the
subagents, the commands and the reference material — to the folders each tool
reads, and it carries **guards** that fail the build rather than warn: leaked
private names, unmanaged marker families, broken links.

## Why it is like this

Opinions this harness imposes, stated up front rather than discovered by
tripping over them:

- **pnpm, never npm**, and its settings in `pnpm-workspace.yaml`. From pnpm 11 a
  setting left in `.npmrc` is ignored, and pnpm does not warn.
- **`AGENTS.md` is the source; `CLAUDE.md` is a pointer** to it. Two files with
  the same content diverge, and only one tool reads the second.
- **Two layers, one file.** Not one file per concern: an agent reads what is in
  front of it, and rules split across four documents get read as one or not at
  all.
- **One `DECISIONS.md`, append-only.** A decision that changes is not edited;
  another is appended that revises it, and the old one is marked.
- **Every rule brings its consequence**, in one line. If the tool already says
  it when it fails, the rule is noise.
- **Guards fail, they do not warn.** A check that passes while doing nothing is
  worse than no check, which is why `lint` must fail on warnings.
- **Dry run by default.** Anything that writes into someone else's repo shows
  what it would do first, and deletions are listed by name.

## What is here

| Path                                                       | What it is                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`layer1.md`](./layer1.md)                                 | The invariants copied into every project                                                   |
| [`templates/`](./templates/README.md)                      | The moulds each project document is written from, including [`ci.yml`](./templates/ci.yml) |
| [`reference/`](./reference/)                               | What agents open on demand: [`traps.md`](./reference/traps.md), the ASVS sheet             |
| [`agents/`](./agents/) · [`commands/`](./commands/)        | The global harness, in a neutral format                                                    |
| [`bin/`](./bin/) · [`lib/`](./lib/) · [`tests/`](./tests/) | The generator, the propagator, the guards, their libraries and their tests                 |

## Using it

The two commands that do the work. Both are **dry run by default**: they print
what they would do, and write only with `--apply`.

### `init-project` — a project's first `AGENTS.md`

```bash
pnpm run init ../a-project              # what it would write
pnpm run init --apply ../a-project
```

It writes **three files, not one**: `AGENTS.md` (the title, and layer 1 between
its marks), `CLAUDE.md` (a single `@AGENTS.md` line — without it Claude Code
reads none of this), and `docs/DECISIONS.md` from its mould.

**Re-running is safe, and is the point.** A second pass over an unchanged clone
reports `layers already current` and writes nothing. On a repo that already has
an `AGENTS.md` it refreshes layer 1 in place and leaves everything outside the
marks byte for byte: the section nobody can regenerate — what the model gets
wrong with _this_ code — is never scaffolded over.

📌 **It also reports the foundations, and does not fix them.** `.gitattributes`,
a pinned Node version, `packageManager`, a `verify` script, a CI workflow and
the rest: each one is named with the consequence of its absence, and left for
the owner. A generator that installs and configures on its own is exactly what
rule 4 forbids.

### `sync-global` — the agents, commands and reference material

```bash
pnpm run sync:global --dest <folder>            # what it would write
pnpm run sync:global --dest <folder> --apply
pnpm run sync:check                             # has the deployed copy drifted?
```

⚠️ **`--dest` is required to write, and has no default.** Writing into the real
configuration would put two sources behind one destination, and the last to run
would win in silence. `--check` reads only, so that reason does not reach it and
it defaults to your home — a guard that needs a folder passed to it is a guard
nobody runs.

It writes, under the destination, `.claude/agents/` and `.claude/commands/` in
each tool's dialect, `.claude/reference/` (`traps.md`, the ASVS sheet and the
moulds), and the install seal at `.claude/harness/install.json` — the version,
the date, the tools and where this clone lives, which is how the deployed
commands find these scripts again.

🔴 **It deletes as well as writes**, and only ever a file that carries the
harness mark and is no longer in the source: a renamed agent does not stay alive
next to its replacement. A file without the mark is someone else's — it is named
and left. `reference/` is never pruned.

Claude Code is always written; opencode only where `~/.config/opencode` already
exists, or with `--opencode` to set a machine up before installing it. Every run
ends by saying **what did not travel** — a bash allow-list cannot be expressed
in Claude Code's frontmatter, so it names each subagent where that happens
instead of letting the gap pass as applied.

## Verify

```bash
pnpm install
pnpm run verify
```

`verify` is what the CI runs — the same command, not a promise that drifts. The
CI workflow itself is a template at [`templates/ci.yml`](./templates/ci.yml): it
installs with `--frozen-lockfile` and calls `pnpm run verify`, so what passes
locally passes on the runner.

## Taking it out again

```bash
pnpm run uninstall ../a-project              # what would go
pnpm run uninstall --apply ../a-project
pnpm run uninstall --global --dest <folder> [--apply]
```

🔴 **This exists because installing something you cannot remove turns a trial
into a commitment.** It is the inverse of `propagate` and of `sync-global`, and
it leans on what those already built: the block marks in a project, and the
harness mark on every deployed agent and command.

**In a project**, the marked blocks leave the `AGENTS.md` and everything outside
them stays byte for byte — the same promise, read backwards. **The file itself
is never deleted**: layer 3 was written by a person, and no generator can put it
back. **`CLAUDE.md` is never deleted either**: it is one line, and it is what
lets Claude Code keep reading what remains in `AGENTS.md`.

**With `--global`**, the agents and commands that carry the harness mark, the
install seal, and — only when the seal is there — the files under
`~/.claude/reference/` that this clone still ships. **With neither mark nor seal
it removes nothing** and says so: there is no way to tell our files from yours,
and guessing is not an option.

📌 **Files this harness has a mould for but never generates** — the CI workflow,
`README`, `ROADMAP`, `TODO` and the two under `docs/` — are **named and left**.
They came from a mould once; what is written in them since is the project's.

⚠️ **What it cannot know:** whether somebody edited **inside** the marks,
against the instruction the marks themselves carry. That edit goes with the
block, and no reading of the file can tell it from generated text. Which is why
nothing is written without `--apply`, and the dry run prints what disappears.

## Commands and agents

- **[`agents/`](./agents/)** — reusable subagent prompts (`architect`,
  `reviewer`, `security`, `tester`). They are written in a neutral format and
  deployed by `sync-global` to the folder each tool reads. They carry the
  harness mark so `uninstall --global` can identify them.
- **[`commands/`](./commands/)** — reusable agent commands (`init-project`,
  `propagate`, `before-commit`, `commit-all`, `find-dead-code`, `write-docs`).
  Like the agents, they are neutral source files that `sync-global` deploys to
  both Claude Code and opencode, adapting the frontmatter for each tool via
  [`lib/dialects.mjs`](./lib/dialects.mjs).

The same content, two target formats. [`lib/dialects.mjs`](./lib/dialects.mjs)
is the single place that knows how Claude Code and opencode declare permissions,
tools, and bash allow-lists.

## The review shape

The harness ships four subagents, and this is how they are meant to be used:

- **`architect`** — before building. Read-only advisor on design and
  architecture.
- **`reviewer`** — over what was built. Read-only code review.
- **`security`** — over what was built. Read-only security review; at **L1** it
  works from its prompt, at **L2/L3** it cites versioned OWASP ASVS requirements
  from `reference/security/`.
- **`tester`** — to verify what was built. Runs tests, parses failures, proposes
  fixes.

Run them whenever you want, together or on their own.

## Who limits whose shell

The two tools do not restrict the same things, and the harness does not make
them match:

|                                 | Claude Code             | opencode                |
| ------------------------------- | ----------------------- | ----------------------- |
| **The four subagents**          | `Bash` **unrestricted** | restricted to a list    |
| **`init-project`, `propagate`** | restricted to a list    | `Bash` **unrestricted** |

- **Subagents in Claude Code**: `tools` is all or nothing, so a bash allow-list
  cannot be expressed there. Each subagent carries an instruction in its body
  instead.
- **Commands in opencode**: a command takes the permissions of the agent it
  names (`agent: build`); it declares none of its own.

Anything that changes `lib/dialects.mjs` or the frontmatter of `agents/` and
`commands/` can move this table — check it again.

## Official documentation of the two tools

For whoever maintains this harness: `dialects.mjs` and the agents follow what
each tool accepts, and these pages are where that is stated. They are not
shipped to projects, and **nothing checks these URLs** — a dead one stays dead
until someone follows it.

### Claude Code

| Topic                      | URL                                                        |
| -------------------------- | ---------------------------------------------------------- |
| Index (llms.txt)           | <https://code.claude.com/docs/llms.txt>                    |
| Skills                     | <https://code.claude.com/docs/en/skills>                   |
| Sub-agents                 | <https://code.claude.com/docs/en/sub-agents>               |
| Slash commands (Agent SDK) | <https://code.claude.com/docs/en/agent-sdk/slash-commands> |
| Agent teams                | <https://code.claude.com/docs/en/agent-teams>              |
| Prompt caching             | <https://code.claude.com/docs/en/prompt-caching>           |

### opencode

| Topic               | URL                                     |
| ------------------- | --------------------------------------- |
| Index               | <https://opencode.ai/docs/>             |
| Agents              | <https://opencode.ai/docs/agents/>      |
| Skills              | <https://opencode.ai/docs/skills/>      |
| Commands            | <https://opencode.ai/docs/commands/>    |
| Rules (`AGENTS.md`) | <https://opencode.ai/docs/rules/>       |
| Permissions         | <https://opencode.ai/docs/permissions/> |
| MCP (Context7)      | <https://opencode.ai/docs/mcp-servers/> |
| Plugins             | <https://opencode.ai/docs/plugins/>     |
| General config      | <https://opencode.ai/docs/config/>      |
| Tools               | <https://opencode.ai/docs/tools/>       |

## The leak guard

`pnpm run leaks` walks the repo for material that must never be published:
absolute developer paths and private repository names.

🔴 **The list of private names is not in this repo, by design.** This is the
public side; shipping that list here would publish the very thing the guard
defends. It is read from outside instead:

- `HARNESS_PRIVATE_NAMES=one,two pnpm run leaks`, or
- a git-ignored `.private-names` file, one name per line.

With neither, the guard still runs its pattern checks and **says out loud that
the name check was skipped**. A check that quietly does less than it claims is
worse than one that fails.

A line carrying `leak-guard:allow` is exempt. The marker is deliberately
greppable — `grep -rn 'leak-guard:allow'` lists every exemption — so a real leak
cannot be silenced quietly.

## Security, and the ASVS behind it

The `security` agent reviews by level. At **L1** it works from what its prompt
carries. At **L2/L3** it must cite versioned OWASP ASVS requirements, and it
takes them from the sheet this repo ships in
[`reference/security/`](./reference/security/asvs.md): a chapter map plus 17
indexes, one per chapter, generated from the official CSV. `sync-global` puts
the sheet where the agent reads it; if it is not there, the agent says so and
marks every finding as unversioned rather than inventing an id.

Keeping the sheet current is the job of `pnpm run asvs:check` and `asvs:update`.
Both run monthly from
[`.github/workflows/asvs.yml`](./.github/workflows/asvs.yml), and deliberately
not from `verify`: a check that time alone can turn red does not belong on
someone else’s pull request. How they decide, and why a newer OWASP version is
reported but never applied on its own, is in
[`reference/security/source/README.md`](./reference/security/source/README.md).

## Installing the agent CLIs

🔴 **Claude Code is required; opencode is optional.** `sync-global` always
writes the Claude Code files, and writes the opencode ones only where
`~/.config/opencode` already exists — or with `--opencode`, to set a machine up
before installing it.

Install Claude Code and opencode **standalone** (their own installers), never
with `npm i -g` under fnm or nvm: a global npm package is tied to the Node that
was active when it was installed, and gets duplicated per Node version —
_OpenCode cost two clean-ups and ~1.4 GB of copies that way_. The harness itself
has no such dependency: `sync-global` copies files, nothing more.
