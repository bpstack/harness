# Source of the ASVS index

> The official CSV the 17 `asvs-vNN.md` indexes in the parent folder were
> generated from. Kept here so the conversion can be regenerated and audited.

- **File:** `OWASP_Application_Security_Verification_Standard_5.0.0_en.csv`
- **Exact URL:**
  <https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv>
- **Tag:** `v5.0.0` of <https://github.com/OWASP/ASVS> (the git tag is named
  `v5.0.0_release`; `v5.0.0` resolves as a ref)
- **Downloaded:** 2026-08-19 · **Size:** 105 100 bytes · **Rows:** 345
  requirements (70 L1, 183 L2, 92 L3)
- **Checked against the tag:** 2026-09-06 — same sha256, nothing to regenerate
- **sha256:** `98c8fe911b9edb403af8ee05d3ce8201ecac2659e313b053890a62847cdcf680`
- **License:** CC BY-SA 4.0, © 2008-2025 The OWASP Foundation

## Regeneration

CSV fields: `chapter_id`, `chapter_name`, `section_id`, `section_name`,
`req_id`, `req_description`, `L`. Each row becomes:

    - **v5.0.0-<req_id without the leading V>** (L<field L>) <req_description>

Rows are grouped by `chapter_id` into `asvs-vNN.md` files — chapter number
zero-padded so `v02` sorts before `v10` — with sections as
`## <section_id> — <section_name>` headings and the attribution header the
current files carry.

⚠️ The official title of section V3.3 contains a word the leak guard watches.
The generated heading carries a `leak-guard:allow` comment; a regeneration must
keep it or the guard cuts `verify`.

## The updater

```
pnpm run asvs:check     # network: compare the tag's CSV with this README
pnpm run asvs:update    # same, and regenerate + stamp when it changed
node bin/asvs-update.mjs --offline   # rebuild the 17 indexes from this CSV
```

Three outcomes, and only three:

| It finds                        | It does                                 | Exit |
| ------------------------------- | --------------------------------------- | ---- |
| Same sha256 as this README      | says "up to date", touches nothing      | 0    |
| Different sha, **same version** | regenerates the 17 indexes, stamps here | 0    |
| A **newer OWASP tag**           | 🔴 reports it and **applies nothing**   | 1    |

**A version change is never automatic.** Ids already cited in earlier reports
(`v5.0.0-1.2.5`) may vanish or change meaning in 5.1; a silent update would
break the traceability the citation rule exists for. A person reads the release
notes, bumps the tag and URL above by hand, and runs again.

It is not part of `verify`, because it needs the network and a red the CI cannot
fix is a red that gets ignored. What `verify` does check, offline, is that the
shipped indexes are **byte for byte** what this CSV generates through the same
generator (`tests/lib/asvs.test.mjs`).

Two limits, on purpose. A chapter that disappears within a version leaves its
old index on disk — the updater writes and rewrites, it never deletes. And the
years in the attribution header ("May 2025", "2008-2025") belong to the version:
they are changed by hand with the tag.

## ⚠️ What the updater knows, learned on 2026-09-06

- **Compare against the tag, never against the `latest` release.** That release
  is a rolling "Bleeding Edge" build whose file keeps the `5.0.0` name: its
  sha256 differs while the declared version does not.
- **Hash the normalized content** (strip ` `). The rolling build differed only
  in line endings; a byte hash would report a change that is not there.
- **The git tag is named `v5.0.0_release`**; `v5.0.0` resolves as a ref, and the
  version detector reads both forms.
