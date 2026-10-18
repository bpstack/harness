---
name: init-project
description:
  Start a project's harness — run the generator, then write what only the owner
  can answer
kind: command
subtask: true
tools: bash, glob, grep, read, write, edit
bash-allow:
  - node *
  - ls *
  - cat package.json
---

Set up this project's `AGENTS.md`. The generator writes the title and layer 1
between its marks, and reports what the project is missing. **Everything outside
the marks is layer 2, the project's**, and your job is the part of it only the
owner can answer.

🔴 **The generator never claims to be done, and neither do you.** What it
reports is the work — not a formality to tidy up.

## Step 0 — Is there a Node to run it with?

Run `node -v` before anything else. The generator is a Node script, and a
session does not get its Node from the project but from the terminal that
launched it (rule 9).

🔴 **If it fails, stop.** The first line of your reply is: _«No Node in this
session: the generator cannot run. Start the agent from a terminal that already
has Node, and run this again.»_ Then nothing else: no step below, no other tool
in its place (`pnpm`, `npx`), and **no file written by hand** to stand in for
what the generator writes. A hand-made substitute looks like the real output,
which is why it is worse than an honest stop.

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
node <harness>/bin/init-project.mjs <project>
```

⚠️ **The project is an argument, so the first line of the report is a check:
`project <name>` must be the repo you meant.** Nothing stops a wrong path from
harnessing a real repo you did not intend — pointing it at the harness itself is
refused, and a missing argument prints the usage, but a valid path to the wrong
project is not an error to anyone but you. Read that line before `--apply`.
_Give the script an absolute path, or run it from the harness: a bare
`bin/init-project.mjs` resolves against wherever you happen to be, and finds the
wrong file or none. Measured on 2026-09-08, by doing it._

Read the whole output before writing anything. It tells you the package manager
**and the evidence for it**, the foundations the project is missing, and any
warning about `CLAUDE.md` or files git would ignore.

If the project already has an `AGENTS.md`, **the run continues and the report
gains a `layers` line** saying what happened to that file: `graft` when layer 1
was added, `update` when it was refreshed, `already current` when neither,
`REFUSED` when its marks cannot be read — plus `(removes the stack layer 2)` or
`(migrates from Spanish)` when an old block is cleaned up. **Everything outside
the marks comes out byte for byte identical**, and the rest of the steps below
run exactly as they do on a first write.

## Step 2 — Read the project before writing about it

Do not write about the project from the output alone. Read the entry point, the
package manifest, and enough of the source to say what this project **is**.

**Anything you cannot support from the code, you ask about.** A confident
sentence you invented is worse than nothing written: an absence is visibly
unfinished.

## Step 3 — Apply, then act on what the report warned about

Run it again with `--apply`, then work through the warnings below that apply.

### A claim you migrate gets checked, or it does not migrate

Moving text from the project's own documents moves what somebody else wrote into
`AGENTS.md` — the file read first, every session, by every tool. 🔴 **Being
already written down is not evidence.** A stale sentence that migrates arrives
looking freshly authored, and the migration is what launders it.

_Measured on 2026-08-19, grafting a harness into a project that already had
months of documentation._ The resulting `AGENTS.md` asserted, eleven lines
apart, that one URL is where **this** site is in production and where **the
original it replaced** still stands. Both came from the project's own plan file:
one from line 3, written at the start; the other from line 469, written at
deploy. **Nobody read the second.** It survived the migration and the review,
and by then it was the stated motive of a decision record.

**Three checks, and all three are local to the repo. None of them hits the
network** — a lookup would tie this command to a tool being installed and
authenticated, and a failed lookup reads as a fact:

1. **Grep the identifier across every document, and read every hit — not the
   first.** URLs, paths, versions, script names, ports. The first hit is where
   you happened to look; the contradiction lives in the others.
2. **A claim about state is checked against the code, never against the document
   that asserts it.** In that same repo the README called a feature "under
   development"; `src/` showed it had shipped two phases earlier.
3. **A boundary's justification cites `file:line`, or it travels without one.**
   A rule may stand on the owner's say-so — "we do not replicate the original
   design" needs no proof. An **invented** proof may not: false evidence is
   worse than none, because it is what gets quoted back.

**When a claim cannot be checked from here**, do not drop it and do not smooth
it over: migrate it marked `❓ unverified from here` and say so in the report.
It is the rule `security` already works under — _if you did not read it in the
reference, you do not cite it_ — one floor down.

⚠️ **This is an instruction, not a mechanism.** Nothing checks that you ran it.
It is written here because the alternative, measured, is a false sentence
carrying today's date.

🔴 **The guides named below are opened with the read tool, never with the
shell.** They reach `~/.claude/reference/init-project/` with `sync-global`. If a
guide is not there, **stop on that warning, tell the owner it is not deployed
and that `sync-global` has to be run again, and do not act on it from memory**:
the procedure lives only in the guide.

### If the generator warns about the existing `CLAUDE.md`

When the report says the root `CLAUDE.md` is not a pointer or is a symbolic
link, read **`~/.claude/reference/init-project/claude-migration.md`** before
changing either file. That guide contains the full migration procedure and its
publication, authorisation and idempotence checks. It is deployed by
`sync-global` with the other on-demand guides.

### If it says git ignores one of the files

Read **`~/.claude/reference/init-project/gitignore.md`** and act on it **before
`--apply`**. Ask the owner with the exact pattern in front of them; never edit a
`.gitignore` unasked, and treat `skills-lock.json` as a separate question.

## Step 4 — Ask the owner: the security level, its areas, and where the model goes wrong

One conversation, **one question at a time, and wait for each answer**. **If
your tool can ask with options, use it** for questions 1 and 2 and for the
areas: the options are the answers listed with each one, and question 1 takes
several at once. Question 3 and the last one are typed in. What comes out is
written **outside the marks**, in layer 2. The `security` agent reads it from
there, so the shape below is not a suggestion.

🔴 **If `AGENTS.md` already has a `## Security` section in this shape, show it
and ask whether it still holds** — do not run the questions again. If it states
a level in any other shape, run them: a level with no premise written next to it
cannot be checked.

### The level: two questions set it

1. **Which of these does the project have?** — all that apply. It is **looked
   at, not judged**: each one is a fact about the repo.
   - a login, or user accounts
   - personal data, or money
   - **its own backend** — a server of yours, not a static site behind a CDN

   **None of them → L1. Any of them → L2.**

   🔴 **These are the same three signals `security` derives from when no level
   is declared.** Asked here they are answered by the owner instead of guessed,
   and the two paths cannot then disagree about the same project.

2. **Could a leak harm third parties seriously** (money, health, identity,
   infrastructure), **or is there an external obligation to meet** (regulation,
   contract, audit, card payments, regulated sector)? — either one → **L3**.

**The level is the higher of the two, starting from L1. When in doubt, L2.** A
wrong L1 is worse than none: the agent opens the wrong indexes and returns a
green worth nothing.

### And one that does not set it

3. **Is anything planned that would change these answers?** (accounts, payments,
   personal data, a client demanding an audit) — **it does not raise the
   level**; it becomes the `Re-estimate when:` line.

### The areas, only at L2 or L3

Look at the code and **propose** where each sensitive area lives; the owner
corrects it — they know where the login is better than any inspection. The area
names are those of `~/.claude/reference/security/asvs.md` § 7. At L1 there is no
list: the `security` agent opens no index there.

### What gets written

```markdown
## Security

**L2** — estimated on <date>: <the answers to 1 and 2, in one line>.
**Re-estimate when:** <the answer to 3>.

**Areas:**

- Authentication, Session → `src/auth/`
- API → `src/api/`
```

With no answer to question 3, leave the `Re-estimate when:` line out.

🔴 **The fixed words stay in English, whatever language you write in**:
`## Security`, `estimated on`, `Re-estimate when:`, `Areas:` and the area names.
The `security` agent looks for them. What follows each one is the owner's, in
their language.

### Where the model goes wrong with this code

Ask it plainly: **«Where does an AI get this code wrong?»** 🔴 **The most
valuable section in the file, and the only one that cannot be inherited**: it
does not describe the stack, it describes the mistakes made **here**. Write only
what the owner answers, as symptom → cause → what to do, under
`## Where the model goes wrong`. **No answer, no section** — generic advice in
its place is worse than nothing.

In a project that already has this section, show it and ask what to add.

## Step 5 — Write the decisions where this repo keeps them

The destination is `docs/DECISIONS.md` if the generator created it, or
**whatever file this repo already uses for the same job**. The generator leaves
it empty on purpose, and it must not stay that way: there are already real
decisions that the code does not show.

**One exists by the time you get here, from step 4:** the **security level**,
with the answers that chose it. Write it in the format the destination already
uses, born `🔶 proposed`. You are not settling anything: the mould already says
only the owner moves an entry to `✅ accepted`.

🔴 **If the file was born with the mould's placeholder entry
(`ADR-001 — {{Title…}}`), fill that one in; do not append a second.** Two
`ADR-001` break the numbering, and the `{{…}}` left behind reads as a real
decision. The **Reason** cites what the owner answered about _this_ project, not
the criteria of the level restated. _Measured on 2026-10-18: the placeholder
stayed and a second `ADR-001` was appended below it._

🔴 **A file born empty teaches that it may stay empty.** _Measured on
2026-08-08: the decisions file was created with 40 lines and zero entries while
two decisions had just been taken, the level among them — and they ended up as
prose inside `AGENTS.md` instead._ `AGENTS.md` holds the rules; this file holds
**why they are those ones**.

⚠️ **A finding is not a decision.** A broken build, an exposed key or a missing
CI are **facts, not choices**: they belong to the foundations step, not here. An
entry saying "the build is broken" has to be withdrawn the day someone fixes it,
and by then it has been quoted as a reason.

## Step 6 — Skills: hand this one to the owner, and wait

🔴 **You do not run this step. Ask for it and stop until you have an answer.**
Rule 16 requires it and nothing else in the flow triggers it, so skipping it
here means it never happens.

Ask the owner to run this in **their own terminal**, once dependencies are
declared:

```bash
npx autoskills --dry-run
```

**Why theirs:** `npx` downloads a package (rule 4), and `autoskills` needs
**Node ≥ 22.6** while an agent session cannot change its own shell's Node. It
**proposes**; the owner decides what is installed. _Measured on 2026-08-08: one
backend-patterns skill was installed almost everywhere, and almost nowhere had a
backend._

🔴 **The request goes at the TOP of your report.** You may finish the later
steps — none depends on skills.

| Answer                      | What you do                                                     |
| --------------------------- | --------------------------------------------------------------- |
| here is the output          | report what it proposed; **the owner decides what goes in**     |
| this project uses no skills | **accept it and say so.** Rule 16 only bites where skills exist |
| not now                     | report it as pending, by name, and do not ask again today       |

🔴 **What you may not do is continue as though you had asked.** A step that
skips itself in silence is worse than one that is missing.

**Check each proposal against what you read in steps 2 to 4.** The detector
reads what is declared, not what is used. One that **contradicts** the code is
reported as **suspect** with the `file:line` that contradicts it — never an
opinion. It is a reason to look, not a veto: mark it and hand it over, do not
drop it.

## Step 7 — Verify, do not assume

Run the project's own verification. A harness that claims "done" without the
project's checks passing is asserting, not verifying.

🔴 **Diagnose a red before reporting it.** Half of the first reds on a fresh
repo come from the machine, not the project. `~/.claude/reference/traps.md`
lists the ones already paid for; when the trap is not listed, the tool's own
documentation is the answer, through Context7 (rule 17). The traps file does not
ship with this repo — it arrives with `sync-global`, so check it is there rather
than assuming.

## Step 8 — The foundations the generator listed

If the generator printed **`Foundations: N of M missing`**, read
**`~/.claude/reference/init-project/foundations.md`** (same rule as step 3: read
tool, and stop if it is not deployed) and follow it before proposing or changing
anything. If it printed `none missing`, skip this step.

## Step 9 — If anything is left hanging, offer the fourth document

If the run ends with **blocking findings, or decisions waiting on the owner** —a
broken build, an exposed key, debt they have to rule on— that is the trigger for
a fourth document. The mould is at `~/.claude/reference/templates/SESSION.md`
and goes to `docs/SESSION.md`.

**Do not skip this because you already listed them in your output.** Your report
dies with the session: the next agent to open this repo reads its files, not
your transcript, and rediscovers the same broken build from scratch. _Measured
on 2026-08-08: 73 build errors and a pending security fix existed only in a
session report._

🔴 **Offer it, do not create it unasked.** A fourth document changes how the
project is organised, and that is the owner's call. An unasked-for file that
nobody adopts is the empty file that ages, which is the thing this harness is
against.

📌 **And only this one.** `ROADMAP.md` and `TODO.md` ship as moulds too, and
neither belongs at init: on day one there is no order to keep and nothing yet at
risk of being forgotten. Offering them here is the noise the foundations list
avoids on purpose.

## Step 10 — Leave it uncommitted, and say the rules are not live yet

🔴 **Do not commit.** Leave every change uncommitted, so the owner reviews it
with `git diff` before it enters the history — this command rewrites text that
is theirs. Say so in the report: _«uncommitted: review with `git diff`, then
commit yourself or ask me to»_. Rule 6 still holds for the rest of the work.

🔴 **Say this out loud at the end.** Both harnesses read agents and commands
**at session start**, so a file written now is not in effect in the session that
wrote it. Tell the owner to restart before relying on any of it.

## Output

Report what happened, and be specific about what did not:

🔴 **Follow the template below whole, section by section.** "Asked of the owner"
and the rules you **dropped** (under "Changed outside the marks", with the
reason) belong in the report itself, not only in `AGENTS.md`: the owner reads
the report to know what moved and what they approved. A section with nothing in
it says so in one line; it is not left out.

🔴 **What you need from the owner goes FIRST, above everything you did.** A
request printed under a list of findings is a request nobody acts on — measured
on 2026-09-08, when the owner read the whole report and asked why the skills
step had never been mentioned. It had, in the last third.

```
## Init — <project>

### 🔴 Waiting on you, before anything else
- run `npx autoskills --dry-run` in your terminal — or say this project uses
  none. Nothing else in the flow triggers rule 16.

### Written by the generator
- the files it wrote, and the `layers` line if AGENTS.md already existed

### Changed outside the marks
- <file> — <each section added, rewritten, moved or removed, one per line>

### Asked of the owner
- <question> → <answer>

### Written to layer 2
- `## Security` — <level, and its areas if L2 or L3>
- `## Where the model goes wrong` — <what was answered, or "no answer, not written">


### Written to the decisions file
- <the decision> — <where it went, born 🔶 proposed>

### 🔴 Still open
- <question> — <why it could not be answered>

### 🔴 Foundations missing
- <what is missing> — <what it would take, and that it was not touched>

### 🔴 Uncommitted
Review with `git diff`; commit yourself or ask me to.

### 🔴 Restart the session
The agents and commands are not live until then.
```

## Rules

- **Never write something you cannot support.** Leave it out, and list it under
  "still open".
- **Outside the marks, write only what this command asks for.** The rest of the
  file belongs to the project.
- 🔴 **Every change outside the marks is listed, one by one** — in the report
  and, if the owner asks for a commit, in its body. "Only a blank line changed"
  after rewriting sections the owner approved is still false: approval is not
  the same as nothing happening, and the owner reads the report to know what
  moved in their text. _Measured on 2026-09-17: a run migrated `CLAUDE.md`,
  rewrote the security section and retired an exception, and reported the
  outside as unchanged._
- **Report the steps that leave no file too.** A step that produces no artifact
  is the one that gets silently skipped, and the report is written by whoever
  skipped it — so name them explicitly rather than trusting the summary.
- **What you drop is listed as dropped, with the reason**, and a hardcoded
  secret or any other finding you saw while reading the code goes under "Still
  open" — not only what the owner asked about.
- Cite `path:line` when you refer to the project's code.
- No AI or tool footprint in the output.
- **The foundations are reported, then offered, and never installed unasked.**
  The line rule 4 draws is **authorisation, not the act**: a `.gitattributes`, a
  pinned version or a CI workflow written **on your own account** is the rule
  broken, and it lands in everyone's lockfile without showing in the diff you
  present. Written **because the owner said so in that exchange**, it is the
  rule kept. ⚠️ Reporting and going quiet is not the safe option: it hands them
  the decision and the duty to remember it.
