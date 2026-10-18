# Init-project — missing foundations

> **What it answers:** how to handle foundation gaps reported by the generator.
> · **Who reads it:** the agent running `/init-project`, only when the report
> lists missing foundations. · **How it is pruned:** it leaves when the command
> no longer reports or acts on project foundations.

If the report says **`Foundations missing`**, these findings concern whether the
project can work at all, not the file just written. Layer 1 demands four of
these foundations. Work through them **one at a time**.

🔴 **Report, then ask — and do what is authorised.** Rule 4 says the AI
**proposes** and the owner decides. Reporting and going quiet is a weaker
reading: it leaves the owner the decision **and the duty to remember it**, and a
report dies with the session. So this step ends with a question, not a list.

**Ask them together, in one block, and say what each would take:**

| Missing             | How it is offered                                                   |
| ------------------- | ------------------------------------------------------------------- |
| `.gitattributes`    | ✅ **directly** — fixed content, two lines, **only if absent**      |
| `.nvmrc`            | ⚠️ **ask which major** — never deduced, never inherited             |
| `packageManager`    | ⚠️ **ask** — and it edits their `package.json`                      |
| `verify`            | 🔴 **not offered** — see below: the candidates have to be run first |
| CI from the mould   | ✅ **last of all** — it needs the three above, or it is born red    |
| `minimumReleaseAge` | ⚠️ **ask the value** — never deduced; `traps.md` says what it does  |
| pnpm placeholder    | ⚠️ **ask, per dependency**, whether its build script may run        |

🔴 **Nothing is written without being told to in that exchange**, a "no" is a
legitimate answer and is not asked twice, and **what is not authorised goes to
`docs/SESSION.md`** — not to the report, which nobody reads again.

⚠️ **An existing `.gitattributes` is never rewritten.** It is the one file here
whose content is fixed, which makes overwriting it look harmless — and it is
not: those lines are the project's, and a rule you do not recognise is still a
rule. When it is there, **say what it lacks** and leave it alone.

⏱️ **And if the repo already has commits, the file alone changes nothing.** Git
applies it to what it normalises from then on; everything already committed
keeps the endings it went in with. That takes `git add --renormalize .`, **in a
commit of its own** — it can touch every file in the repo, and mixed into
another commit it makes the diff unreadable. Say it when you offer the file; do
not run it unasked.

⚠️ **`.nvmrc` is asked, never deduced — and an existing `engines.node` is not
the answer.** It is the same number wearing a different hat: if it were right,
there would be nothing to fix. The harness does not invent the major and does
not inherit it. Offer what you can see, with its origin, and let the owner say
the number.

⚠️ **`packageManager` has no single right answer, so it is asked and not
deduced.** The lockfile gives a **range**, not a version —
`lockfileVersion: '9.0'` means pnpm 9 or 10. And `pnpm -v` **inside a repo
reports the repo's pnpm, not the machine's**, because it self-medicates to
`packageManager`: ask it **outside any repo** to learn what is really installed.
Offer both numbers with their origin and let the owner pick.

⚠️ **The `verify` candidates are candidates, not a chain.** The generator lists
the scripts already in the repo because it cannot know which of them check
anything — **the name misleads and the command does not**. Before proposing a
`verify`, run each one and read what it does. Two things disqualify a candidate:

- it **writes** instead of checking, whatever it is called;
- it **exits 0 on a problem it reports itself** — `eslint` does exactly that on
  "1 problem (0 errors, 1 warning)", so it needs `--max-warnings=0` first.

A candidate that comes out red stays out **and is declared as a written
exception**: a `verify` born red is ignored from day one, and so is the CI built
on it.

🔴 **So what is offered here is running the candidates, never writing the
script.** No detector can know which of them checks anything without executing
it, and a `verify` born green that verifies nothing is worse than none.

⏱️ **And the CI goes last, after the three it depends on.** It reads `.nvmrc`,
takes its pnpm from `packageManager` and calls `pnpm run verify`: without those
it is red on arrival. _Measured on 2026-09-08 by walking into it — the CI was
written first, in a repo that had none of the three, with this warning already
in the generator's own output._

📌 **A CI that exists is not a CI that checks.** If the report says the workflow
does not invoke `verify`, say so plainly: what runs on that machine and what
runs in CI are then two lists, and they drift.
