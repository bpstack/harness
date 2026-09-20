---
name: propagate
description:
  Refresh a project's harness layers, then reconcile the rules the graft left
  side by side
kind: command
subtask: true
tools: bash, glob, grep, read, write, edit
bash-allow:
  - node *
  - ls *
  - cat package.json
---

Update the layers of a project that **already has an `AGENTS.md`**. The script
writes the blocks; your job is the file it leaves behind. A repo without one is
not harnessed yet: that is `/init-project`, once. Neither command touches the
harness itself.

🔴 **The script finishing is not the job finishing.** On a graft it puts a
second set of rules next to the project's own, and those two have never met.
That reconciliation is this command.

## Step 1 — Find the harness, then run it dry

`<harness>` is not something to know by heart — it differs per machine. Resolve
it before anything else:

1. Read `source` from `~/.claude/harness/install.json`, the install seal. That
   field is the absolute path of the clone `sync-global` installed from.
2. If the file or the field is missing, **ask the owner for the path, and only
   that** — do not guess it, do not search the filesystem for a folder that
   looks right, and do not offer to install the harness: that is the owner's to
   run. If you ask with options, there are two: _«here is the path»_ (typed in)
   and _«stop here»_. If the path you are given does not exist, say so and ask
   again — do not correct it yourself, not even an obvious typo.

Once resolved:

```bash
node <harness>/bin/propagate.mjs <project>
```

Read the plan before writing. Each file comes back as one of three, and **what
you do next depends on which**:

| Plan              | What happened                                              | Reconciling?  |
| ----------------- | ---------------------------------------------------------- | ------------- |
| `already current` | the blocks match what the harness has                      | nothing to do |
| `update`          | the file already had marks; their contents were refreshed  | no            |
| `graft`           | the file had **no marks**: layer 1 went in under the title | 🔴 **yes**    |

A line may also carry one of two notes, and neither needs a decision from you:

- **`migrates from the old language`** — the marks themselves rewritten from an
  older Spanish key to the English one, body included.
- **`removes the stack layer 2`** — an old per-stack block, which the harness no
  longer ships, taken out whole.

Then apply:

```bash
node <harness>/bin/propagate.mjs --apply <project>
```

## Step 2 — What the script did not touch, and must not

**Everything outside the marks belongs to the project.** The graft inserts its
block under the title; it never edits a line of the project's. Confirm that
before going further — `git diff` should show changes only inside the marked
blocks.

📌 **That untouched part is the project's own layer.** It is the one thing here
nobody can regenerate, and the reason this command proposes rather than edits.

## Step 3 — Reconcile, and only after a graft

Leaving the generic rules stapled next to the project's specific ones is how a
document stops being read. **Three rules, and they are not negotiable.**

**1 · Only one of the copies can be deleted, and it is not the generic one.**
The copy inside the marks is replaced wholesale by the next propagation, so
deleting it there is undone without warning. **The project's own line, outside
the marks, is the only copy that actually shortens the file** — and **you
propose it, the owner deletes it.**

**Whether it can go depends on one thing: does the project's line say _why_?**
"No push without the owner's OK" is a bare statement and the layer-1 rule
already carries it. "No push because a key was pushed in March" **stays even
though it repeats**: the incident is what layer 1 does not have, and it is the
expensive part. When in doubt, it stays.

**2 · Nothing you decide goes inside the marks.** The next run replaces
everything between `layer1:start` and `layer1:end` wholesale, so a resolution
written in there disappears silently. Resolutions go **outside**, under the
project's own declared exceptions.

**3 · On a contradiction, the project wins** — it knows its own code — and the
displaced layer-1 rule becomes a declared exception with its reason. Otherwise
the harness is a steamroller. 🔴 **Cite the displaced rule by its text, not only
by its number.** Numbers move when the layer gains or loses a rule, and an
exception pointing at the wrong one is worse than none.

**How to run the pass.** Classify every rule in the layer-1 block against what
the project already says, report the counts, and **only interrupt for
contradictions**:

| Class                     | What you do                                      |
| ------------------------- | ------------------------------------------------ |
| already complied          | nothing — say how many                           |
| new here                  | nothing — it now applies                         |
| repeats, and adds nothing | propose deleting **the project's** line, grouped |
| repeats, but says why     | **it stays** — say which ones and why            |
| contradicts               | **ask, one at a time**, with both texts quoted   |

Do not resolve a contradiction yourself and do not batch them into one question:
each is a rule the owner is choosing to break, and it needs its own reason
written down.

⚠️ **Two rules on the same subject in two languages read as two rules.** A
commit convention stated once in the project's prose and once inside the marks
is the most common collision, and the file now holds both. Say so plainly rather
than assuming the reader will notice which one wins.

## Step 4 — If the project's file is not in English

The layers arrive in English; the project's own sections may not be. **The
mixture is not a defect** — what language a project writes its own sections in
is its owner's business, and translating them is editing the one part of the
file nobody else can regenerate.

📌 **Recommend it, do not do it.** A file whose two halves argue in two
languages is harder to reconcile and harder to review, so it is worth offering
to bring the project's own sections into English **in a separate change** — one
the owner asks for, sees, and can refuse. Never fold a translation into a
propagation: a diff that both updates rules and rewrites prose cannot be
reviewed.

## Step 5 — The two files the layers name and this command never writes

🔴 **A repo can be harnessed and still be half-installed.** The layers you just
wrote cite two files that this command never creates — only `/init-project`
does. So a project that was only ever propagated can lack both.

| Missing             | Why it matters                                                                                                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`         | the `@AGENTS.md` import. Claude Code reads `AGENTS.md` on its own from **v2.1.277**, so this is no longer all-or-nothing — but the sessions that cannot (older versions, Bedrock, telemetry off, hooks disabled) then read nothing, and a natively read file is not listed in `/context` |
| `docs/DECISIONS.md` | rule 13, which the layers point at. A rule citing a file that does not exist teaches that the citations are decoration                                                                                                                                                                   |

The script names them if they are absent. **Offer them; do not write them.**
Updating a block the repo already had is one thing — adding files to someone
else's tree is another. `CLAUDE.md` is the single line `@AGENTS.md`; the
decisions mould is in `~/.claude/reference/templates/`.

⚠️ **A deliberate ignore is an answer, not an omission.** A public repo that
keeps its `CLAUDE.md` out of git has already decided; say so and move on rather
than proposing it twice.

_Found on 2026-09-08 by comparing a grafted branch against an initialised one.
It is the defect fixed the day before, one floor along: the generated file cited
the decisions document and nothing created it._

## Step 5b — The rules this project cites by number

The tool prints these; you read them. **A number is the one citation that goes
stale silently**, because the prose around it stays true-sounding while the list
underneath it moves.

- **A number past the end of the list is certain**: that rule was cut, and the
  sentence resting on it has lost its support.
- **A valid number is only a suspicion**, and it is the half that matters. Layer
  1 went from 33 rules to 22, and a real project kept **five** citations: four
  of them valid numbers now meaning something else, one cut away. A check that
  only caught the high number would have found **one of five**.

🔴 **You report. You do not rewrite.** That sentence is outside the marks, so it
is the project's, and rule 1 of step 3 holds: **the owner deletes their own
line.** What you offer is the replacement text, quoted — and, since the number
is what broke, **offer the rule by its words, not by a new number.**

## Step 6 — Verify, and report the foundations you meet on the way

Run the project's own verification if it has one, and say plainly if it does
not. A propagation that reports success without the project's checks passing is
asserting.

⚠️ **Reconciling walks you straight into missing foundations** — a rule about
`.gitattributes`, a pinned version or CI is hard to classify in a repo that has
none. 🔴 **This script does not list them**: only the generator runs that check,
so here you notice them by reading. **Report each one, then ask** — rule 4 says
the AI **proposes** and the owner decides, and reporting without asking leaves
them the decision plus the duty to remember it.

**Same shape as step 8 of `/init-project`**, and the same limits:
`.gitattributes` offered directly, a pinned version and `packageManager`
**asked** rather than deduced, the CI **last** because it needs the other three,
and `verify` **never offered blind** — what is offered there is running the
candidates. Nothing is written without being told to in that exchange, and what
is not authorised goes to `docs/SESSION.md` rather than to a report that dies
with the session.

📌 **A missing foundation is a finding, not a contradiction.** It does not go in
the reconciliation counts and it is not a rule the owner is choosing to break:
it is a rule they cannot comply with yet, which is a different conversation and
gets its own section in the report.

🔴 **Do not commit.** Leave every change uncommitted, so the owner reviews it
with `git diff` before it enters the history — this command rewrites text that
is theirs. Say so in the report: _«uncommitted: review with `git diff`, then
commit yourself or ask me to»_. Rule 6 still holds for the rest of the work.

🔴 **The rules are not live in this session.** Both harnesses read agents and
commands at session start, so what was just written applies from the next
restart. Say so at the end.

## Output

```
## Propagate — <project>

### Plan
- <file> — update | graft | already current, and any note on the line

### Untouched
- confirmation that the diff falls only inside the marks

### Reconciliation
- already complied: <n> · new here: <n> · repeats and adds nothing: <n>
- kept although repeated: <rule> — <the why it carries>

### 🔴 Asked of the owner
- <contradiction> — <both texts>, and what was decided

### 🔴 Proposed for deletion
- <the project's line> — <the layer-1 rule that already carries it>

### 🔴 Rules cited by number
- <file:line> — <what the quote says> · <what that number means today>

### 🔴 Named by the layers, absent here
- CLAUDE.md / docs/DECISIONS.md — offered, and what was answered

### 🔴 Foundations missing
- <what is missing> — <what it would take, and that it was not touched>

### 🔴 Uncommitted
Review with `git diff`; commit yourself or ask me to.

### 🔴 Restart the session
The rules are not live until then.
```

## Rules

- **Propose, never delete.** Every cut to the project's own text is the owner's.
- **Nothing is written inside the marks.** The next run overwrites it.
- **A rule that repeats but carries its reason stays.** The reason is the part
  the harness does not have.
- Cite `path:line` when referring to the project's code.
- No AI or tool footprint in the output.
