# Price by detected workspace user count

**Status:** Accepted

## Context

Clutterscore's value grows with the size of the workspace it audits, but the people who receive value are not the same as the people who need a Clutterscore seat. A per-seat price would charge for employees who never log in to Clutterscore and would require the customer to buy seats for the whole directory. A flat price would overcharge small teams and undercharge large ones.

## Decision

Plans are selected from the **detected user count** in the customer's connected directory, not from purchased Clutterscore seats. Google Workspace, Dropbox and Slack are checked in priority order; the count is cached, shown in billing, and verified by an admin. Four Pro tiers cover 1–2,000 users; larger organisations go through sales.

## Consequences

- The product depends on directory scopes and a reliable user-count source. Checkout is blocked until a supported integration is connected.
- Detected counts can be stale or wrong, so the billing UI needs verification, source, last-sync and mismatch states.
- Plan IDs and subscription-tier values must stay consistent across checkout, webhooks, entitlements and automation. A mismatch silently disables paid features.
- The >2,000-user path is sales-assisted and is not sold in-app today.
- The price floor and tier boundaries are commercial hypotheses, not validated facts; a paid pilot or usage-based entry point should be tested before defending them.

## Alternatives considered

- **Per-seat:** rejected because most value recipients never need a Clutterscore login.
- **Flat pricing:** rejected because workspace size varies by orders of magnitude.
- **Per-audit or usage-based:** still worth testing as an entry point, but not chosen as the primary plan structure.
