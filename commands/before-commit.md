---
name: before-commit
description:
  Check the change before committing — the project's gate, the diff, and the
  dependencies — and report
kind: command
subtask: true
tools: bash, read, grep, glob
bash-allow:
  - node -v
  - git status *
  - git diff *
  - pnpm run *
  - pnpm audit *
  - go vet *
  - go test *
  - govulncheck *
  - cargo test *
  - cargo audit *
  - pytest *
  - python -m pytest *
  - pip-audit *
---

Check what is about to be committed. **You report; you never fix and never
write.** Run the steps in order, for every language the project has
(`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml` / `requirements.txt`).

🔴 **Run each command on its own** — no `|`, `&&` or `cd` in front — and a
package script as `pnpm run <name>`. The tool allows a command by how it is
written, so anything added to it is refused.

## Step 1 — The right Node, in a JS project

Run `node -v` and compare it with `.nvmrc` (or `engines.node`). If it does not
match, **stop and say so**: a check on the wrong Node is a green worth nothing.

## Step 2 — What changes

Run `git status --short` and `git diff --stat`, then read the diff of each
changed file. Say in one line what the change is.

## Step 3 — The project's gate

- **JS** — `pnpm run verify`, which is what CI runs. If there is none, say so —
  it is a missing foundation — and run a test script **that ends**: prefer
  `test:run` or `test:ci`, never a watcher (`vitest` alone, `jest --watch`).
- **Go** — `go vet ./...`, then `go test ./...`.
- **Rust** — `cargo test`.
- **Python** — `pytest`, the way the project runs it (`uv run …`,
  `python -m …`).

**Read the exit code**, not the last lines. **If a gate fails, stop** and report
the failure and nothing else. If a project has no tests at all, say so and go
on.

## Step 4 — The diff, and only the diff

Look at the changed lines for what should not be committed:

- debug leftovers — `console.log`, `debugger`, `fmt.Println`, `dbg!`, `print(`;
- `TODO` or `FIXME` added in this change;
- an `.env`, a key or a token being added;
- commented-out code.

Cite each one as `path:line`.

## Step 5 — The dependencies

Report known vulnerabilities, **only with tools already installed** — a missing
one is named, not installed:

- **JS** — `pnpm audit --audit-level=high`
- **Go** — `govulncheck ./...`
- **Rust** — `cargo audit`
- **Python** — `pip-audit`, **never with `--fix`**

For each finding: package, severity, and whether a fixed version exists. **This
step never stops the command** — an advisory can appear with nothing changed in
the repo. If the database cannot be reached, say so: an audit that did not run
is not a clean one.

## Output

```
## Before commit — <what the change is>

**Gate:** <command: passed / failed / missing> · **Node:** <version, JS only>
**Audit:** <tool: nothing / N found, below / not run: why>

### To fix before committing
- <finding> — `path:line`

### Suggested next
- /write-docs — <what is undocumented, if anything>
```

Omit empty sections. If a gate failed, the output is the failure alone.

## Rules

- **Report, don't fix.** Making the change is the owner's call.
- **Never claim a check you did not run.** Say what was skipped and why.
- Any commit message you propose is in English, in Conventional Commits.
