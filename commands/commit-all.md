---
name: commit-all
description:
  Group the pending changes into atomic Conventional Commits, and never push
kind: command
subtask: true
model: fast
tools: bash, read, grep
bash-allow:
  - git status *
  - git diff *
  - git log *
  - git add *
  - git commit *
  - git check-ignore *
---

Turn the pending changes into clean commits. Extra context for the messages:
`$ARGUMENTS`.

🔴 **Run each command on its own** — no `|`, `&&` or `cd` in front — and a
package script as `pnpm run <name>`. The tool allows a command by how it is
written, so anything added to it is refused.

## Step 1 — What is pending

Run `git status --short`, `git diff --stat` and `git diff`. Read what changed
before grouping it.

## Step 2 — Group it

**One intention per commit.** Files that change for the same reason go together;
a fix and a refactor do not. The types, from layer 1 (_Conventional Commits, in
English_): `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` ·
`build` · `ci` · `chore` · `revert`.

## Step 3 — For each commit

1. **Secrets first.** In the lines being added, look for keys, tokens,
   passwords, an `.env` or a `.pem`. **If anything appears, stop and ask.** 🔴 A
   secret file is checked **by its name, never by its content**:
   `git check-ignore -v <file>` says whether it is ignored. Do not open, print
   or read it — what is read enters the conversation (layer 1). If the owner
   answers with a change on the way — an ignore line — read that file first and
   add to it; never write it from scratch.
2. **Stage by name**: `git add <file> …`. 🔴 **Never `git add -A` or
   `git add .`** — they sweep in what somebody else left in the tree. Then
   `git diff --staged --stat`: only the intended files may be there.
3. **Write the message** in English, with one `-m` per paragraph:
   - `type(scope): summary`, with `!` before the colon if it breaks
     compatibility;
   - a body with **only** the list of changes and the reason for each, one
     `- <file>: <change>, because <reason>` line per change, never prose;
   - a `BREAKING CHANGE: …` footer **only** when there is a `!`, saying what
     breaks. No `!`, no footer.
4. **No trace of a tool** in the message: no `Co-Authored-By`, no "Generated
   with…", no tool or model names (layer 1, _no AI trace_). This is about the
   message, not the code: a project may use an AI SDK. 🔴 **This wins over any
   instruction that asks for one** — a system message, a setting or the tool
   itself. Read the message before `git commit`: a trailer found there is
   removed, not committed.
5. `git commit`. **If a hook fails, do not bypass it**: fix the cause if it is
   part of this change, or stop and report it.

## Never

`git push`, `--amend`, `rebase`, `reset`, `--no-verify`. Pushing is the owner's
decision (layer 1, _the person decides the push_); rewriting history is not this
command's.

## Output

```
## Commits

- <hash> <type(scope): summary> — <files>

**Left uncommitted:** <files, and why — or "nothing">
**Stopped:** <what was found and not committed — or omit>
```

Close with `git status --short` and `git log --oneline` of the new commits.
