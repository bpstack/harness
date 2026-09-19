---
name: write-docs
description:
  Write or update project documentation in the place and format this repo
  already uses
kind: command
subtask: true
tools: bash, read, grep, glob, write, edit
bash-allow:
  - git log *
  - pnpm run *
  - gofmt -l *
  - cargo fmt *
  - ruff format *
---

Write documentation that follows **this project's** conventions. Scope:
`$ARGUMENTS` (a file, a module or a topic).

🔴 **Run each command on its own** — no `|`, `&&` or `cd` in front — and a
package script as `pnpm run <name>`. The tool allows a command by how it is
written, so anything added to it is refused.

## Step 1 — Where it goes

Read the project's `AGENTS.md` first: **if it says where something lives, that
wins.** Otherwise:

- **a decision and its why** → `docs/DECISIONS.md`, appended;
- **where the work stands** → `docs/SESSION.md`, overwritten;
- **a rule** → `AGENTS.md`, outside the harness marks;
- **how a module works** → next to its code.

🔴 **Check that the destination exists, file by file.** If it does not, but
another file in this repo already holds that content (`ROADMAP.md`, `TODO.md`,
`CHANGELOG.md`), write there and say why. If neither, **ask**: a new
documentation file changes how the project is organised.

## Step 2 — The filter, before a single line

Drop anything that fails one of these. Most "missing documentation" goes here.

- **The code or `git log` already tells it.** File lists, dependency dumps and
  narrated history go stale and nobody reads them.
- **It is hypothetical.** Document what exists, not what is planned.
- **It takes more than four lines.** Then it gets its own file, and the main
  document keeps the statement and a link.

## Step 3 — Write it

- **Decisions** — use **the format the destination file states**; the mould is
  `~/.claude/reference/templates/DECISIONS.md`. Every entry is born
  `🔶 proposed`: only the owner accepts it. An entry is never edited — a new one
  revises it, and the old one is marked.
- **State** — overwrite it, and keep it to about one screen. Before that, list
  what the session leaves open that is not already in the backlog (`ROADMAP.md`,
  `TODO.md`), and **ask** which items go there — only when something is open.
  Otherwise it disappears with the overwrite.
- **Corrections** — mark them (⚠️ or strikethrough) and say what was believed.
  Never delete them.

## Step 4 — Verify

- Relative links resolve.
- Every claim about the environment or the repo was **run**, not assumed. What
  could not be checked is written `❓ unverified`.
- Every claim about a library's behaviour was checked against its official
  documentation — Context7 first — at the version installed.
- The project's format check passes, **in check mode**. In JS, use the project's
  own script (`pnpm run format:check` or whatever it is called), not
  `pnpm exec`; elsewhere `gofmt -l .`, `cargo fmt --check`,
  `ruff format --check`.

## Output

```
## Documentation — <scope>

### Written
- <file> — <what was added>

### Dropped by the filter
- <what was not written, and why>

### Left open
- <what went to the backlog, and what did not>

### ❓ Unverified
- <what could not be checked>
```

Omit empty sections.

## Rules

- **Never create a file when an existing one owns that content.**
- **Never accept your own decision.**
- **Replace a stale paragraph** rather than adding a new one beside it.
