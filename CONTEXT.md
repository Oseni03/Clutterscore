# Clutterscore

Clutterscore is the domain of digital workspace hygiene: connecting a company's tools, auditing what lives there, scoring the clutter, proposing cleanup, and executing it reversibly. This glossary fixes the language used in product conversations, UI copy, and code.

## Language

### Tenancy and access

**Organisation (Workspace)**:
The tenant boundary that owns integrations, audits, playbooks, members, billing, archives and audit logs. The product UI calls it a workspace; the code and database call it an organisation.
_Avoid_: Tenant, customer, account, team

**Member**:
A user's membership in one organisation, carrying a role. A user can belong to several organisations.
_Avoid_: Employee, seat

**Role**:
The level of authority a member has in an organisation. Clutterscore uses `admin` and `member`.
_Avoid_: Permission level, user type

**Invitation**:
A pending offer for a person to join an organisation with a proposed role.
_Avoid_: Invite, request

**Integration**:
An authorised connection between an organisation and one source tool.
_Avoid_: Connection, app, plugin

**Source**:
The type of tool an integration points at, such as Google Workspace, Slack, Dropbox or Notion.
_Avoid_: Provider, platform

### Auditing and scoring

**Audit**:
One scan of an organisation's active integrations. An audit produces one audit result and may produce playbooks.
_Avoid_: Scan, report, analysis

**Audit Result**:
The immutable snapshot produced by one audit: score, waste estimates, risk counts and timestamp.
_Avoid_: Audit, report

**ClutterScore**:
A 0–100 measure of workspace hygiene, where 100 is clean. It is a product metric, not the product name.
_Avoid_: Clutterscore score, health score, clutter score

**Target Score**:
The ClutterScore an organisation is aiming for, set during onboarding and editable later.
_Avoid_: Goal, benchmark

**Dark Data**:
Files that have not been accessed for more than twelve months.
_Avoid_: Old files, cold storage

**Storage Waste**:
The estimated annual cost of storage occupied by clutter, expressed in currency.
_Avoid_: Storage cost, wasted space

**Licence Waste**:
The estimated annual cost of licences assigned to users who have been inactive for ninety days or more.
_Avoid_: Seat waste, unused licences

**Estimated Savings**:
The sum of storage waste and licence waste for an audit result.
_Avoid_: Projected waste, potential savings

**Risk**:
A condition that exposes the organisation to data loss or unauthorised access. Risks are counted as active, critical or moderate.
_Avoid_: Issue, alert, vulnerability

**Critical Risk**:
A risk involving a publicly shared database file.
_Avoid_: High risk

**Moderate Risk**:
A risk involving a publicly shared non-database file or a guest user.
_Avoid_: Medium risk

### Cleanup and safety

**Playbook**:
A proposed group of cleanup actions for one source and one impact type, awaiting review.
_Avoid_: Task list, job, batch

**Playbook Item**:
One selectable unit of cleanup inside a playbook, such as a file, channel or guest.
_Avoid_: Action, entry, row

**Impact Type**:
The kind of benefit a playbook promises: security, savings or efficiency.
_Avoid_: Category, type

**Risk Level**:
The assessed danger of executing a playbook: critical, high, medium or low.
_Avoid_: Severity, priority

**Approval**:
An explicit decision by an authorised member that a playbook may be executed.
_Avoid_: Confirmation, sign-off

**Execution**:
The act of performing a playbook's selected items against the source tool.
_Avoid_: Run, cleanup, job

**Automated Cleanup**:
Execution performed by a policy on a schedule without a person approving each playbook. It is limited to low-risk work on paid plans.
_Avoid_: Auto-cleanup, autonomous cleanup

**Archive**:
A recoverable copy of a resource set aside so the original can be removed or restricted without losing it.
_Avoid_: Backup, trash, recycle bin

**Restore**:
Returning an archived resource to its original state or location.
_Avoid_: Recover, undelete

**Retention Window**:
The period during which an archive or undo action remains available. Clutterscore uses thirty days.
_Avoid_: Expiry, grace period

**Undo Action**:
The recorded instructions needed to reverse one executed cleanup action.
_Avoid_: Rollback, reversal

### Records and communication

**Audit Log**:
The durable record of an execution, including what was done, by whom, whether it succeeded, and how to undo it.
_Avoid_: Activity log, history, event log

**Activity**:
A lightweight internal event recording that something happened in the workspace, such as an integration being added or an audit being run.
_Avoid_: Audit log, notification

**Notification**:
An in-app message telling a user that something needs attention or has completed.
_Avoid_: Alert, email

**Score Trend**:
The monthly history of an organisation's ClutterScore, waste, risks and usage.
_Avoid_: Chart, history

### Commercial

**Plan**:
A priced package of features and limits, identified by a plan ID such as `free` or `pro-tier0`.
_Avoid_: Tier, package

**Subscription Tier**:
The plan currently assigned to an organisation for entitlement purposes.
_Avoid_: Plan, level

**Entitlement**:
A capability or limit granted to an organisation by its subscription tier, such as audit allowance, integration count, invitation ability or cleanup execution.
_Avoid_: Permission, feature flag

**Detected User Count**:
The number of users discovered in a connected source, used to choose an eligible plan.
_Avoid_: Seat count, headcount, licence count

**User Count Verification**:
An admin's confirmation that the detected user count is accurate.
_Avoid_: Approval, validation

**Audit Allowance**:
The number of audits an organisation may run in a period. Free organisations receive one audit per calendar month.
_Avoid_: Quota, limit, throttle

**Paid Pilot**:
A time-boxed, paid engagement used to validate value and willingness to pay before a full subscription.
_Avoid_: Free trial, proof of concept
