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
