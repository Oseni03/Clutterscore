# Clutterscore

Clutterscore is a multi-tenant SaaS platform for **digital workspace hygiene**. It connects to a company's SaaS tools, audits files, users and channels, produces a 0–100 ClutterScore, estimates wasted storage and licence spend, and proposes reversible cleanup playbooks that an admin can review and execute.

The product is built around a simple promise: **inspect everything, change nothing without approval, and keep cleanup reversible for 30 days.**

---

## At a glance

- **Ownership:** Solo end-to-end product engineering — product design, UI, API, data model, OAuth connectors, billing, background jobs, and deployment.
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Prisma + PostgreSQL, Better Auth, Inngest, Polar.sh, Vercel Blob, Resend, Tailwind CSS + shadcn/ui, Zustand.
- **Scale:** Multi-tenant workspaces from 1 to 2,000 users per organisation across four Pro tiers. Audits sync Google Workspace, Slack, Dropbox and Notion; files are persisted in 500-row batches; background jobs run per organisation with retries and concurrency controls.
- **Core design decision:** Cleanup is approval-gated and reversible. Playbooks are proposals, destructive actions are archived first, and audit logs are designed to retain undo actions for 30 days. See [ADR-0001](docs/adr/0001-reversible-cleanup.md).

**Status:** Active development. Billing is wired to the Polar **sandbox**, and several launch-blocking gaps are tracked in [docs/BACKLOG.md](docs/BACKLOG.md).

---

## What it does

1. **Connect** — an admin authorises Google Workspace, Slack, Dropbox and/or Notion. OAuth tokens are stored per organisation and refreshed when needed.
2. **Audit** — Clutterscore scans files, users, guests and Slack channels across every active integration.
3. **Score** — it calculates a 0–100 ClutterScore, storage waste, licence waste, estimated annual savings, and active/critical/moderate risks.
4. **Review** — it generates playbooks: duplicate consolidation, public-file lockdown, untouched-file archival, inactive-channel archival, and guest-access review.
5. **Execute** — an admin selects items and runs a playbook. The work happens in the background against the source tool.
6. **Undo** — executions are designed to write an audit log with restore actions and a 30-day expiry. The automated path does; manual executions currently omit the undo payload (see [backlog](docs/BACKLOG.md)).

Playbook generation is currently **rule-based and deterministic** — there is no LLM in the audit path.

---

## Core concepts

The canonical vocabulary lives in [CONTEXT.md](CONTEXT.md). The short version:

| Term | Meaning |
| --- | --- |
| **Organisation (Workspace)** | The tenant boundary. Owns integrations, audits, playbooks, members, billing, archives and audit logs. |
| **Integration** | An authorised connection to one source tool. |
| **Audit** | One scan of all active integrations, producing an immutable `AuditResult`. |
| **ClutterScore** | A 0–100 hygiene score; higher is better. |
| **Waste** | Estimated annual storage waste plus licence waste. |
| **Playbook** | A proposed group of cleanup actions for one source and impact type. |
| **Playbook Item** | One selectable unit of cleanup (a file, channel, guest, etc.). |
| **Execution** | Performing the selected items against the source tool. |
| **Archive** | A recoverable copy of a file or resource, retained for 30 days. |
| **Audit Log** | The record of an execution, including undo actions and their expiry. |
| **Activity** | A lighter internal event feed for integration, audit and billing events. |

---

## How it works

### 1. Authentication and tenancy

- Better Auth handles **Google OAuth** and **magic-link email** sign-in. Email/password is disabled.
- The Better Auth **organisation plugin** provides workspaces, members, invitations and the `admin` / `member` roles.
- A custom session injects the active organisation, the user's role, and the organisation's subscription.
- `middleware.ts` protects `/dashboard/*` by checking the session cookie.
- API routes wrap handlers in `withAuth` (`src/lib/middleware.ts`), which resolves the session and scopes every query to `user.organizationId`.
- Data is isolated with a **shared schema**: every tenant-owned row carries `organizationId`.

### 2. Integrations

- The integrations page offers **Google, Slack, Dropbox and Notion**.
- `GET /api/oauth/{source}/authorize` builds a signed, expiring OAuth state and redirects to the provider.
- `GET /api/oauth/{source}/callback` validates the state, exchanges the code, upserts a `ToolIntegration`, and records an activity.
- Tokens are encrypted at rest by a Prisma client extension (`src/lib/prisma.ts` + `src/lib/crypto.ts`) using `INTEGRATION_ENCRYPTION_KEY`.
- Microsoft 365, Figma and Jira connectors exist, but Microsoft is disabled in the connector factory and none of the three appear in the integrations UI.
- Webhook registration/handling exists for Google, Microsoft, Slack, Dropbox and Notion; only active sources matter today.

### 3. Audit pipeline

`POST /api/audit/run`:

1. Checks the free-tier audit allowance (`src/lib/audit-throttle.ts`). Free organisations get **one audit per calendar month**; paid organisations are unlimited.
2. Emits an Inngest `audit/run` event and returns a `jobId`.
3. The `run-audit` function syncs all active integrations, aggregates files/users/channels, calculates metrics, and persists everything in one transaction.
4. The UI polls `/api/jobs/{id}/status` and refreshes when the audit completes.

The audit job writes:

- an `AuditResult` (score, estimated savings, storage waste, licence waste, risk counts),
- all discovered `File` rows (500 per batch),
- generated `Playbook` and `PlaybookItem` rows,
- a monthly `ScoreTrend`,
- an `audit.run` activity,
- an in-app notification.

### 4. Scoring and waste model

The score starts at 100 and subtracts:

| Signal | Maximum deduction |
| --- | --- |
| Storage waste | 30 (`storageWaste / 100`) |
| Duplicate files | 20 (`duplicates / 10`) |
| Publicly shared files | 25 (`publicFiles / 5`) |
| Inactive users | 25 (`inactiveUsers / 5`) |

Waste estimates:

- **Storage waste** = total GB × $0.10/GB/month × 12.
- **Licence waste** = users inactive for 90+ days (or never active) × $15/month × 12.
- **Estimated annual savings** = storage waste + licence waste.

Risk counts:

- **Active risks** = publicly shared files + guest users.
- **Critical risks** = publicly shared database files.
- **Moderate risks** = other publicly shared files + guest users.

### 5. Playbook rules

For each source, the audit may generate:

| Playbook | Trigger | Impact | Risk |
| --- | --- | --- | --- |
| Duplicate consolidation | Two or more files share a hash; keep the most recently accessed copy | Savings | Low |
| Public file lockdown | One or more files are publicly shared | Security | Critical if any database file, otherwise High |
| Untouched file archival | Last access older than 12 months | Savings | Medium |
| Inactive Slack channel archival | No activity for 12+ months and fewer than 5 members | Efficiency | Low |
| Guest access review | Guest users exist | Security | High |

Each item stores the metadata needed to act and to undo: external ID, original path/location, sharing state, size, owner, last access, etc.

### 6. Execution and undo

`POST /api/playbooks/{id}/execute` validates ownership and status, then emits a `playbook/execute` event. The `execute-playbook` Inngest function:

1. Validates that the playbook is `PENDING` or `APPROVED`.
2. Marks it `EXECUTING`.
3. Calls `ConnectorService.performPlaybookActions`.
4. Marks it `EXECUTED` or `FAILED`, writes an audit log, logs activity, and notifies the user. The manual job's audit log currently omits `undoActions` and `undoExpiresAt`; the automated path generates them. This is tracked in the backlog.

The intended action model is one action per item. Today the action is derived from the playbook's `impactType` (`SECURITY → REVOKE_ACCESS`, `SAVINGS → ARCHIVE_FILE`, `EFFICIENCY → ARCHIVE_CHANNEL`), which is why guest removal and permission-update code paths are not reached. This is also tracked in the backlog.

A weekly Inngest cron (`automated-playbook-execution`) is intended to auto-approve and run low-risk playbooks for paid organisations. Its tier filter currently does not match the stored plan IDs, so it effectively does not run for paying customers. See [docs/BACKLOG.md](docs/BACKLOG.md).

### 7. Archives

`ArchiveService` can copy a file to **Vercel Blob**, create an `ArchivedFile` record, and set a 30-day expiry. The archives page (`/dashboard/archives`) lists records, shows expiry countdowns, and supports download/restore. It is currently hidden from the sidebar. Archive blobs are uploaded with public access; move them to private storage with time-limited URLs before enabling archive creation.

Connector-level archive actions also exist (for example, moving a file to an archive folder in the source tool). The wiring between playbook execution, `ArchiveService`, and the archive lifecycle jobs is incomplete, and the lifecycle functions are not registered; see the backlog.

### 8. Billing

- Polar.sh handles checkout, customer portal, webhooks and subscription state.
- Plans are defined in `src/lib/subscription-plans.ts`.
- The eligible plan is chosen from the **detected user count** (Google, Dropbox or Slack, in priority order), cached for seven days, and verified by the admin.
- The Polar SDK is currently configured with `server: "sandbox"` in `src/lib/auth.ts`.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Application | Next.js 15.5 App Router, React 19, TypeScript |
| Styling / UI | Tailwind CSS v4, shadcn/ui, Radix UI, Lucide, Recharts, motion |
| State | Zustand stores with per-feature providers |
| Data | PostgreSQL, Prisma 6 |
| Auth | Better Auth (Google OAuth, magic link, organisation plugin, Polar plugin) |
| Background jobs | Inngest |
| Payments | Polar.sh (sandbox) |
| Email | Resend + React Email |
| Archive storage | Vercel Blob |
| Deployment | Vercel |

---

## Repository structure

```text
.
├── prisma/
│   ├── schema.prisma          # Data model
│   └── migrations/            # SQL migrations
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── api/               # Thin route handlers
│   │   ├── dashboard/         # Authenticated app
│   │   ├── login/ signup/     # Auth pages
│   │   ├── onboarding/        # Workspace creation
│   │   └── page.tsx           # Marketing landing page
│   ├── components/            # UI, dashboard, settings, emails
│   ├── hooks/                 # Data fetching and job polling
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/         # Audit, sync, execution, email, webhooks
│   ├── lib/
│   │   ├── auth.ts            # Better Auth configuration
│   │   ├── connectors/        # Provider adapters
│   │   ├── oauth/             # OAuth config and state
│   │   ├── webhooks/          # Provider webhook handlers
│   │   ├── audit-throttle.ts
│   │   ├── crypto.ts
│   │   └── subscription-plans.ts
│   ├── server/                # Business logic and services
│   ├── types/
│   └── zustand/               # Stores and providers
├── docs/
│   ├── adr/                   # Architecture decision records
│   └── BACKLOG.md             # Prioritised fixes and optimisations
├── middleware.ts              # Dashboard route protection
└── vercel.json
```

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- A Polar.sh account (sandbox is fine)
- An Inngest account (or the local Inngest dev server)
- OAuth apps for the sources you want to test
- Optional: Resend, Vercel Blob, Telegram

### 1. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate`.

### 2. Configure environment

```bash
cp .env.example .env
```

Generate an encryption key for integration tokens:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set the result as `INTEGRATION_ENCRYPTION_KEY`. The app throws at import time if it is missing.

### 3. Apply the database schema

```bash
npx prisma migrate dev
```

For production:

```bash
npx prisma migrate deploy
```

### 4. Run Inngest locally

In a second terminal:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`, sign in with Google or a magic link, and create a workspace during onboarding.

### 6. Configure OAuth redirect URIs

Register the matching callback URL for each source:

```text
{APP_URL}/api/oauth/google/callback
{APP_URL}/api/oauth/slack/callback
{APP_URL}/api/oauth/dropbox/callback
{APP_URL}/api/oauth/notion/callback
```

Microsoft, Figma and Jira callbacks exist but those sources are disabled or hidden.

---

## Environment variables

### Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | Yes | Better Auth signing/encryption secret. |
| `BETTER_AUTH_URL` | Recommended | Public auth base URL. Keep in sync with `NEXT_PUBLIC_APP_URL`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL used for OAuth redirects, emails and callbacks. |
| `INTEGRATION_ENCRYPTION_KEY` | Yes | Base64-encoded 32-byte key used to encrypt integration tokens at rest. |

### Billing

| Variable | Required | Purpose |
| --- | --- | --- |
| `POLAR_ACCESS_TOKEN` | Yes | Polar API access token. |
| `POLAR_WEBHOOK_SECRET` | Yes | Verifies Polar webhook payloads. |
| `NEXT_PUBLIC_PRO_TIER0_MONTHLY_PLAN_ID` | Yes for Pro Tier 0 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER0_YEARLY_PLAN_ID` | Yes for Pro Tier 0 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER1_MONTHLY_PLAN_ID` | Yes for Pro Tier 1 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER1_YEARLY_PLAN_ID` | Yes for Pro Tier 1 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER2_MONTHLY_PLAN_ID` | Yes for Pro Tier 2 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER2_YEARLY_PLAN_ID` | Yes for Pro Tier 2 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER3_MONTHLY_PLAN_ID` | Yes for Pro Tier 3 | Polar product ID. |
| `NEXT_PUBLIC_PRO_TIER3_YEARLY_PLAN_ID` | Yes for Pro Tier 3 | Polar product ID. |

### Background jobs and email

| Variable | Required | Purpose |
| --- | --- | --- |
| `INNGEST_EVENT_KEY` | Production | Inngest event key. |
| `INNGEST_SIGNING_KEY` | Production | Inngest signing key. |
| `RESEND_API_KEY` | Yes for email | Magic links and invitations. |

### Integrations and storage

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google | Sign-in and Google Workspace connector. |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | For Slack | Slack OAuth. |
| `SLACK_SIGNING_SECRET` | For Slack webhooks | Slack request verification. |
| `DROPBOX_CLIENT_ID` / `DROPBOX_CLIENT_SECRET` | For Dropbox | Dropbox OAuth. |
| `DROPBOX_APP_SECRET` | For Dropbox webhooks | Dropbox signature verification. |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | For Notion | Notion OAuth. |
| `NOTION_WEBHOOK_SECRET` | For Notion webhooks | Notion webhook verification. |
| `BLOB_READ_WRITE_TOKEN` | For archives | Vercel Blob access. |
| `TELEGRAM_API_TOKEN` / `TELEGRAM_CHANNEL_ID` | Optional | Telegram notifications. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Optional | Microsoft connector (currently disabled). |
| `FIGMA_CLIENT_ID` / `FIGMA_CLIENT_SECRET` | Optional | Figma connector (hidden from UI). |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` | Optional | Jira connector (hidden from UI). |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Generate Prisma client and build for production. |
| `npm run start` | Start the production server. |
| `npm run lint` | Run ESLint. |
| `npm run prisma:generate` | Regenerate the Prisma client. |
| `npm run vercel-build` | Vercel build command (`prisma generate && next build`). |

There is no automated test script yet; this is tracked in the backlog.

---

## Pages

| Route | Access | What it does |
| --- | --- | --- |
| `/` | Public | Marketing landing page: hero, how it works, integrations, playbook review, safety, pricing, CTA. |
| `/login`, `/signup` | Public | Shared auth form with Google OAuth and magic link. Redirects authenticated users to the dashboard. |
| `/onboarding` | Authenticated | Creates the first workspace and sets its target score. |
| `/dashboard` | Authenticated | Overview: ClutterScore, waste/savings, risks, trend chart, recommended playbooks, audit controls. |
| `/dashboard/playbooks` | Authenticated | Playbook list with impact filters, search, summary stats and audit controls. |
| `/dashboard/playbooks/[id]` | Authenticated | Playbook detail, item selection, approve/execute/dismiss, execution status. |
| `/dashboard/files` | Authenticated | Discovered files, filters, duplicate/public flags, archive action, CSV export. |
| `/dashboard/storage` | Authenticated | Storage analytics, waste breakdown, largest unused files, suggestions, CSV export. |
| `/dashboard/audit-logs` | Authenticated | Execution history with filters, undo, and CSV export. |
| `/dashboard/archives` | Authenticated | Archived files, expiry countdown, download/restore. Hidden from the sidebar. |
| `/dashboard/notifications` | Authenticated | Full notification list with read state and action links. |
| `/dashboard/settings` | Authenticated | Redirects to `/dashboard/settings/integrations`. |
| `/dashboard/settings/integrations` | Authenticated | Connect, sync, refresh, inspect scopes and disconnect integrations. |
| `/dashboard/settings/users` | Authenticated | Members, invitations, roles and removals (admin-only mutations). |
| `/dashboard/settings/billing` | Authenticated | Current plan, detected user count, eligible plans, checkout and Polar portal. |
| `/dashboard/settings/workspace` | Authenticated | Workspace profile, subscription details, reset and delete (admin-only). |
| `/dashboard/account` | Authenticated | Profile details and editing. |
| `/dashboard/account/preferences` | Authenticated | Theme preference. |

---

## API overview

All business endpoints require a session and are scoped to the active organisation unless noted.

| Area | Routes |
| --- | --- |
| Auth | `/api/auth/[...all]` |
| OAuth | `/api/oauth/[source]/authorize`, `/api/oauth/[source]/callback` |
| Audits | `POST /api/audit/run`, `GET /api/audit/latest` |
| Jobs | `GET /api/jobs/[id]/status` |
| Playbooks | `GET /api/playbooks`, `GET /api/playbooks/[id]`, `GET /api/playbooks/[id]/items`, `POST .../approve`, `POST .../dismiss`, `POST .../execute` |
| Files | `GET /api/files`, `GET /api/files/[id]`, `GET /api/files/export` |
| Storage | `GET /api/storage/analytics`, `GET /api/storage/export` |
| Integrations | `GET /api/integrations`, `POST /api/integrations/disconnect`, `POST /api/integrations/refresh-token`, `GET /api/integrations/status`, `POST /api/integrations/sync`, `GET /api/integrations/tests`, `GET /api/integrations/user-count` |
| Archives | `GET /api/archives`, `GET /api/archives/stats`, `POST /api/archives/[id]/restore` |
| Audit logs | `GET /api/audit-logs`, `GET /api/audit-logs/export`, `POST /api/audit-logs/[id]/undo` |
| Notifications | `GET /api/notifications`, `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all` |
| Dashboard | `GET /api/dashboard/stats`, `GET /api/dashboard/trends` |
| Organisations | `GET/POST /api/organizations`, `POST /api/organizations/[id]/reset`, invitation accept/reject |
| Subscription | `GET /api/subscription/eligible-plans`, `GET /api/subscription/[organizationId]` |
| Webhooks | `POST /api/webhooks/register`, `POST /api/webhooks/unregister`, `POST /api/webhooks/[source]` |
| Inngest | `GET/POST/PUT /api/inngest` |

---

## Background jobs

| Trigger | Function | Purpose |
| --- | --- | --- |
| `audit/run` | `run-audit` | Sync all integrations, score, persist audit, files, playbooks and trend. Retries twice. |
| `integrations/sync` | `sync-integrations` | Sync one or all integrations and notify on failure. Retries twice. |
| `playbook/execute` | `execute-playbook` | Execute a playbook, update status, write audit log and notify. Retries once. |
| Cron `0 3 * * 0` | `automated-playbook-execution` | Weekly auto-approval/execution for paid organisations; concurrency 1 per org. |
| `email/send` | `send-email` | Send magic links and invitations through Resend. |
| `telegram/send-message` | `send-telegram-message` | Send Telegram notifications. |
| `handler/webhook` | `handle-webhook` | Dispatch provider webhooks to registered handlers. |

Archive lifecycle functions (expiry warnings, cleanup, monitoring, batch restore/delete) are implemented under `src/inngest/functions/archives/` but are currently **commented out** of the Inngest serve route and function index.

---

## Data model

| Model | Purpose |
| --- | --- |
| `User`, `Session`, `Account`, `Verification` | Better Auth identity and sessions. |
| `Organization` | Tenant boundary, target score, subscription tier, detected user count, free-audit counters. |
| `Member`, `Invitation` | Workspace membership and invitations. |
| `Subscription` | Polar subscription snapshot per organisation. |
| `ToolIntegration` | One authorised source connection; tokens encrypted at rest. |
| `AuditResult` | Immutable audit snapshot: score, waste, savings, risks. |
| `ScoreTrend` | Monthly score/waste/risk/users/storage point. |
| `Playbook`, `PlaybookItem` | Proposed cleanup groups and selectable actions. |
| `File` | Discovered file metadata, hashes, sharing, access and duplicate state. |
| `AuditLog` | Executed action record with undo actions and 30-day expiry. |
| `ArchivedFile` | Recoverable archive record with storage location and expiry. |
| `Activity` | Internal event feed for integrations, audits, playbooks and billing. |
| `Notification` | In-app notification for the user. |
| `Feedback` | User-submitted feedback. |

---

## Plans

| Plan | User range | Monthly | Yearly |
| --- | --- | --- | --- |
| Free | 0–2,500 (one audit/month, three integrations, no cleanup) | $0 | $0 |
| Pro Tier 0 | 1–349 | $875 | $8,715 |
| Pro Tier 1 | 350–799 | $2,000 | $19,920 |
| Pro Tier 2 | 800–1,349 | $3,375 | $33,615 |
| Pro Tier 3 | 1,350–2,000 | $5,000 | $49,800 |
| Enterprise | 2,000+ | Contact sales | Contact sales |

The in-app Enterprise plan is commented out. User counts above 2,000 are blocked at checkout with a contact-sales message.

---

## Security and tenancy

- **Tenant isolation:** every tenant query is filtered by `organizationId`; API handlers use `withAuth`.
- **Route protection:** middleware gates `/dashboard/*`; API handlers re-check the session.
- **Admin actions:** `withAdminAuth` exists for admin-only handlers; user management and workspace mutations are admin-gated in the UI.
- **Token storage:** `accessToken` and `refreshToken` on `ToolIntegration` and `Account` are encrypted through a Prisma client extension using a single application key.
- **OAuth state:** signed and expiring; the callback verifies source and state before exchanging the code.
- **Webhooks:** routes exist for Google, Microsoft, Slack, Dropbox and Notion; Slack, Dropbox and Notion have provider-specific signature verification.
- **Audit allowance:** enforced server-side in `POST /api/audit/run`.

**Known security gaps:** plan entitlements for integrations and playbook execution are enforced in the browser only; token encryption uses a single key with no rotation; archive blobs use public access; the archive lifecycle jobs are not registered. These are prioritised in [docs/BACKLOG.md](docs/BACKLOG.md).

---

## Design decisions

- [ADR-0001: Reversible cleanup by default](docs/adr/0001-reversible-cleanup.md)
- [ADR-0002: Audits and execution run as background jobs](docs/adr/0002-async-audit-execution.md)
- [ADR-0003: Price by detected workspace user count](docs/adr/0003-user-count-pricing.md)

---

## Known gaps and roadmap

The full, prioritised list is in [docs/BACKLOG.md](docs/BACKLOG.md). The short version:

1. **P0 — Enforce plan entitlements server-side** (integration limit and playbook execution are currently client-side checks).
2. **P0 — Unify subscription tier identifiers** (the weekly automation checks `pro`/`enterprise`, but plan IDs are `pro-tier0`…`pro-tier3`).
3. **P0 — Harden integration-token encryption** (single app key, no rotation or KMS).
4. **P1 — Derive playbook actions per item** (guest removal and permission updates are unreachable today).
5. **P1 — Fix broken notification redirects** (`/dashboard/integrations`, `/dashboard/audit/{id}`, `/playbooks/{id}`).
6. **P1 — Register archive lifecycle jobs and verify archive/undo wiring.**
7. **P2 — Scale audits** with per-integration fan-out, incremental sync and cursor-based pagination.
8. **P2 — Validate pricing** with a paid pilot or per-audit entry point before defending the $875/month floor.

---

## Deployment

1. Push the repository to GitHub and import it into Vercel.
2. Add every required environment variable from the table above.
3. Set the build command to `npm run vercel-build` (or `prisma generate && npm run build`). The checked-in `vercel.json` currently uses a legacy build command and should be reviewed.
4. Apply migrations with `npx prisma migrate deploy`.
5. Configure the Inngest production app to point at `{APP_URL}/api/inngest`.
6. Configure Polar's webhook endpoint and `POLAR_WEBHOOK_SECRET`.
7. Register OAuth redirect URIs for the deployed domain.
8. Create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`.
9. Verify Resend domain/API key for magic links and invitations.

---

## Contributing

- Keep business logic in `src/server/`; keep route handlers thin.
- Wrap business API routes in `withAuth` and scope every query by `organizationId`.
- Add new domains to [CONTEXT.md](CONTEXT.md) when terminology is resolved.
- Record hard-to-reverse decisions as ADRs in `docs/adr/`.
- Update [docs/BACKLOG.md](docs/BACKLOG.md) when a gap is fixed or discovered.
- Run `npm run lint` before opening a pull request.
