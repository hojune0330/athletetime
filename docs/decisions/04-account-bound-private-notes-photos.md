# Decision 4: Account-Bound Private Notes and Photos

**Status: OWNER DECISION REQUIRED**

This packet asks the owner whether AthleteTime should add an account-private
vault for notes and, separately, photos. It does not create private storage,
upload capability, an export, or a deletion workflow. It makes no legal
conclusion.

## Current boundary

- Record collections are browser-local helper state, not account-backed,
  verified, or recoverable private records.
- There is no account-private note, photo, attachment, export, or deletion
  feature today.
- The existing `/api/upload/*` path returns public Cloudinary URLs. It is
  public-by-URL storage and must not receive private note text, photos,
  attachments, sensitive filenames, or private metadata. This packet does not
  characterize that path as private storage.
- Public records, team aggregates, search responses, operator views, and
  community surfaces must not contain a private note body, photo, download
  reference, or vault identifier.

## Decision required

The owner must select the feature scope, storage provider/ownership model,
signed-access lifetime, export contents, deletion/backup lifecycle,
reauthentication rule, incident response, and any account-age/guardian gate.

| Option | Decision | Consequence |
| --- | --- | --- |
| 1 | Keep private notes and photos closed. | Keep current browser-local collection behavior and the public upload boundary; add no account-private API or storage. |
| 2 | Permit account-bound text notes only. | Requires a distinct authenticated API, per-account authorization, export/deletion/retention rules, reauthentication, and cross-account tests. Photos remain closed. |
| 3 | Permit a staged private vault: text notes first, then photos only after a second owner release check. | Requires all Option 2 controls plus distinct private object storage, server-issued time-limited signed access, photo metadata handling, object deletion, and photo-specific cross-account/expiry tests. |

**Conservative recommendation, pending owner confirmation: Option 1. Keep
private notes and photos closed.** It avoids expanding account-held sensitive
data before the lifetime and access model is explicitly approved.

**Not approved: remain closed/current behavior.** Do not create private
uploads, reuse the public upload route, associate an account with a public
athlete record, or add a vault export/deletion endpoint.

## Data touched if an option is approved

No private-vault data is touched by this document. A future approved design
would need to minimize and govern the following categories separately:

- Account identifier and an opaque vault-item identifier. Neither is a claim
  that the account owns or is the athlete represented by a public record.
- Private note text, creation/update/deletion timestamps, and the minimum
  access/deletion audit data needed for the owner-approved lifecycle.
- For photos: the private object reference, content type/size, and a
  server-issued access token or signed reference. Do not expose a permanent
  public URL, original filename, unneeded metadata, or raw storage identifier.
- A user export manifest and the data selected for export. The owner must
  choose whether export includes deleted-pending-purge material, photo bytes,
  and audit metadata before implementation.

The existing data-rights retention schedule applies to data-rights requests;
it does not decide private-vault retention. The owner must set private note and
photo retention, deletion completion, backup expiry, and recovery behavior
before any account-held data is accepted.

## Irreversible effects and limits

- Deletion may make private notes or photos unrecoverable after the approved
  backup window expires. A user-facing delete label cannot promise immediate
  erasure from every backup unless the approved system actually provides it.
- Export creates a user-controlled copy. Its scope, authentication step, and
  safe delivery method must be chosen before release.
- A private object store or signing system adds an account-access and key/
  credential management boundary. A code rollback does not delete stored
  notes, photos, exports, or backup copies.
- Photo upload can carry location and other metadata. Any metadata-removal or
  preservation behavior must be explicitly tested; this packet does not assume
  it exists.

## Preconditions before implementation

1. The owner selects an option and separately confirms whether an
   account-age, guardian, consent, recovery, and account-deletion decision is
   needed before this scope can open.
2. A separate authenticated API binds every vault item to one account and
   returns the same non-enumerating unavailable response for unauthenticated
   and cross-account reads.
3. Private notes and photos use a storage path separate from `/api/upload/*`
   and public Cloudinary URLs. For photos, the server authorizes each request
   and issues only time-limited signed access after the account check.
4. The storage provider, key/credential ownership, upload constraints,
   malware/content handling, metadata policy, logging redaction, and operator
   access policy are reviewed and recorded.
5. Export requires the owner-approved recent authentication and returns only
   the requesting account's selected data through the approved delivery path.
6. Deletion states, recovery window, purge process, backup expiry, and user
   wording are documented. Password reset, account recovery, logout, and
   shared-device session changes must invalidate access as required by the
   owner-approved model.
7. Account separation and failure behavior pass the release tests below before
   any feature route or CTA becomes available.

## Rejection and rollback

- **Owner rejects or defers:** retain device-local collections and the existing
  public-upload boundary; do not accept private content on the server.
- **Pre-release gate fails:** do not expose the private route or upload path.
  Remove test fixtures through their approved test cleanup only; do not use a
  production data operation as cleanup.
- **Approved feature needs reversal:** make the private feature unavailable
  first, preserve the owner-approved deletion/export support path, and handle
  each stored item under the selected retention lifecycle. Do not repoint
  private objects to a public URL as a rollback shortcut.
- **Access-control or signing incident:** stop access issuance, preserve only
  the minimum incident evidence permitted by the approved policy, and follow
  the owner-approved incident procedure. Do not broaden operator access to
  private content as a diagnostic default.

## Executable release tests

### Current-boundary regression gate

Run the existing authentication and public-upload contract checks before and
after any proposal:

```powershell
node --test backend/tests/auth-cookie-csrf.test.js backend/tests/auth-security-readiness.test.js backend/tests/cloudinary-contract.test.js backend/tests/upload-multer-contract.test.js
```

These are current regression anchors, not proof that a future private vault is
implemented or that public Cloudinary storage is private.

### Required new release scenarios

Before Option 2 or 3 can ship, add focused tests and run them with the current
gate. The release is blocked unless all of these scenarios pass:

```powershell
node --test backend/tests/private-vault-access.test.js backend/tests/private-vault-lifecycle.test.js backend/tests/private-vault-export.test.js backend/tests/auth-cookie-csrf.test.js backend/tests/auth-security-readiness.test.js backend/tests/cloudinary-contract.test.js backend/tests/upload-multer-contract.test.js
```

- Account A can create, read, update, export, and delete only its own vault
  item. Account B, an unauthenticated client, and a guessed opaque identifier
  receive the same non-enumerating unavailable response and no content.
- A public-record, team, search, community, and ordinary operator response
  contains no private body, photo, permanent download reference, vault ID, or
  storage identifier.
- The public Cloudinary upload helper receives no private note, photo,
  attachment, filename, metadata, or signed-access input. A private photo
  path, if later approved, uses the separate storage adapter only.
- A signed photo access reference expires, cannot be replayed for another
  account, and is not written to ordinary logs or client-visible analytics.
- Export requires the approved recent-authentication state and contains only
  the requesting account's selected items.
- Delete, recovery, retention expiry, backup-expiry evidence, logout, password
  reset, and shared-device session changes match the owner-approved lifecycle.

## Related existing boundaries and evidence

- [Data privacy guardrails](../data-privacy-guardrails.md) for minimization,
  retention, no-store, backup, and the explicit non-legal-conclusion boundary.
- [Private vault release boundary](../athletetime-private-vault-release-boundary.md)
  for account ownership, non-enumerating access, signed delivery, metadata,
  export, deletion, and cross-account release expectations.
- [Data-rights rollout runbook](../data-rights-rollout-runbook.md) for the
  separately approved backup, readiness, and stop-condition posture. It does
  not authorize a private-vault deployment.
- [Authentication cookie/CSRF tests](../../backend/tests/auth-cookie-csrf.test.js),
  [authentication readiness tests](../../backend/tests/auth-security-readiness.test.js),
  [Cloudinary contract tests](../../backend/tests/cloudinary-contract.test.js),
  and [upload middleware contract tests](../../backend/tests/upload-multer-contract.test.js)
  for current regression anchors.
