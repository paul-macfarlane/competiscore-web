Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
Moderation System Implementation Plan

Overview

Implement a comprehensive moderation system for Competiscore enabling members to report other members and allowing Managers/Executives to take remediation
actions with a full audit trail.

---

Phase 1: Database Schema

1.1 Add Enums to src/db/schema.ts

export const reportReason = pgEnum("report_reason", [
"unsportsmanlike",
"false_reporting",
"harassment",
"spam",
"other",
]);

export const reportStatus = pgEnum("report_status", [
"pending",
"resolved",
]);

export const moderationActionType = pgEnum("moderation_action_type", [
"dismissed",
"warned",
"suspended",
"removed",
]);

1.2 Add Report Table

export const report = pgTable(
"report",
{
id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
reporterId: text("reporter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
reportedUserId: text("reported_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
leagueId: text("league_id").notNull().references(() => league.id, { onDelete: "cascade" }),
reason: reportReason("reason").notNull(),
description: text("description").notNull(),
evidence: text("evidence"),
status: reportStatus("status").notNull().default("pending"),
createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
index("report_league_idx").on(table.leagueId),
index("report_reported_user_idx").on(table.reportedUserId),
index("report_reporter_idx").on(table.reporterId),
index("report_status_idx").on(table.status),
],
);

1.3 Add Moderation Action Table

export const moderationAction = pgTable(
"moderation_action",
{
id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
reportId: text("report_id").notNull().references(() => report.id, { onDelete: "cascade" }),
moderatorId: text("moderator_id").notNull().references(() => user.id, { onDelete: "set null" }),
targetUserId: text("target_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
leagueId: text("league_id").notNull().references(() => league.id, { onDelete: "cascade" }),
action: moderationActionType("action").notNull(),
reason: text("reason").notNull(),
suspendedUntil: timestamp("suspended_until"),
createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
index("moderation_action_report_idx").on(table.reportId),
index("moderation_action_target_idx").on(table.targetUserId),
index("moderation_action_league_idx").on(table.leagueId),
],
);

1.4 Modify league_member Table

Add suspendedUntil field to track member suspensions:

suspendedUntil: timestamp("suspended_until"),

1.5 Add Relations and Type Exports

- Add relations for report and moderationAction tables
- Export types: Report, NewReport, ModerationAction, NewModerationAction
- Export column definitions: reportColumns, moderationActionColumns

---

Phase 2: Constants & Permissions

2.1 Add to src/lib/constants.ts

export const ReportReason = {
UNSPORTSMANLIKE: "unsportsmanlike",
FALSE_REPORTING: "false_reporting",
HARASSMENT: "harassment",
SPAM: "spam",
OTHER: "other",
} as const;

export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
[ReportReason.UNSPORTSMANLIKE]: "Unsportsmanlike conduct",
[ReportReason.FALSE_REPORTING]: "False match reporting",
[ReportReason.HARASSMENT]: "Harassment",
[ReportReason.SPAM]: "Spam",
[ReportReason.OTHER]: "Other",
};

export const ReportStatus = {
PENDING: "pending",
RESOLVED: "resolved",
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ModerationActionType = {
DISMISSED: "dismissed",
WARNED: "warned",
SUSPENDED: "suspended",
REMOVED: "removed",
} as const;

export type ModerationActionType = (typeof ModerationActionType)[keyof typeof ModerationActionType];

export const MODERATION_ACTION_LABELS: Record<ModerationActionType, string> = {
[ModerationActionType.DISMISSED]: "Report Dismissed",
[ModerationActionType.WARNED]: "Warning Issued",
[ModerationActionType.SUSPENDED]: "Member Suspended",
[ModerationActionType.REMOVED]: "Member Removed",
};

2.2 Add to src/services/constants.ts

export const REPORT_DESCRIPTION_MAX_LENGTH = 2000;
export const REPORT_EVIDENCE_MAX_LENGTH = 2000;
export const MODERATION_REASON_MAX_LENGTH = 500;
export const MAX_SUSPENSION_DAYS = 365;

2.3 Update src/lib/permissions.ts

Add new LeagueAction entries:

- REPORT_MEMBER - all members can report
- VIEW_REPORTS - managers/executives only
- MODERATE_MEMBERS - managers/executives only

Add new LeaguePage:

- MODERATION - managers/executives only

---

Phase 3: Validators

Create src/validators/moderation.ts

Schemas:

- reportReasonSchema - enum validation
- reportDescriptionSchema - min 10 chars, max from constant
- reportEvidenceSchema - optional, max from constant
- createReportSchema - full report form
- moderationActionTypeSchema - enum validation
- moderationReasonSchema - min 5 chars, max from constant
- suspensionDaysSchema - 1 to MAX_SUSPENSION_DAYS
- takeModerationActionSchema - with refinement requiring suspensionDays for suspend action

---

Phase 4: Database Operations

4.1 Create src/db/reports.ts

Functions:

- createReport() - create new report
- getReportById() - get single report
- getReportWithUsersById() - with reporter/reported user details
- getPendingReportsByLeague() - all pending for a league
- getReportsByReportedUser() - all reports against a user
- getReportsByReporter() - reports submitted by a user
- updateReportStatus() - mark as resolved
- getPendingReportCount() - count for badge display
- hasExistingPendingReport() - prevent duplicate reports

  4.2 Create src/db/moderation-actions.ts

Functions:

- createModerationAction() - record action taken
- getModerationActionsByReport() - actions on a report
- getModerationHistoryByUser() - full history for moderators
- getWarningsByUser() - warnings visible to member

  4.3 Update src/db/league-members.ts

Functions:

- suspendMember() - set suspendedUntil
- unsuspendMember() - clear suspendedUntil
- isMemberSuspended() - check if currently suspended

---

Phase 5: Service Layer

Create src/services/moderation.ts

Functions:

createReport(reporterId, input)

- Validate input with schema
- Prevent self-reporting
- Verify both users are league members
- Check reporter not suspended
- Prevent duplicate pending reports
- Create report record

getPendingReports(userId, leagueId)

- Verify membership and VIEW_REPORTS permission
- Return pending reports with user details

getReportDetail(userId, reportId)

- Verify permissions
- Return report, moderation history, and actions

takeModerationAction(moderatorId, input)

- Validate input
- Verify moderator permissions (MODERATE_MEMBERS)
- Prevent moderating own reports
- Check role hierarchy (can't act on equal/higher roles for warn/suspend/remove)
- Use transaction for:
  - Create moderation action record
  - Update report status to resolved
  - Execute action (suspend/remove member)

getOwnModerationHistory(userId, leagueId)

- Return warnings and suspension status (visible to member)

getMemberModerationHistory(requesterId, targetUserId, leagueId)

- Verify VIEW_REPORTS permission
- Return full history for moderators

getOwnSubmittedReports(userId, leagueId)

- Return reports the user has submitted

---

Phase 6: UI Implementation

Directory Structure

src/app/leagues/[id]/
├── members/
│ └── [memberId]/
│ └── report/
│ ├── page.tsx # Report member form
│ └── actions.ts
├── moderation/
│ ├── page.tsx # Moderation dashboard
│ ├── loading.tsx
│ ├── actions.ts
│ ├── reports-list.tsx # Pending reports list
│ └── [reportId]/
│ ├── page.tsx # Report detail + action form
│ └── loading.tsx
└── my-warnings/
├── page.tsx # Member's own warnings
└── loading.tsx

Key UI Components

1.  Report Member Form (/leagues/[id]/members/[memberId]/report)

- Reason dropdown (from REPORT_REASON_LABELS)
- Description textarea
- Evidence textarea (optional)
- Submit action

2.  Moderation Dashboard (/leagues/[id]/moderation)

- Pending reports count
- List of reports with avatars, reason, date
- Links to report details

3.  Report Detail Page (/leagues/[id]/moderation/[reportId])

- Full report info
- Reported member's offense history
- Action form (dismiss/warn/suspend/remove)
- Reason required for all actions
- Suspension days field (conditional)

4.  My Warnings Page (/leagues/[id]/my-warnings)

- List of warnings received
- Current suspension status

5.  Update Members List (members-list.tsx)

- Add "Report" to member dropdown menu
- Not visible for self

6.  League Navigation

- Add Moderation link for managers/executives
- Badge with pending report count

---

Phase 7: Server Actions

Report Actions (src/app/leagues/[id]/members/[memberId]/report/actions.ts)

- createReportAction(leagueId, input)

Moderation Actions (src/app/leagues/[id]/moderation/actions.ts)

- getPendingReportsAction(leagueId)
- getReportDetailAction(reportId)
- takeModerationActionAction(leagueId, input)
- getMemberHistoryAction(leagueId, targetUserId)

---

Phase 8: Testing

Create src/services/moderation.test.ts

Test cases:

- createReport: self-report blocked, non-member blocked, suspended blocked, duplicate blocked, success
- takeModerationAction: permission checks, role hierarchy, report already resolved, success for each action type
- getPendingReports: permission checks, returns correct data
- getOwnModerationHistory: returns warnings and suspension status

---

Critical Files to Modify
┌───────────────────────────────────────────────┬───────────────────────────────────────────────────────────┐
│ File │ Changes │
├───────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ src/db/schema.ts │ Add enums, tables, relations, types │
├───────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ src/lib/constants.ts │ Add ReportReason, ReportStatus, ModerationActionType │
├───────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ src/services/constants.ts │ Add max length constants │
├───────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ src/lib/permissions.ts │ Add REPORT_MEMBER, VIEW_REPORTS, MODERATE_MEMBERS actions │
├───────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ src/db/league-members.ts │ Add suspend/unsuspend functions │
├───────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ src/app/leagues/[id]/members/members-list.tsx │ Add Report menu item │
└───────────────────────────────────────────────┴───────────────────────────────────────────────────────────┘
New Files to Create
┌─────────────────────────────────────────────────┬───────────────────────────────────────┐
│ File │ Purpose │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/validators/moderation.ts │ Validation schemas │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/db/reports.ts │ Report database operations │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/db/moderation-actions.ts │ Moderation action database operations │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/services/moderation.ts │ Business logic │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/services/moderation.test.ts │ Unit tests │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/app/leagues/[id]/members/[memberId]/report/ │ Report form page │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/app/leagues/[id]/moderation/ │ Moderation dashboard │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ src/app/leagues/[id]/my-warnings/ │ User's warnings page │
└─────────────────────────────────────────────────┴───────────────────────────────────────┘

---

Verification

1.  Database Migration

- Run pnpm db:generate and pnpm db:migrate
- Verify tables created in database

2.  Unit Tests

- Run pnpm test src/services/moderation.test.ts
- All tests should pass

3.  Manual Testing

- Create a league with 3 members (executive, manager, member)
- As member: report another member, verify form works
- As manager: view moderation dashboard, see pending report
- As manager: take action (warn), verify member sees warning
- As manager: take action (suspend), verify member is suspended
- As member: verify cannot report self
- As member: verify cannot submit duplicate pending report
- Verify role hierarchy (member cannot be moderated by member)

---

Edge Cases Handled

1.  Self-reporting: Blocked with error message
2.  Report non-member: Verified before creating report
3.  Moderate own report: Blocked - must be different moderator
4.  Suspended member actions: Checked in createReport
5.  Multiple reports against same member: Allowed, history shown when reviewing
6.  Moderator demoted: Permission check happens at action time
7.  Target leaves before action: Membership verified before action
8.  Suspension expiry: Checked via timestamp comparison in isMemberSuspended
9.
