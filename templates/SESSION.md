# SESSION — where we left off

<!-- template-only: The template each project's docs/SESSION.md is written
     from. Placeholders are filled in by whoever uses it; empty sections are
     deleted, not left saying "nothing for now".

     This file is for **whoever picks the work back up**, whether that is you
     after two weeks or an agent on another machine. Anything that does not
     serve that does not belong. -->

> **What it answers:** where we left off and what to do next. · **Who reads
> it:** whoever picks the work back up. · **How it is pruned:** it is
> **overwritten** — git keeps the history (`git log -p docs/SESSION.md`).

Whatever does not belong here is either a decision (move it to `DECISIONS.md`),
a finding (give it its own file), or noise (delete it).

**Last updated:** {{YYYY-MM-DD}} · {{on which machine}}

---

## State

{{A short table, or three lines. What is finished is not listed — the code and
`git log` already say it. This is for what is **half done** and what comes
next.}}

## ⚠️ Start here

{{The first thing the next person reads, so it is actionable and in order.}}

1. {{The concrete task, with the file, and why it was left there.}}
2. {{…}}

📌 **When this list stops fitting here, that is information, not a nuisance.**
If the items have an **order** —one of them needs what another produces— what
you want is a `ROADMAP.md`. If they are **independent** and the risk is simply
forgetting one, it is a `TODO.md`. Both moulds are in
`~/.claude/reference/templates/` and both go to `docs/`. **Offer them, do not
create them**: a plan nobody asked for is an empty file that ages.

## Waiting on a decision

{{Only what **blocks**, or what will be decided soon. A decision already made
moves to `DECISIONS.md` the same day: left here, it gets argued again.}}

## Watch out for this

{{The traps that cost time and will cost it again: a command that hangs, a
setting that exists on one machine only, a file that regenerates. One line
each, **symptom first** — people search by the symptom, not the cause.}}

## Blocked

{{What cannot be done from here and why: another machine, a credential, an
answer from someone else. Without this section, blocked work looks like
forgotten work.}}

<!-- Guidance, copied from the harness's SESSION template when this file
     was created. **Nothing rewrites it**: it is not a managed block, so
     edit it freely, or delete it once the habit is yours.

  WHEN: when a task closes, not when the session closes. By the end there is no
  context left to write it well.

  SIZE: 200 lines is a **notice**, not a limit. Going over means looking for
  something spent; if everything there is still live, it stays. Counted with
  `wc -l`, which includes blank lines — other tools do not, and then the cap
  argues with itself.

  WHAT NOT TO WRITE:
  - Anything the code or `git log` already tells. This is the filter that keeps
    the file from becoming a diary.
  - A figure that writing it invalidates — "N commits unpushed" is false the
    moment you commit. Write the command that answers it instead.
  - A summary of state inside another document: it ages and ends up lying.

  CORRECTIONS ARE MARKED, NOT DELETED: ⚠️ or struck through, saying what was
  believed true. Knowing something was once taken for granted is part of the
  value.

-->
