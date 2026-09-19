# Reference — OWASP ASVS 5.0.0

> **What this is.** The security reference sheet the `security` agent opens **on
> demand**, when the project's level calls for it. It is never loaded as
> permanent context: a review at L1 does not open it at all.
>
> **Primary source:** the official CSV of tag `v5.0.0`, kept in
> [`source/`](./source/README.md) with its URL, sha256 and regeneration recipe.
> The 17 chapter indexes next to this file are generated from it. When in doubt,
> the CSV wins.

## 1. Official sources

- Repository: <https://github.com/OWASP/ASVS>
- Project page:
  <https://owasp.org/www-project-application-security-verification-standard/>
- 5.0.0 downloads (PDF, Word, CSV, JSON):
  <https://github.com/OWASP/ASVS/tree/v5.0.0>. CSV and JSON are meant for
  programmatic use.
- Current version: **5.0.0** (May 2025). Earlier: 4.0 (2019) and 4.0.3 (2021).
- License **CC BY-SA 4.0** (© 2008-2025 The OWASP Foundation): adapt with
  attribution, share under the same license.

## 2. What it is

An open security verification standard for web applications and services, around
since 2008. It defines requirements to **design, build and test**, and every
requirement is checkable.

## 3. The three levels — the dial

This is the piece used daily: it decides **how much reference gets opened**.

| Level | Applies to            | Examples                                             | Weight            |
| ----- | --------------------- | ---------------------------------------------------- | ----------------- |
| 1     | Ordinary applications | Landing page, blog, portfolio, simple CRM, brochure  | 70 of 345 (20%)   |
| 2     | Important data        | SaaS, hotel PMS, ERP, marketplace, ecommerce         | ~50% (70% cumul.) |
| 3     | Critical applications | Banking, health, defense, critical infra, government | remaining ~30%    |

- **L1** — the critical starting point, the first layer of defense; it exists to
  lower the entry barrier. Note that 5.0 no longer defines L1 as "black-box
  testable" — that was the 4.x line, and 5.0 drops it ("The Fallacy of
  Testability").
- **L2** — the target most applications should aim for.
- **L3** — maximum assurance, defense in depth. The standard contrasts a startup
  (L1 may do) with a bank (hard to justify less than L3).

Each organization picks its level by its own risk; the standard does not impose
one.

## 4. Chapters

**5.0 (17 chapters + appendices):** V1 Encoding and Sanitization · V2 Validation
and Business Logic · V3 Web Frontend Security · V4 API and Web Service · V5 File
Handling · V6 Authentication · V7 Session Management · V8 Authorization · V9
Self-contained Tokens · V10 OAuth and OIDC · V11 Cryptography · V12 Secure
Communication · V13 Configuration · V14 Data Protection · V15 Secure Coding and
Architecture · V16 Security Logging and Error Handling · V17 WebRTC. Appendices:
A Glossary, B References, C Cryptography, D Recommendations, E Contributors.

**4.0.3 (14 chapters), in case you meet older documentation:** V1 Architecture ·
V2 Authentication · V3 Session Management · V4 Access Control · V5 Validation ·
V6 Stored Cryptography · V7 Error Handling and Logging · V8 Data Protection · V9
Communications · V10 Malicious Code · V11 Business Logic · V12 Files and
Resources · V13 API · V14 Configuration.

**Chapters exist to filter out what does not apply** (§"How to use the ASVS"):
the standard's own example is a machine-to-machine API (V3 does not apply) or a
project without OAuth or WebRTC (V10 and V17 are skipped). Never all 17.

Internal structure: each chapter opens with a "Control Objective" and closes
with "References". The first section of many (V2.1, V3.1, V5.1, V6.1, V7.1,
V8.1, V13.1, V14.1, V15.1, V16.1) holds **documentation requirements**.

**The 345 requirements live in the per-chapter indexes:** `asvs-v01.md` …
`asvs-v17.md`, in this folder — one file per chapter, each requirement with its
versioned id, level and official text. This sheet indexes chapters; to cite a
requirement, open the chapter that applies and copy from there.

## 5. How a requirement is cited — mandatory

Identifier `<chapter>.<section>.<requirement>`, and since these change between
versions, the correct form carries the version: **`v5.0.0-1.2.5`** (lowercase
`v`). That example is the 5th requirement of "Injection Prevention", and its
official text is: _"Verify that the application protects against OS command
injection and that operating system calls use parameterized OS queries or use
contextual command line output encoding"_ (§"How to Reference ASVS
Requirements").

**Rule:** every citation of a requirement, in any document, checklist, prompt or
test, carries the versioned identifier — and quotes the official text or says it
is own judgement. **Requirements are never invented.**

## 6. Three things in the standard that shape design

1. **Documented decisions.** 5.0 requires certain decisions to be written down —
   accepted file types, session timeouts, authorization rules, data
   classification — because without them verification is impossible. They belong
   in the project's decision log as ADRs, not as checks.
2. **Forking is blessed** (§"Forking the ASVS"): OWASP encourages adapting —
   dropping what is irrelevant, adding own guidance — on the condition that
   identifier traceability is kept. "Adapted, not copied" is the official route,
   not a shortcut.
3. **SAST/DAST are not enough** (§"Verification Mechanisms"): "testable with
   automation" ≠ "run a standard tool". Verifying L2/L3 needs access to
   documentation, code and configuration. A CI gate is necessary and not
   sufficient.

## 7. Rough map from area to 5.0 chapters

For when an area's rules get written and you need to know which chapter to open.

| Area                      | ASVS 5.0 chapters  |
| ------------------------- | ------------------ |
| Authentication            | V6                 |
| Session                   | V7                 |
| JWT tokens                | V9                 |
| OAuth/OIDC                | V10                |
| Authorization             | V8                 |
| Validation / errors       | V1, V2             |
| Frontend                  | V3                 |
| API                       | V4                 |
| File upload               | V5                 |
| Cryptography              | V11 (+ appendix C) |
| Communication             | V12                |
| Configuration / DevOps    | V13                |
| Data protection / privacy | V14                |
| Architecture              | V15                |
| Logging / monitoring      | V16                |
| WebRTC (if any)           | V17                |
