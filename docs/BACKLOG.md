# Clutterscore backlog

Prioritised fixes and optimisations, captured from the product review on 2026-10-24. This is a working document: update the status when an item is implemented, and record any new evidence or decision in the item.

**Priority key**

- **P0** — fix before onboarding a paying customer.
- **P1** — next engineering pass; correctness or launch polish.
- **P2** — validate or scale; do after the P0/P1 work.

**Status key:** `Proposed` · `In progress` · `Done`

## Summary

| # | Item | Priority | Status |
| --- | --- | --- | --- |
| 1 | Enforce plan entitlements server-side | P0 | Proposed |
| 2 | Unify subscription tier identifiers | P0 | Proposed |
| 3 | Harden integration-token encryption | P0 | Proposed |
| 4 | Fix broken redirects and stale docs | P1 | In progress (README done) |
| 5 | Derive playbook actions per item | P1 | Proposed |
| 6 | Scale audits with fan-out and incremental sync | P2 | Proposed |
| 7 | Validate pricing with a paid pilot | P2 | Proposed |

---

## 1. Enforce plan entitlements server-side

**Priority:** P0 · **Status:** Proposed · **Area:** billing, security

### Problem

Free-tier limits are enforced in React hooks and UI components. A user can bypass them by calling the API or auth client directly. The paid/free boundary is therefore advisory, not real.

The server does enforce the free **audit allowance** (`src/lib/audit-throttle.ts` is called by `POST /api/audit/run`), but the other limits are not enforced.

### Evidence

- Integration limit (3 active integrations) lives in `src/hooks/use-integrations.ts:24` and is checked at `:64`. `GET /api/oauth/[source]/authorize` has no limit check.
- Playbook approve/execute is blocked in the browser at `src/hooks/use-playbooks.ts:94` and `:163`. The API routes `src/app/api/playbooks/[id]/approve/route.ts` and `src/app/api/playbooks/[id]/execute/route.ts` only check organisation ownership and status.
- File archiving is blocked in the browser at `src/hooks/use-files.ts:166`; the archive API does not check the plan.
- Member invitations are limited by `src/components/settings/members.tsx:127` and `src/components/forms/invitation-form.tsx:71`. Invitations are sent through Better Auth from the client, so the limit can be bypassed.
- `src/lib/middleware.ts:96` contains a commented-out `withProSubscription` helper. It should be replaced, not revived as-is, because "pro" is not a valid tier value.

### Fix

1. Create a single entitlement module (for example `src/lib/entitlements.ts`) that resolves the active organisation's plan and exposes named checks:
   - `canConnectIntegration(org, activeCount)`
   - `canInviteMember(org)`
   - `canExecutePlaybook(org)`
   - `canArchiveFile(org)`
   - `canUseAutomatedCleanup(org)`
2. Call these checks from every mutating server route or server action:
   - OAuth authorise/callback and integration sync.
   - Playbook approve and execute.
   - File archive.
   - Invitation creation (move the invitation call behind a server action or verify in a Better Auth hook).
3. Return a structured `403`/`402` response with a machine-readable code (`PLAN_LIMIT_REACHED`, `PAID_PLAN_REQUIRED`) so the client can show the upgrade dialog.
4. Keep the UI checks as hints, not as the source of truth.

### Acceptance criteria

- A free organisation cannot connect a fourth integration, approve or execute a playbook, archive a file, or invite a member by calling the API directly.
- A paid organisation on any `pro-tier*` plan can do all of those.
- The free audit allowance still works and still returns `429` with a reset date.
- Entitlement checks have integration tests covering free, each paid tier, and an organisation with no subscription row.

---

## 2. Unify subscription tier identifiers

**Priority:** P0 · **Status:** Proposed · **Area:** billing, automation

### Problem

The codebase uses three different vocabularies for the same subscription state:

- Plan IDs: `free`, `pro-tier0`, `pro-tier1`, `pro-tier2`, `pro-tier3` (`src/lib/subscription-plans.ts:68`, `:104`, `:140`, `:184`).
- The Polar webhook stores the plan ID directly as `organization.subscriptionTier` (`src/server/polar.ts:18`).
- The weekly automation filters for `"pro"` or `"enterprise"` (`src/inngest/functions/automated-playbook-execution.ts:52-56`).
- The audit throttle upgrade payload advertises `pro-tier-1`, `pro-tier-2`, `pro-tier-3` (`src/app/api/audit/run/route.ts:20`) — wrong separator, and Tier 0 is missing.
- The in-app Enterprise plan is commented out (`src/lib/subscription-plans.ts:227`), so `"enterprise"` is never assigned.

The practical result: organisations that pay for `pro-tier0`…`pro-tier3` are **not** picked up by the weekly automated cleanup. The flagship paid feature silently does nothing.

### Fix

1. Export a single source of truth from `src/lib/subscription-plans.ts`:
   - `PAID_PLAN_IDS` / `isPaidPlanId(id)`
   - `isPaidTier(tier)`
   - `getPlanById(id)` (already exists as `getPlan`)
2. Replace every string comparison with those helpers. For automation, select organisations whose tier is a paid plan, not `"pro" || "enterprise"`.
3. Align the `429` upgrade payload in `POST /api/audit/run` with real plan IDs.
4. Decide whether Enterprise is sold in-app. If not, remove `"enterprise"` from onboarding/UI assumptions and route >2,000 users to sales explicitly.
5. Add a test that maps each Polar product ID to a plan and asserts that the resulting tier is considered paid.

### Acceptance criteria

- An organisation on `pro-tier0` is included in the weekly automation.
- No production code compares `subscriptionTier` to `"pro"` or `"enterprise"` unless those are real plan IDs.
- The audit limit response and billing UI reference the same plan IDs.
- A test fails if a new paid plan is added without updating the paid-tier helper.

---

## 3. Harden integration-token encryption

**Priority:** P0 · **Status:** Proposed · **Area:** security

### Problem

Tokens are not stored in plaintext — `src/lib/prisma.ts` encrypts `accessToken` and `refreshToken` for `ToolIntegration` and `Account` through a Prisma client extension, using `src/lib/crypto.ts` and `INTEGRATION_ENCRYPTION_KEY`. That is better than the "encrypted-ish" note implied. The remaining problem is the key model:

- One application-level key encrypts every tenant's tokens.
- There is no key version, rotation path or KMS/secret-manager integration.
- Every `find*` on the models decrypts tokens, even for code that only needs metadata.
- A compromised app environment exposes every integration token at once.
- Raw SQL or a Prisma client created without the extension bypasses encryption/decryption.
- The key is required at import time, which couples startup to secret availability.

### Fix

1. Move to **envelope encryption**: a KMS/secret-manager master key wraps per-record or per-tenant data keys; store the wrapped key and a key version alongside the ciphertext.
2. Add key versioning and a rotation runbook. Rotation must not require re-authorising every integration.
3. Decrypt only at the connector boundary. Avoid returning decrypted tokens from generic reads; consider a dedicated `getIntegrationCredentials()` repository method.
4. Ensure no API route serialises token fields to the client. `GET /api/integrations` already selects a safe subset; add a regression test.
5. Redact tokens and authorization headers from logs and error reports.
6. Document the key format and rotation procedure. The current key is a base64-encoded 32-byte value.

### Acceptance criteria

- No plaintext integration token exists in the database.
- Rotating the encryption key works without customer re-authorisation and without downtime.
- A token is never returned by an API response or written to logs.
- A test proves that a Prisma query without the encryption extension cannot read usable tokens.

---

## 4. Fix broken redirects and stale docs

**Priority:** P1 · **Status:** In progress · **Area:** correctness, docs

### Problem

Several notification and OAuth redirects point at routes that do not exist. The README also described an unrelated notes application.

**Done:** `README.md` has been rewritten for Clutterscore. `CONTEXT.md`, three ADRs and this backlog have been added.

**Still open:**

| Location | Broken target | Correct target |
| --- | --- | --- |
| `src/app/api/oauth/[source]/callback/route.ts:23,32,43,54,110,118` | `/dashboard/integrations` | `/dashboard/settings/integrations` |
| `src/inngest/functions/sync-integrations.ts:79,167` | `/dashboard/integrations` | `/dashboard/settings/integrations` |
| `src/inngest/functions/run-audit.ts:242` | `/dashboard/audit/{id}` | `/dashboard` (no per-audit page exists) or add an audit detail page |
| `src/inngest/functions/automated-playbook-execution.ts:190` | `/playbooks/{id}` | `/dashboard/playbooks/{id}` |

The previously noted `/contact-sales` link is **not present** in the current tree. Confirm whether a sales page is still wanted before adding one.

### Fix

1. Replace each target with an existing route, or add the missing page.
2. Prefer route constants or typed helpers over string literals.
3. Add a small test that crawls notification `actionUrl` values and asserts they resolve.

### Acceptance criteria

- OAuth success/error lands on the integrations settings page.
- Audit-complete and playbook notifications link to real pages.
- No notification action URL 404s.
- The README setup instructions work from a clean checkout.

---

## 5. Derive playbook actions per item

**Priority:** P1 · **Status:** Proposed · **Area:** execution

### Problem

Execution chooses the action from the playbook's `impactType`, not from the item being acted on:

```ts
// src/server/connector-service.ts:923
private mapPlaybookToActionType(impactType: string): string {
  switch (impactType) {
    case "SECURITY": return "REVOKE_ACCESS";
    case "SAVINGS": return "ARCHIVE_FILE";
    case "EFFICIENCY": return "ARCHIVE_CHANNEL";
  }
}
```

`PlaybookItem.itemType` already distinguishes `file`, `guest`, `channel`, etc. The consequence is that the `REMOVE_GUEST` and `UPDATE_PERMISSIONS` branches in `performPlaybookActions` (`src/server/connector-service.ts:779` and `:839`) are unreachable, and a guest-review playbook runs `revokeAccess` instead of removing the guest. The audit log also records one action type for the whole playbook.

### Fix

1. Put an explicit `actionType` on `Playbook` or `PlaybookItem`, or derive it per item:
   - guest item → `REMOVE_GUEST`
   - publicly shared file item → `UPDATE_PERMISSIONS`
   - old/duplicate file item → `ARCHIVE_FILE`
   - inactive channel item → `ARCHIVE_CHANNEL`
2. Execute and undo per item. Record item-level results so a partial failure is visible.
3. Use the item's action type in the audit log and undo payload.
4. Update playbook copy so the promised action matches the executed action.

### Acceptance criteria

- A guest playbook removes guest access, not generic access.
- A public-file playbook restricts sharing, not the whole file.
- A mixed playbook executes the correct action per item.
- Undo restores each item using its own undo action.

---

## 6. Scale audits with fan-out and incremental sync

**Priority:** P2 · **Status:** Proposed · **Area:** scale

### Problem

The audit is one Inngest function that syncs every integration inside a single step (`src/inngest/functions/run-audit.ts`, step `sync-integrations`). Each connector performs a full scan. A slow or rate-limited source delays the whole audit, and a large workspace can exceed step payload limits and transaction time.

The job-status endpoint is also a heuristic: it reports "completed" if any audit result or playbook execution happened in the last five minutes (`src/app/api/jobs/[id]/status/route.ts`).

### Fix

1. Fan out one sync event per integration, each with its own retries, timeout and concurrency key. Aggregate only after all sources settle.
2. Use cursor-based pagination and provider delta tokens/webhooks where available; fall back to a full scan on first sync.
3. Checkpoint per source and make writes idempotent (`upsert` keyed by source + external ID). Persist files in bounded batches (the current batch size is 500).
4. Track job progress in a `Job`/`AuditRun` record, or read the real Inngest run status. Replace the five-minute heuristic.
5. Add operational metrics: files scanned, duration per source, failures, rate-limit hits.

### Acceptance criteria

- One failing source does not block the others; each retries independently.
- An audit of 10,000+ files per source completes without step-payload or transaction timeouts.
- Re-running an audit is idempotent.
- The UI shows real progress and real job state, not a time-based guess.

---

## 7. Validate pricing with a paid pilot

**Priority:** P2 · **Status:** Proposed · **Area:** commercial

### Problem

The Pro floor is $875/month, the free tier cannot execute cleanup, and the only in-app paid path is a full subscription. That is a large commitment for a first purchase, and there is no evidence in the product that the tier boundaries or price points have been tested.

### Fix

1. Offer a time-boxed **paid pilot** or a per-audit entry point that includes one cleanup.
2. Instrument the funnel: signup → integration connected → first audit → playbook reviewed → upgrade → first execution → second audit.
3. Test willingness to pay before defending the list price. Keep the current prices as an anchor, not an assumption.
4. Decide whether Enterprise is sold in-app or routed to sales.

### Acceptance criteria

- At least one lower-commitment entry point is live or explicitly rejected after a test.
- Conversion and activation metrics are recorded per organisation.
- A pricing decision is documented with the evidence that supported it.

---

## Additional findings

These were discovered while updating the documentation. They are not part of the original review list but affect launch readiness.

| Finding | Priority | Evidence | Next step |
| --- | --- | --- | --- |
| Manual playbook execution does not persist undo actions | P1 | `src/inngest/functions/execute-playbook.ts:76-94` creates an `AuditLog` without `undoActions` or `undoExpiresAt`; `ConnectorService.executePlaybook` (`src/server/connector-service.ts:599-625`) does persist them. | Call the undo-aware path or persist the `undoActions` returned by `performPlaybookActions`. Verify the undo button on a manually executed playbook. |
| Archive lifecycle jobs are not registered | P1 | `src/inngest/functions/index.ts` and `src/app/api/inngest/route.ts` comment out the archive functions. `ArchiveService` emits `archive/file.created`, but no consumer runs. | Register the lifecycle functions and prove expiry/cleanup works, or remove the 30-day guarantee from copy until it does. |
| Playbook execution and `ArchiveService` are not wired together | P1 | Execution calls `connector.archiveFile`; `ArchiveService.archiveFile` (which creates `ArchivedFile` records and blob copies) is only referenced by the archive page/cleanup code. | Decide whether source-level archiving is enough or whether every execution must also create an `ArchivedFile` record. |
| Archive blobs are uploaded with public access | P1 (before archive creation) | `src/server/archive-service.ts:66-71` uses `access: "public"`; the resulting `blob.url` is stored as `downloadUrl` and used by the download button. | Use private blobs and time-limited signed URLs; add a regression test that an unauthenticated request cannot fetch an archive. |
| Polar is configured for sandbox | P0 (launch) | `src/lib/auth.ts:21` sets `server: "sandbox"`. | Switch to production and re-test checkout, portal and webhooks. |
| No automated test suite | P1 | `package.json` has no `test` script and no test files. | Add unit tests for scoring, entitlements and tier mapping; add integration tests for audit, execute and undo. |
| `vercel.json` build command is invalid | P1 | `vercel.json` runs `npm build` instead of `npm run build`. | Use `npm run vercel-build` or fix the command. |
| Plan copy and implementation diverge | P2 | Free plan advertises PDF export but exports are CSV; free `maxUsers` is 2,500 while paid tiers stop at 2,000; marketing says "AI-drafted" but generation is deterministic. | Align copy, or implement the missing capability. |
| Enterprise is not sellable in-app | P2 | The Enterprise plan is commented out (`src/lib/subscription-plans.ts:227`); >2,000 users get a contact-sales error. | Add a sales-assisted flow or document the limitation. |

---

## Working agreements

- Enforce a limit on the server before exposing it in the UI.
- Add tests for money, entitlements, scoring and undo logic; these are the highest-cost mistakes.
- Update [CONTEXT.md](../CONTEXT.md) when a domain term is resolved.
- Record hard-to-reverse choices in `docs/adr/`.
- Update this backlog when an item is fixed, and keep the README's "Known gaps" section in sync.
