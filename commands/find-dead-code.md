---
name: find-dead-code
description:
  Find code that is defined but never used, with each language's own tools, and
  report it
kind: command
subtask: true
tools: bash, read, grep, glob
bash-allow:
  - pnpm exec knip *
  - pnpm exec tsc *
  - go vet *
  - deadcode *
  - cargo check *
  - ruff check *
  - vulture *
  - python -m vulture *
---

Find dead code and report it. **You never delete or edit a file.** Scope:
`$ARGUMENTS` (a folder or a pattern); if empty, the whole project.

🔴 **Run each command on its own** — no `|`, `&&` or `cd` in front — and a
package script as `pnpm run <name>`. The tool allows a command by how it is
written, so anything added to it is refused.

## Step 1 — Run each language's own tools

Look at which manifests the project has, and run every row that applies. **A
tool answers the same for everyone; a guess does not** — so tools come first.

- **`package.json`** — `pnpm exec knip`: unused files, exports and dependencies.
  `pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters`: unused locals
  and parameters.
- **`go.mod`** — `go vet ./...`: unreachable code. `deadcode ./...`: unreachable
  functions.
- **`Cargo.toml`** — `cargo check`: its `dead_code` and `unused_*` warnings.
- **`pyproject.toml` / `requirements.txt`** — `ruff check --select F401,F841`:
  unused imports and variables. `vulture <paths> --min-confidence 80`: dead
  code.

Then, for every tool:

- **Only if installed.** A missing tool is reported and **proposed**, never
  installed — `pnpm dlx`, `go install` or `pip install` are the owner's call.
- **Never `--fix`.** knip and ruff rewrite files with it.
- In Python, call the tools the way the project does (`uv run …`,
  `python -m …`).
- ⚠️ `tsc` and `cargo check` do not report unused **public** items: another
  package may use them. That is what knip, `deadcode` and the fallback are for.

## Step 2 — The fallback, only where a tool is missing

Search the definitions with Grep, then search each name for references. Three
traps, all measured:

- **Discount the definition's line, never its file.** A symbol used only inside
  its own file is alive; what may be unneeded is its `export`.
- **The framework calls some code, not your code.** Route files, pages, layouts,
  `main`, `init()`, test functions: zero references there means nothing.
- **Dynamic use cannot be confirmed** — string lookups, reflection,
  `require(variable)`. Say so instead of calling it dead.

## Step 3 — Commented-out code

No tool reports it. Search for commented declarations (`// function`, `# def`)
and read the block before listing it.

## Step 4 — Read before you classify

Open each file before calling anything in it dead. A script nobody invokes still
says why it exists.

## Output

```
## Dead code — <scope>

**Tools run:** <tool: result> · **Missing:** <tool — proposed, not installed>

### Confirmed dead
- `<symbol>` — `path:line` — <tool that found it>

### Probably dead (confirm before deleting)
- `<symbol>` — `path:line` — <why it may still be alive>

### Unneeded export
- `<symbol>` — `path:line`, used only in its own file

### Commented-out code
- `path:start–end` — <what it is>

### Cannot confirm
- `<symbol>` — `path:line` — <dynamic use>
```

Omit empty sections. If nothing is dead, say so.

## Rules

- **Report, never delete.**
- **Cite `path:line`, and the tool behind each finding.**
- **"Probably" is not "confirmed".** A false positive costs more than a miss.
