# ASVS v5.0.0 — V2 Validation and Business Logic

> **Requirement index for chapter V2 — Validation and Business Logic.** Every
> entry carries an id ready to cite (`v5.0.0-<chapter>.<section>.<req>`), the
> level `L` at which it becomes mandatory — an L2 project meets L1 and L2 — and
> the official text, which is what gets cited (rule in `asvs.md` §5).
>
> **OWASP Application Security Verification Standard 5.0.0** (May 2025), ©
> 2008-2025 The OWASP Foundation, licensed **CC BY-SA 4.0** —
> <https://creativecommons.org/licenses/by-sa/4.0/>. Adapted with attribution,
> shared alike. Source: the official CSV of tag `v5.0.0` —
> <https://github.com/OWASP/ASVS/tree/v5.0.0>. Generated from that source; do
> not edit by hand.

## V2.1 — Validation and Business Logic Documentation

- **v5.0.0-2.1.1** (L1) Verify that the application's documentation defines
  input validation rules for how to check the validity of data items against an
  expected structure. This could be common data formats such as credit card
  numbers, email addresses, telephone numbers, or it could be an internal data
  format.
- **v5.0.0-2.1.2** (L2) Verify that the application's documentation defines how
  to validate the logical and contextual consistency of combined data items,
  such as checking that suburb and ZIP code match.
- **v5.0.0-2.1.3** (L2) Verify that expectations for business logic limits and
  validations are documented, including both per-user and globally across the
  application.

## V2.2 — Input Validation

- **v5.0.0-2.2.1** (L1) Verify that input is validated to enforce business or
  functional expectations for that input. This should either use positive
  validation against an allow list of values, patterns, and ranges, or be based
  on comparing the input to an expected structure and logical limits according
  to predefined rules. For L1, this can focus on input which is used to make
  specific business or security decisions. For L2 and up, this should apply to
  all input.
- **v5.0.0-2.2.2** (L1) Verify that the application is designed to enforce input
  validation at a trusted service layer. While client-side validation improves
  usability and should be encouraged, it must not be relied upon as a security
  control.
- **v5.0.0-2.2.3** (L2) Verify that the application ensures that combinations of
  related data items are reasonable according to the pre-defined rules.

## V2.3 — Business Logic Security

- **v5.0.0-2.3.1** (L1) Verify that the application will only process business
  logic flows for the same user in the expected sequential step order and
  without skipping steps.
- **v5.0.0-2.3.2** (L2) Verify that business logic limits are implemented per
  the application's documentation to avoid business logic flaws being exploited.
- **v5.0.0-2.3.3** (L2) Verify that transactions are being used at the business
  logic level such that either a business logic operation succeeds in its
  entirety or it is rolled back to the previous correct state.
- **v5.0.0-2.3.4** (L2) Verify that business logic level locking mechanisms are
  used to ensure that limited quantity resources (such as theater seats or
  delivery slots) cannot be double-booked by manipulating the application's
  logic.
- **v5.0.0-2.3.5** (L3) Verify that high-value business logic flows require
  multi-user approval to prevent unauthorized or accidental actions. This could
  include but is not limited to large monetary transfers, contract approvals,
  access to classified information, or safety overrides in manufacturing.

## V2.4 — Anti-automation

- **v5.0.0-2.4.1** (L2) Verify that anti-automation controls are in place to
  protect against excessive calls to application functions that could lead to
  data exfiltration, garbage-data creation, quota exhaustion, rate-limit
  breaches, denial-of-service, or overuse of costly resources.
- **v5.0.0-2.4.2** (L3) Verify that business logic flows require realistic human
  timing, preventing excessively rapid transaction submissions.
