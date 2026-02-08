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
  TOURNAMENT_ICONS: "/tournament-icons",
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
  "chess",
  "darts",
  "bowling",
  "cards",
  "dice",
  "foosball",
  "basketball",
  "soccer",
  "tennis",
  "hockey",
  "golf",
  "archery",
  "boxing",
  "racing",
  "trivia",
  "poker",
  "volleyball",
  "badminton",
  "video-game",
] as const;

export const TEAM_ICONS = [
  "phoenix",
  "thunder",
  "flame",
  "viper",
  "titan",
  "hawk",
  "kraken",
  "lion",
  "stag",
  "wolf-pack",
  "cobra",
  "trident",
  "spartan",
  "avalanche",
  "dragon",
  "fortress",
  "raptor",
  "sentinel",
  "storm",
  "crown",
] as const;

export const USER_AVATARS = [
  "alien",
  "astronaut",
  "bear",
  "cat",
  "chef",
  "dragon",
  "fox",
  "ghost",
  "knight",
  "monkey",
  "ninja",
  "owl",
  "panda",
  "penguin",
  "pirate",
  "robot",
  "unicorn",
  "viking",
  "wizard",
  "wolf",
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

export const GAME_ICON_OPTIONS: IconOption[] = GAME_TYPE_ICONS.map((icon) => ({
  name: formatIconName(icon),
  src: `${ICON_PATHS.GAME_TYPE_ICONS}/${icon}.svg`,
}));

export const TEAM_ICON_OPTIONS: IconOption[] = TEAM_ICONS.map((icon) => ({
  name: formatIconName(icon),
  src: `${ICON_PATHS.TEAM_ICONS}/${icon}.svg`,
}));

export const USER_AVATAR_OPTIONS: IconOption[] = USER_AVATARS.map((icon) => ({
  name: formatIconName(icon),
  src: `${ICON_PATHS.AVATARS}/${icon}.svg`,
}));

export const TOURNAMENT_ICONS = [
  "bracket",
  "champion",
  "podium",
  "versus",
  "grand-prix",
] as const;

export const TOURNAMENT_ICON_OPTIONS: IconOption[] = TOURNAMENT_ICONS.map(
  (icon) => ({
    name: formatIconName(icon),
    src: `${ICON_PATHS.TOURNAMENT_ICONS}/${icon}.svg`,
  }),
);

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

export const MatchParticipantType = {
  USER: "user",
  TEAM: "team",
  PLACEHOLDER: "placeholder",
} as const;

export type MatchParticipantType =
  (typeof MatchParticipantType)[keyof typeof MatchParticipantType];

export const MatchStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
} as const;

export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  [MatchStatus.PENDING]: "Pending",
  [MatchStatus.ACCEPTED]: "Accepted",
  [MatchStatus.COMPLETED]: "Completed",
  [MatchStatus.DECLINED]: "Declined",
  [MatchStatus.CANCELLED]: "Cancelled",
};

export const MatchResult = {
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
} as const;

export type MatchResult = (typeof MatchResult)[keyof typeof MatchResult];

export const MATCH_RESULT_LABELS: Record<MatchResult, string> = {
  [MatchResult.WIN]: "Win",
  [MatchResult.LOSS]: "Loss",
  [MatchResult.DRAW]: "Draw",
};

export const H2HWinningSide = {
  SIDE1: "side1",
  SIDE2: "side2",
  DRAW: "draw",
} as const;

export type H2HWinningSide =
  (typeof H2HWinningSide)[keyof typeof H2HWinningSide];

export const ChallengeWinningSide = {
  CHALLENGER: "challenger",
  CHALLENGED: "challenged",
  DRAW: "draw",
} as const;

export type ChallengeWinningSide =
  (typeof ChallengeWinningSide)[keyof typeof ChallengeWinningSide];

export const TimeRange = {
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
  ALL: "all",
} as const;

export type TimeRange = (typeof TimeRange)[keyof typeof TimeRange];

export const ChallengeType = {
  RECEIVED: "received",
  SENT: "sent",
} as const;

export type ChallengeType = (typeof ChallengeType)[keyof typeof ChallengeType];

export const ELO_CONSTANTS = {
  STARTING_ELO: 1200,
  STANDARD_K_FACTOR: 32,
  PROVISIONAL_K_FACTOR: 40,
  PROVISIONAL_MATCH_THRESHOLD: 10,
} as const;

export const TournamentStatus = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type TournamentStatus =
  (typeof TournamentStatus)[keyof typeof TournamentStatus];

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: "Draft",
  [TournamentStatus.IN_PROGRESS]: "In Progress",
  [TournamentStatus.COMPLETED]: "Completed",
};

export const TournamentType = {
  SINGLE_ELIMINATION: "single_elimination",
} as const;

export type TournamentType =
  (typeof TournamentType)[keyof typeof TournamentType];

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  [TournamentType.SINGLE_ELIMINATION]: "Single Elimination",
};

export const SeedingType = {
  MANUAL: "manual",
  RANDOM: "random",
} as const;

export type SeedingType = (typeof SeedingType)[keyof typeof SeedingType];

export const SEEDING_TYPE_LABELS: Record<SeedingType, string> = {
  [SeedingType.MANUAL]: "Manual",
  [SeedingType.RANDOM]: "Random",
};
