# TODO — {{PROJECT}}

> **What it answers:** what is left to do. · **Who reads it:** whoever picks the
> work back up, when choosing what to work on. · **How it is pruned:** finished
> items are deleted, not struck through — `git log` already records that they
> were done.

🔴 **Finished work leaves the plan.** The same rule holds in `ROADMAP.md` and
here; **only where it lands changes**, depending on whether the project keeps
its reasoning anywhere. Here it is **deleted**: a `TODO.md` has no archive
behind it, and `git log` already records that it happened.

📌 **The day one of these items needs another one done first, this file is the
wrong one.** An order that matters belongs in a `ROADMAP.md` — the mould is at
`~/.claude/reference/templates/ROADMAP.md` and goes to `docs/`. A dependency
tracked in a flat list is a dependency nobody is tracking.

⚠️ **Before treating something as pending, check the tree.** A stale TODO is not
neutral: it makes an agent **reimplement on top of** what already exists. A file
left alone for a few weeks ends up listing as pending almost everything that was
already done.

**Priority:** 🔴 high · 🟡 medium · 🟢 low

---

## 🔴 High

- [ ] **{{Short title}}** — {{what to do, and where}}. _Checked on {{date}}:
      {{what was verified to know it is still pending}}_

## 🟡 Medium

- [ ] {{…}}

## 🟢 Low

- [ ] {{…}}

## ⛔ Not doing

{{What was decided **against**, with one line of why. Without this section,
rejected ideas come back every three months and get argued again.}}

<!-- Guidance, copied from the harness's TODO template when this file
     was created. **Nothing rewrites it**: it is not a managed block, so
     edit it freely, or delete it once the habit is yours.

  WHAT NOT TO WRITE HERE:
  - Anything already done. Delete it. A ✅ in a document is an opinion; the
    test is the fact, and `git log` is the record.
  - Inventories of modules, stack or dependencies: those are in the code.
  - Unverified tasks. See the warning above — it is the most expensive failure
    this file has.

  WHEN IT GROWS: with the milestone. If it cannot be read in one sitting, split
  it by area — one file per module — and leave this one as the index.

  WHEN IT BECOMES A ROADMAP: when the order stops being irrelevant. If you can
  shuffle the points and nothing breaks, this is a TODO. If point B needs what
  A produces, you need `ROADMAP.md`.

-->
