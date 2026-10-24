# Audits and execution run as background jobs

**Status:** Accepted

## Context

An audit calls several third-party APIs, paginates through files, users and channels, hashes content, and writes potentially thousands of rows. Execution makes one remote API call per selected item. Both are too slow, too failure-prone and too variable to run inside a serverless request. Third-party rate limits and transient errors are normal operating conditions, not exceptions.

## Decision

Audits, integration syncs and playbook execution run as **Inngest background functions**. API routes validate the request, emit an event, and return a job ID immediately. The UI polls for completion. A weekly cron handles automated cleanup for eligible plans.

The trigger point remains responsible for authorization and the free-tier audit allowance; the background function is responsible for the long-running work.

## Consequences

- Results are eventually consistent; the UI must show pending and executing states.
- Jobs need idempotency, retries and per-organisation concurrency control.
- Job status must be observable. The current status endpoint is a time-based heuristic, not the source of truth, and should be replaced.
- Fan-out and incremental sync are natural next steps: one slow integration should not block the others.

## Alternatives considered

- **Synchronous API calls:** rejected because of request timeouts and poor failure isolation.
- **Client-driven sync:** rejected because it cannot be trusted to finish and complicates retries.
- **A single cron that scans everything:** rejected because it decouples customer intent from audit timing and makes on-demand audits awkward.
