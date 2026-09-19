# ASVS v5.0.0 — V14 Data Protection

> **Requirement index for chapter V14 — Data Protection.** Every entry carries
> an id ready to cite (`v5.0.0-<chapter>.<section>.<req>`), the level `L` at
> which it becomes mandatory — an L2 project meets L1 and L2 — and the official
> text, which is what gets cited (rule in `asvs.md` §5).
>
> **OWASP Application Security Verification Standard 5.0.0** (May 2025), ©
> 2008-2025 The OWASP Foundation, licensed **CC BY-SA 4.0** —
> <https://creativecommons.org/licenses/by-sa/4.0/>. Adapted with attribution,
> shared alike. Source: the official CSV of tag `v5.0.0` —
> <https://github.com/OWASP/ASVS/tree/v5.0.0>. Generated from that source; do
> not edit by hand.

## V14.1 — Data Protection Documentation

- **v5.0.0-14.1.1** (L2) Verify that all sensitive data created and processed by
  the application has been identified and classified into protection levels.
  This includes data that is only encoded and therefore easily decoded, such as
  Base64 strings or the plaintext payload inside a JWT. Protection levels need
  to take into account any data protection and privacy regulations and standards
  which the application is required to comply with.
- **v5.0.0-14.1.2** (L2) Verify that all sensitive data protection levels have a
  documented set of protection requirements. This must include (but not be
  limited to) requirements related to general encryption, integrity
  verification, retention, how the data is to be logged, access controls around
  sensitive data in logs, database-level encryption, privacy and
  privacy-enhancing technologies to be used, and other confidentiality
  requirements.

## V14.2 — General Data Protection

- **v5.0.0-14.2.1** (L1) Verify that sensitive data is only sent to the server
  in the HTTP message body or header fields, and that the URL and query string
  do not contain sensitive information, such as an API key or session token.
- **v5.0.0-14.2.2** (L2) Verify that the application prevents sensitive data
  from being cached in server components, such as load balancers and application
  caches, or ensures that the data is securely purged after use.
- **v5.0.0-14.2.3** (L2) Verify that defined sensitive data is not sent to
  untrusted parties (e.g., user trackers) to prevent unwanted collection of data
  outside of the application's control.
- **v5.0.0-14.2.4** (L2) Verify that controls around sensitive data related to
  encryption, integrity verification, retention, how the data is to be logged,
  access controls around sensitive data in logs, privacy and privacy-enhancing
  technologies, are implemented as defined in the documentation for the specific
  data's protection level.
- **v5.0.0-14.2.5** (L3) Verify that caching mechanisms are configured to only
  cache responses which have the expected content type for that resource and do
  not contain sensitive, dynamic content. The web server should return a 404 or
  302 response when a non-existent file is accessed rather than returning a
  different, valid file. This should prevent Web Cache Deception attacks.
- **v5.0.0-14.2.6** (L3) Verify that the application only returns the minimum
  required sensitive data for the application's functionality. For example, only
  returning some of the digits of a credit card number and not the full number.
  If the complete data is required, it should be masked in the user interface
  unless the user specifically views it.
- **v5.0.0-14.2.7** (L3) Verify that sensitive information is subject to data
  retention classification, ensuring that outdated or unnecessary data is
  deleted automatically, on a defined schedule, or as the situation requires.
- **v5.0.0-14.2.8** (L3) Verify that sensitive information is removed from the
  metadata of user-submitted files unless storage is consented to by the user.

## V14.3 — Client-side Data Protection

- **v5.0.0-14.3.1** (L1) Verify that authenticated data is cleared from client
  storage, such as the browser DOM, after the client or session is terminated.
  The 'Clear-Site-Data' HTTP response header field may be able to help with this
  but the client-side should also be able to clear up if the server connection
  is not available when the session is terminated.
- **v5.0.0-14.3.2** (L2) Verify that the application sets sufficient
  anti-caching HTTP response header fields (i.e., Cache-Control: no-store) so
  that sensitive data is not cached in browsers.
- **v5.0.0-14.3.3** (L2) Verify that data stored in browser storage (such as
  localStorage, sessionStorage, IndexedDB, or cookies) does not contain
  sensitive data, with the exception of session tokens.
