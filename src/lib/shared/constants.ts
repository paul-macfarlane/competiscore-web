export const LeagueVisibility = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const;

export type LeagueVisibility =
  (typeof LeagueVisibility)[keyof typeof LeagueVisibility];

export const LeagueMemberRole = {
  MEMBER: "member",
  MANAGER: "manager",
  EXECUTIVE: "executive",
} as const;

export type LeagueMemberRole =
  (typeof LeagueMemberRole)[keyof typeof LeagueMemberRole];

export const InvitationStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;

export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const LEAGUE_LOGOS = [
  "ping-pong",
  "pool",
  "pacman",
  "poker",
  "chess",
  "foosball",
  "cards",
  "dice",
  "trophy",
  "crown",
  "target",
  "controller",
  "joystick",
  "rocket",
  "shield",
  "sword",
  "ghost",
  "gem",
  "robot",
  "medal",
] as const;

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
  SUSPENSION_LIFTED: "suspension_lifted",
} as const;

export type ModerationActionType =
  (typeof ModerationActionType)[keyof typeof ModerationActionType];

export const MODERATION_ACTION_LABELS: Record<ModerationActionType, string> = {
  [ModerationActionType.DISMISSED]: "Report Dismissed",
  [ModerationActionType.WARNED]: "Warning Issued",
  [ModerationActionType.SUSPENDED]: "Member Suspended",
  [ModerationActionType.REMOVED]: "Member Removed",
  [ModerationActionType.SUSPENSION_LIFTED]: "Suspension Lifted",
};
