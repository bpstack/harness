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

### If it says `CLAUDE.md` is not a pointer

🔴 **A `CLAUDE.md` is a pointer when it holds the line `@AGENTS.md`.** That is
the whole test, and it is the one the generator applies. **Content specific to
Claude Code may sit below that line and the file is still a pointer** — the
mould ships that way. What fails the test is the `@` being absent, because then
the file imports nothing.

⚠️ **Do not read this as «`CLAUDE.md` must hold one line and nothing else».**
That is stricter than what the code checks, and the strict reading is the
expensive one: it turns the question into "migrate everything or refuse", so a
project with valuable content in its `CLAUDE.md` declares a standing exception
against the import — and loses `AGENTS.md` entirely to keep prose the import
never threatened. _Found on 2026-09-17 in a repo that had declared exactly that,
six weeks earlier._

When `CLAUDE.md` holds **rules** instead, the repo has two sources — and 🔴
**the damage is not the duplication, it is the asymmetry**: `CLAUDE.md` is read
only by Claude Code, while `AGENTS.md` is the standard every other tool reads.
Two files that drift do not error; they make the repo behave differently
depending on which harness opened it.

**So there are two separate things to fix, and they have different prices:**

| What is wrong               | What it costs to fix                                           |
| --------------------------- | -------------------------------------------------------------- |
| **the import line is gone** | **one line at the top.** Nothing moves, nothing is lost        |
| rules live in `CLAUDE.md`   | a migration: content moves, and that is the owner's to approve |

🔴 **Never bundle them.** The import is not a step of the migration and does not
wait for it: without that line, **`AGENTS.md` does not reach a Claude Code
session at all** — everything layer 1 puts there, the security section included,
is invisible to the tool it was written for. Offer the line on its own, first,
and say what it costs, which is nothing.

**A short `CLAUDE.md` is not automatically a pointer.** Only `@AGENTS.md`
imports; a sentence saying "read AGENTS.md first" merely asks the agent to
comply. _Measured once: the pointer reached the session's context, `AGENTS.md`
did not, and the whole session ran without it despite being told to._

**Show the whole move, ask, and then perform it.** Moving content is destructive
and this is someone else's repo, so the authorisation is explicit and it is
theirs — but reporting and going quiet leaves them the decision **and the duty
to remember it**, and a report dies with the session. Rule 4 is proposing, not
abstaining.

⚠️ **This instruction was the other way round until 2026-09-17** — _«propose the
migration, do not perform it»_ — and what happened in testing is that the
migration was carried out anyway, with permission asked first. The instruction
was the thing that was wrong, not the behaviour: a `CLAUDE.md` left holding
rules is the asymmetry this section exists to end, and stopping one step short
leaves it in place.

🔴 **The order cannot be reversed:** show the dry run → write into `AGENTS.md` →
verify it landed → **only then** shrink `CLAUDE.md`. Shrinking first and
trusting yourself to paste it back is how a file gets lost.

**The dry run shows the move whole**: every line that leaves `CLAUDE.md`, where
each one lands, and what the file is left holding. A summary of a move is not a
dry run — the point is that they read the text before it travels, because it is
theirs.

| What you find                          | What you do, once authorised                             |
| -------------------------------------- | -------------------------------------------------------- |
| the two files are identical            | `CLAUDE.md` becomes the pointer — nothing is lost        |
| `CLAUDE.md` has what `AGENTS.md` lacks | move that content in, **outside the marks**, then shrink |
| they contradict each other             | the same one-at-a-time pass `propagate` uses             |

### What migrates arrives under a heading that says where it came from

🔴 **Without it the operation is not idempotent.** A second run has no way to
tell migrated content from the project's own, so it migrates it again and the
file ends up holding it twice. The heading is what makes the second run a no-op,
and it is the only thing that does — nothing else in this flow remembers that a
migration happened.

Append it at the **end of `AGENTS.md`**, outside the marks, exactly like this:

```markdown
## From CLAUDE.md — migrated 2026-09-17

_Everything below was moved out of `CLAUDE.md`, which is now a pointer._
```

**Before migrating, look for that heading.** If it is there, the content under
it is already migrated: compare and move only what is new, and say in the report
that this is a second pass.

⚠️ **And this append does not go through the mark checker.** The generator
refuses a file whose marks do not pair, but that guard runs on the block it
writes — **you** are writing at the end of the file, outside it. Check the
`layer1` marks pair before appending, and stop if they do not: a file with
unpaired marks cannot be read reliably by the thing that comes next.

### If layer 1 and what you are migrating disagree

**Layer 2 wins** — the project's own rule beats the harness's — **and it is
reported**, pointing at **rule 18**: the exception is declared, not left
implicit.

🔴 **Once it is declared, the warning stops.** Say it once, in the run where the
conflict appears, and never again for a rule already carrying its declared
exception. A warning that does not go away when you obey it is how a reader
learns to skip every other one.

🔴 **But a declared exception silences the rule it declares, not everything near
it.** _Measured on 2026-09-17:_ a repo declared that its `CLAUDE.md` keeps its
own content, that exception was honoured — correctly — and the missing
`@AGENTS.md` went unmentioned with it. The run wrote a security section into an
`AGENTS.md` that **no Claude Code session loads**, and said nothing, because one
exception had covered the whole subject.

**So check what the exception actually covers before you go quiet.** Here that
is two questions, not one: _may the content stay?_ — theirs, and already
answered — and _is `AGENTS.md` imported at all?_ An exception about keeping
content says nothing about the import line, and the two are independent: the
line costs nothing and loses nothing, so it is still offered, once, on its own.

⚠️ **And when the exception's own text rests on that confusion, say so plainly
and leave it alone.** An exception written as _«it is not a pointer, its content
stays»_ is answering a question the harness never asked. Point at the line that
would satisfy both readings; do not edit their declaration, and do not raise it
twice.

**What moves is what belongs in `AGENTS.md`: rules, conventions, how work is
done here** — the things every tool has to read. Content that is genuinely about
Claude Code, and useful only there, **may stay under the `@AGENTS.md` line**:
the file is a pointer either way, and moving it buys nothing.

⚠️ **Do not read this as "nothing stays, not even content specific to Claude
Code".** That contradicts the check the generator actually runs, and the
contradiction is what makes an all-or-nothing choice out of a one-line fix.

**Two more warnings can come with this one, and either changes the question:**

- **`CLAUDE.md` is not in git.** Then its content has never left this machine,
  and moving it into `AGENTS.md` **publishes it**. Ask whether the repo is
  public — **do not look it up**: that ties the command to a tool being
  installed and authenticated, and a failed lookup reads as "private", which is
  the expensive way to be wrong. The owner knows. And offer the fourth exit,
  usually the right one: **split it in two** — what can be public goes in, the
  rest stays where it is.
- **`CLAUDE.md` is a symbolic link.** 🔴 **Refuse the migration and say so
  before anything else**, then propose a real file. This is the one case that is
  not a judgement call: what you read through a link and what git stores are two
  different things, so a migration here moves content you cannot be sure you
  read. Git stores a link as a special entry; where it cannot create one
  —Windows without developer mode— it materialises **a text file containing the
  path**, which the harness then reads as its whole ruleset. No error, no
  warning.

### If it says git ignores one of the files

The generator asked **git** — not the `.gitignore` — which of the files it is
about to create fall under an ignore pattern, and printed the pattern with its
line. **Act on it before `--apply`.**

🔴 **This is the quietest of the failures.** The file lands here, so nothing
breaks and nobody suspects; on the next clone it is simply absent, with no error
on either side. _Measured on a real repo on 2026-09-08: the generator reported
writing `CLAUDE.md` and `git status` never listed it — and `CLAUDE.md` is the
one file without which Claude Code reads none of the harness._

**Ask the owner, with the exact line in front of them:**

> `.gitignore:34:CLAUDE.md` keeps `CLAUDE.md` out of git. Remove that pattern so
> the harness travels, or keep this harness local to this machine?

| Answer                | What you do                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| remove the pattern    | show the line, edit `.gitignore`, re-run the dry run to confirm the warning is gone, then `--apply` |
| keep it local         | **respect it.** Apply as is, and note in the harness that these files do not travel                 |
| the pattern is needed | propose **narrowing** it (`docs/build/` rather than `docs/`) instead of deleting it                 |

🔴 **A "no" is a legitimate answer, not an obstacle to work around.** Wanting
the harness only on the machine it is written on is a real case — and a public
repo whose owner keeps their `CLAUDE.md` out of it is another. Do not ask twice
in the same session, and do not apply it anyway.

🔴 **Never edit a `.gitignore` without being told to in that exact exchange.** A
general permission to run this command is not permission to change what someone
else's repo publishes.

**And `skills-lock.json` is asked separately, because it is the other way
round.** Rule 16 wants it **committed** while `.claude/` and `.agents/` stay
ignored — skills rebuild from that lock, so hiding it leaves every other machine
rebuilding something else, or nothing.

⏱️ **Its timing is the point: the warning lands before step 6.** The lock does
not exist yet, so removing the pattern now means it is **born versioned** rather
than rescued afterwards. Raise it here, not once the skills are installed.

_Measured on a real repo on 2026-09-08: `.claude/` and `.agents/` were ignored —
correctly — and the lock was ignored too, which is the rule exactly backwards.
Neither the foundations list nor the ignore check above had anything to say,
because this script does not write that file._ A declared exception is a
legitimate answer here too.

## Step 4 — Ask the owner: the security level, its areas, and where the model goes wrong

One conversation, **one question at a time, and wait for each answer**. **If
your tool can ask with options, use it** for questions 1 to 3 and for the areas:
the options are the answers listed with each one. Question 4 and the last one
are typed in. What comes out is written **outside the marks**, in layer 2. The
`security` agent reads it from there, so the shape below is not a suggestion.

🔴 **If `AGENTS.md` already has a `## Security` section in this shape, show it
and ask whether it still holds** — do not run the questions again. If it states
a level in any other shape, run them: a level with no premise written next to it
cannot be checked.

### The level: four questions

1. **Are there user accounts?** (login, sessions, identity) — yes → **at least
   L2**.
2. **If what you store leaked or got corrupted, who would it harm?** Nobody, or
   only you → L1 · your users (personal data, their content, their business) →
   **L2** · third parties, seriously (money, health, identity, infrastructure) →
   **L3**. A form **without** login that collects personal data is already L2.
3. **Is there an external obligation to meet?** (regulation, contract, audit,
   card payments, regulated sector) — yes → **L3**.
4. **Is anything planned that would change these answers?** (accounts, payments,
   personal data, a client demanding an audit) — **it does not raise the
   level**; it becomes the `Re-estimate when:` line.

**The level is the highest that questions 1-3 give, starting from L1. When in
doubt, L2.** A wrong L1 is worse than none: the agent opens the wrong indexes
and returns a green worth nothing.

### The areas, only at L2 or L3

Look at the code and **propose** where each sensitive area lives; the owner
corrects it — they know where the login is better than any inspection. The area
names are those of `~/.claude/reference/security/asvs.md` § 7. At L1 there is no
list: the `security` agent opens no index there.

### What gets written

```markdown
## Security

**L2** — estimated on <date>: <the answers to 1-3, in one line>. **Re-estimate
when:** <the answer to 4>.

**Areas:**

- Authentication, Session → `src/auth/`
- API → `src/api/`
```

With no answer to question 4, leave the `Re-estimate when:` line out.

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
**Rule 16 is what requires it, and nothing else in the flow triggers it**, so
skipping it here means it never happens at all.

Ask the owner to run this in **their own terminal**, once dependencies are
declared:

```bash
npx autoskills --dry-run
```

**Why theirs and not yours.** Two reasons, and both are the point:

- `npx` **downloads a package**. Installing or fetching on your own account is
  rule 4 broken, and a dry run that reaches the network is still a reach.
- `autoskills` needs **Node ≥ 22.6**, and plenty of repos pin lower on purpose.
  In an interactive shell the version manager's hook is loaded and switching is
  one line —`fnm use 24`, then the command— while an agent session **cannot
  change its own shell's Node** and has to go the long way round. The long way
  round is a trap of its own; the owner's terminal simply does not have it.

It **proposes**; the owner filters and decides what gets installed. It is run
when a project starts and when a major technology enters — not by routine.
_Measured on 2026-08-08: one backend-patterns skill was installed almost
everywhere it was run, and almost nowhere had a backend._ The detector gets the
language right and the role wrong, which is the whole reason the dry run exists.

🔴 **The request goes at the TOP of your report, not among the findings.** You
may finish the steps after this one — none of them depends on skills — but the
ask must be the first thing read, not the last.

**Three answers are legitimate, and one of them is "no".**

| Answer                      | What you do                                                     |
| --------------------------- | --------------------------------------------------------------- |
| here is the output          | report what it proposed; **the owner decides what goes in**     |
| this project uses no skills | **accept it and say so.** Rule 16 only bites where skills exist |
| not now                     | report it as pending, by name, and do not ask again today       |

🔴 **What you may not do is continue as though you had asked.** _Measured on
2026-08-08 in a project pinned to Node 20 to match its Dockerfile: the step
failed on a version error and the run carried on as if nothing had happened._
**A step that skips itself in silence is worse than one that is missing** — and
a step whose answer nobody waited for is the same failure wearing a request.

### Check what it proposes against what you already measured

🔴 **You read this project in steps 2 to 4. Use that.** Any proposal that
**contradicts** what you measured is reported as **suspect**, with the
`file:line` that contradicts it — never with an opinion. The owner still
decides; what changes is that they decide with the evidence in front of them.

**The detector reads what is declared, not what is used**, and that single
sentence explains both of its results:

| Repo, measured 2026-09-08 | Proposals | Verdict                                                                                                     |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| Astro, content-only       | 9         | 🔴 **4 false** — no backend, no Tailwind utility class in the source, TypeScript declared but not installed |
| Next.js, real             | 12        | ✅ **12 true**, every one backed by the code                                                                |

📐 **The same filter would have caught four there and none here** — which is
what a filter has to do. One that fires where there is nothing to catch is not a
filter, it is noise.

⚠️ **What this does not do is veto.** A contradiction is a reason to look, not a
verdict: a dependency declared and unused today may be the one going in
tomorrow. **You mark it and hand it over. You do not drop it.**

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

If the report ended with **`Foundations missing`**, those lines are not about
the file just written: they are about the project being able to work at all, and
layer 1 demands four of them. Work through them **one at a time**, and:

🔴 **Report, then ask — and do what is authorised.** Rule 4 says the AI
**proposes** and the owner decides. Reporting and going quiet is a weaker
reading: it leaves the owner the decision **and the duty to remember it**, and a
report dies with the session. So the step ends with a question, not a list.

**Ask them together, in one block, and say what each would take:**

| Missing           | How it is offered                                                   |
| ----------------- | ------------------------------------------------------------------- |
| `.gitattributes`  | ✅ **directly** — fixed content, two lines, **only if absent**      |
| `.nvmrc`          | ⚠️ **ask which major** — never deduced, never inherited             |
| `packageManager`  | ⚠️ **ask** — and it edits their `package.json`                      |
| `verify`          | 🔴 **not offered** — see below: the candidates have to be run first |
| CI from the mould | ✅ **last of all** — it needs the three above, or it is born red    |

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
- Cite `path:line` when you refer to the project's code.
- No AI or tool footprint in the output.
- **The foundations are reported, then offered, and never installed unasked.**
  The line rule 4 draws is **authorisation, not the act**: a `.gitattributes`, a
  pinned version or a CI workflow written **on your own account** is the rule
  broken, and it lands in everyone's lockfile without showing in the diff you
  present. Written **because the owner said so in that exchange**, it is the
  rule kept. ⚠️ Reporting and going quiet is not the safe option: it hands them
  the decision and the duty to remember it.
