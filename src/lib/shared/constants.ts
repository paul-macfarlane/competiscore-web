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

export const ICON_PATHS = {
  AVATARS: "/avatars",
  LEAGUE_LOGOS: "/league-logos",
  GAME_TYPE_ICONS: "/game-type-icons",
  TEAM_ICONS: "/team-avatars",
} as const;

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

export const GameCategory = {
  HEAD_TO_HEAD: "head_to_head",
  FREE_FOR_ALL: "free_for_all",
  HIGH_SCORE: "high_score",
} as const;

export type GameCategory = (typeof GameCategory)[keyof typeof GameCategory];

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  [GameCategory.HEAD_TO_HEAD]: "Head-to-Head",
  [GameCategory.FREE_FOR_ALL]: "Free-for-All",
  [GameCategory.HIGH_SCORE]: "High Score Challenge",
};

export const GAME_TYPE_ICONS = [
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

export const TEAM_ICONS = [
  "8-ball",
  "cards",
  "chess-knight",
  "controller",
  "crown",
  "dice",
  "flag",
  "gem",
  "ghost",
  "joystick",
  "pacman",
  "paddle",
  "potion",
  "robot",
  "rocket",
  "shield",
  "skull",
  "sword",
  "target",
  "trophy",
] as const;

export const USER_AVATARS = [
  "8-ball",
  "cards",
  "chess-knight",
  "controller",
  "crown",
  "dice",
  "flag",
  "gem",
  "ghost",
  "joystick",
  "pacman",
  "paddle",
  "potion",
  "robot",
  "rocket",
  "shield",
  "skull",
  "sword",
  "target",
  "trophy",
] as const;

export const TeamMemberRole = {
  MEMBER: "member",
  MANAGER: "manager",
} as const;

export type TeamMemberRole =
  (typeof TeamMemberRole)[keyof typeof TeamMemberRole];

export type IconOption = {
  name: string;
  src: string;
};

function formatIconName(icon: string): string {
  return icon
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const TEAM_ICON_OPTIONS: IconOption[] = TEAM_ICONS.map((icon) => ({
  name: formatIconName(icon),
  src: `${ICON_PATHS.TEAM_ICONS}/${icon}.svg`,
}));

export const USER_AVATAR_OPTIONS: IconOption[] = USER_AVATARS.map((icon) => ({
  name: formatIconName(icon),
  src: `${ICON_PATHS.AVATARS}/${icon}.svg`,
}));

export const ScoringType = {
  WIN_LOSS: "win_loss",
  SCORE_BASED: "score_based",
  RANKED_FINISH: "ranked_finish",
} as const;

export type ScoringType = (typeof ScoringType)[keyof typeof ScoringType];

export const ScoreOrder = {
  HIGHEST_WINS: "highest_wins",
  LOWEST_WINS: "lowest_wins",
} as const;

export type ScoreOrder = (typeof ScoreOrder)[keyof typeof ScoreOrder];

export const ParticipantType = {
  INDIVIDUAL: "individual",
  TEAM: "team",
} as const;

export type ParticipantType =
  (typeof ParticipantType)[keyof typeof ParticipantType];
