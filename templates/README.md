# templates — the moulds, and how a new one is born

**What gets copied into a project.** The folders in this repo are grouped by
where they go, not by what they contain: `agents/` and `commands/` go to the
machine; `layer1.md` and this go inside the project. That is why a document
template and a CI file sit here without contradiction.

_`layer2/` used to be listed here too. There is no such folder any more, because
layer 2 is whatever the project writes outside the marks._

None of them is read every session. They are opened **when the file is
created**, and the created file already carries its own rules inside. They cost
zero context until they are needed.

## The one that is not a document

`ci.yml` — the **minimal CI**, copied to `.github/workflows/ci.yml`. It is
inherited as-is because it does not know what it checks: it calls
`pnpm run verify` and the project's `package.json` decides what that covers.

**Three conditions before copying it.** If any is missing the CI fails on its
first run, and a CI born red is ignored from day one:

1. A `verify` script exists in `package.json`.
2. A `.nvmrc` exists, and its version matches `engines`.
3. `packageManager` is declared, so the CI installs with the same one.

## When to create the next document

| When…                                           | →   | Document     |
| ----------------------------------------------- | --- | ------------ |
| a session ends with work half done              | →   | `SESSION.md` |
| there are more tasks than fit in your head      | →   | `TODO.md`    |
| some blocks depend on what other blocks produce | →   | `ROADMAP.md` |

**`AGENTS.md` and `DECISIONS.md` are not on that list** because they are not
optional: the rules require them.

## How a new template is born

For anything not on the list above — a `RUNBOOK.md`, a migration plan — three
questions, and all three have to answer yes:

1. **Does it answer a question no existing file answers?** If another file
   already owns that content, it goes there. Two files answering the same
   question end up disagreeing.
2. **Is it known who reads it, and when?** "Whoever needs it" is not an answer.
   A document without a reader is written once and never opened.
3. **Is it born with its own pruning rule?** Overwritten, appended,
   collapsed-on-close, deleted-when-done — decided at creation, not later. A
   file with no pruning rule only grows.

⚠️ **A template that fails any of the three is not created.** The cost of an
extra document is not the writing: it is that every future session has to decide
whether to read it.

## What every template does

Each one opens with the same three-part header — **what it answers**, **who
reads it**, **how it is pruned** — and carries its rules in a `rules:` block at
the bottom. That block is generated: it is updated by the harness, so guidance
improved here reaches files already created.

🔴 **The rules live in the file they govern, not here.** A rule kept only in
this README is read by whoever is creating a template and never again by anyone
maintaining one.
