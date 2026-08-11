# Account Terms, Privacy Consent, Minor Guardian, and Shared-Device Sessions

## OWNER DECISION REQUIRED

This packet records an unresolved account policy gate. It does not approve
terms acceptance, privacy-consent collection, an age threshold, a guardian
process, session duration, persistent login, or shared-device retention. A
written owner choice is required before an implementation may alter account
collection, registration, or session behavior.

## Current behavior

- The auth/privacy contract requires the production target to use `HttpOnly`,
  `Secure`, `SameSite` cookies. It also says that the current frontend
  `localStorage` token approach is temporary and must be removed during the
  production transition; logout must invalidate the server session and remove
  the browser cookie. See [the auth/privacy contract](../athletetime-auth-privacy-security-contract.md#L11).
- The same contract prohibits storing authentication, refresh, or administrator
  tokens in `localStorage` or `sessionStorage`. It requires expired password
  reset codes, email verification codes, and session records to be deleted
  after their necessary retention period, but it does not set a duration. See
  [the auth/privacy contract](../athletetime-auth-privacy-security-contract.md#L38).
- Account deletion, export, deletion/anonymization requests for community
  activity, and separation of public record corrections from account deletion
  are required by the contract. Public record indexes must not automatically
  link to accounts. See [the auth/privacy contract](../athletetime-auth-privacy-security-contract.md#L31).
- The release matrix treats a parent or guardian as a separate role and asks
  whether a correction form avoids unnecessary sensitive data; it does not
  establish consent ages or a guardian verification process. See [the release
  matrix](../athletetime-persona-release-matrix.md#L11).
- The team memo requires private-feature testing to include logout, account
  deletion, password reset, and shared-device session termination before any
  release. It does not prescribe a session lifetime or a guardian workflow. See
  [the team memo](../athletetime-persona-team-memo-boundaries.md#L105).

## Decision options

1. **Keep the present hold.** Do not add an account-policy acceptance record,
   age collection, guardian workflow, persistent-session rule, or
   shared-device retention behavior. Preserve the existing contract's release
   blockers and do not represent the account path as ready for real-user
   community launch.
2. **Owner-defined general-account contract.** Before implementation, the
   owner supplies the exact terms/privacy documents, versioning rule, consent
   record, applicability, user-facing withdrawal/deletion path, and an explicit
   session lifetime. This option does not authorize a minor flow; users who
   need such a flow remain outside the new account path until separately
   decided.
3. **Owner-defined contract with a minor/guardian flow.** In addition to option
   2, the owner supplies the age rule, guardian role and verification evidence,
   information collected, consent withdrawal/revocation behavior, and the
   shared-device session/account-switch rule. No age, consent standard,
   guardian relationship, or retention period is supplied by this packet.

## Recommendation (not approved)

Choose option 1 until the owner supplies the policy inputs required by options
2 or 3 and the cookie/CSRF transition is demonstrably complete. The current
contract defines essential security and data-separation constraints, but it
does not decide the consent, minor, guardian, or session-retention details.

## Data touched

No data changes occur from this packet. If later approved, the smallest
documented set must be defined before collection, including only the account
identifier, policy document/version, acceptance or withdrawal event, necessary
session metadata, and any owner-approved guardian evidence. Authentication,
refresh, and administrator tokens must never be written to browser storage.
Account data must remain separate from public athletic records; no public
record identity link is created.

## Irreversibility

Terms or privacy acceptance can affect a user's reliance on an account flow,
and guardian or consent evidence can create sensitive retention obligations.
A shorter session lifetime can be changed prospectively, but a previously
persistent session may have remained on a shared device. Removing code cannot
retract data already collected or end a copied session without an explicit
server-side revocation procedure.

## Prerequisites

- Written owner choice of one option, the exact policy texts and versions, the
  audience and age rule, any guardian relationship/verification process, the
  data fields, retention/deletion/withdrawal handling, and shared-device
  session/account-switch behavior.
- A documented session lifetime and server-side revocation plan; no duration is
  inferred from the current contract.
- Production cookie session migration, CSRF protection for every write, no
  credential storage in browser storage, and logging checks that exclude
  passwords, codes, and tokens.
- Browser and server tests for registration, policy display and acceptance,
  logout, password reset, account deletion, reauthentication where selected,
  account switching on a shared device, and consent withdrawal where selected.

## Rejection and rollback behavior

If the owner rejects or defers every option, do not collect consent, age, or
guardian information and do not change session retention. If a later approved
release fails its security, isolation, or withdrawal tests, stop new use of the
new path and apply the owner-approved server-side session revocation procedure.
Do not delete existing account or policy evidence automatically, and do not
move credentials into browser storage as a rollback shortcut.

## Executable release tests

- Run `node --test backend/tests/auth-security-readiness.test.js
  backend/tests/auth-recovery-hardening.test.js
  backend/tests/auth-admin-bootstrap-production.test.js`; the existing auth
  safety, recovery, and production-admin guards must pass.
- Run `node --test backend/tests/auth-cookie-csrf.test.js
  backend/tests/frontend-auth-cookie-contract.test.js`; the cookie and CSRF
  contract must pass without an authentication token stored in browser storage.
- Before any chosen option is released, add and run
  `node --test backend/tests/account-consent-session-policy.test.js`. It must
  verify the owner-selected policy version and data minimum, selected
  withdrawal/deletion behavior, expiry/revocation, logout, shared-device
  account switch, and every selected minor/guardian branch. This command is a
  future release prerequisite, not an authorization to add the test or feature
  now.

## Not approved: remain closed/current behavior

No terms/privacy-consent implementation, age gate, guardian verification,
persistent session choice, shared-device session-retention rule, or new account
data collection is approved by this packet. The unresolved account policy gate
remains closed and the current behavior above continues.
