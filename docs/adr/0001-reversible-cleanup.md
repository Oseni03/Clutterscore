# Reversible cleanup by default

**Status:** Accepted

## Context

Clutterscore performs destructive-looking work inside a customer's productivity tools: archiving files, revoking public access, archiving channels and removing guest access. A false positive can delete or expose sensitive material, and enterprise buyers will not connect a workspace to a tool that cleans without a safety net.

The obvious path — let an audit delete clutter automatically as soon as it is detected — produces a better demo but an unacceptable trust model. The opposite path — only report and never execute — makes the product a dashboard rather than a cleanup tool.

## Decision

Cleanup is **approval-gated and reversible**:

- Playbooks are proposals, not jobs. A member must approve or execute them, except for low-risk work covered by an explicit automated policy on a paid plan.
- Destructive actions archive the resource first rather than deleting it outright.
- Every execution records audit-log entries with undo actions and a 30-day retention window.
- Free organisations can inspect but cannot execute cleanup.

## Consequences

- The product needs archive storage, undo plumbing, restore methods on every connector, and a retention/cleanup process.
- Some cleanup is slower and more expensive than a direct delete.
- The safety model becomes a selling point and a hard constraint on automation: automated cleanup must stay within low-risk, reversible actions.
- Free-tier read-only cleanup is a product decision, not a technical limitation.

## Alternatives considered

- **Direct deletion or immediate cleanup:** rejected because one false positive destroys trust and creates legal exposure.
- **Report-only:** rejected because it leaves the customer to do the work and undercuts the value proposition.
- **Fully autonomous cleanup:** rejected for launch because the cost of a mistake is asymmetric and the audit model is not yet proven.
