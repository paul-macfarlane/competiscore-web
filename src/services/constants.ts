export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const BIO_MAX_LENGTH = 500;
export const NAME_MAX_LENGTH = 100;

export const LEAGUE_NAME_MAX_LENGTH = 100;
export const LEAGUE_DESCRIPTION_MAX_LENGTH = 500;
export const MAX_LEAGUES_PER_USER = 3;
export const MAX_MEMBERS_PER_LEAGUE = 20;
export const MAX_GAME_TYPES_PER_LEAGUE = 20;

export const NEAR_LIMIT_THRESHOLD = 1;

export const LimitType = {
  MAX_LEAGUES_PER_USER: "max_leagues_per_user",
  MAX_MEMBERS_PER_LEAGUE: "max_members_per_league",
  MAX_GAME_TYPES_PER_LEAGUE: "max_game_types_per_league",
} as const;

export const REPORT_DESCRIPTION_MAX_LENGTH = 2000;
export const REPORT_EVIDENCE_MAX_LENGTH = 2000;
export const MODERATION_REASON_MAX_LENGTH = 500;
export const MAX_SUSPENSION_DAYS = 365;

export const GAME_TYPE_NAME_MAX_LENGTH = 100;
export const GAME_TYPE_DESCRIPTION_MAX_LENGTH = 500;
export const RULES_MAX_LENGTH = 10000;

export const TEAM_NAME_MAX_LENGTH = 100;
export const TEAM_DESCRIPTION_MAX_LENGTH = 500;

export const MAX_PARTICIPANTS_PER_MATCH = 50;
export const MAX_SCORE_VALUE = 999999999;

export const TOURNAMENT_NAME_MAX_LENGTH = 100;
export const TOURNAMENT_DESCRIPTION_MAX_LENGTH = 500;
export const MAX_TOURNAMENT_PARTICIPANTS = 64;
export const MIN_TOURNAMENT_PARTICIPANTS = 2;
export const MAX_TOURNAMENTS_PER_LEAGUE = 20;
export const MAX_BEST_OF = 9;
export const MIN_SWISS_ROUNDS = 2;
export const MAX_SWISS_ROUNDS = 20;

export const EVENT_NAME_MAX_LENGTH = 100;
export const EVENT_DESCRIPTION_MAX_LENGTH = 500;
export const MAX_EVENTS_PER_USER = 5;
export const MAX_EVENT_GAME_TYPES = 20;
export const MAX_EVENT_TEAMS = 50;
export const MAX_EVENT_TEAM_NAME_MAX_LENGTH = 100;
export const MAX_EVENT_TEAM_MEMBERS = 20;
export const MAX_EVENT_PARTICIPANTS = 100;
export const MAX_EVENT_PLACEHOLDER_PARTICIPANTS = 100;

export const EVENT_TEAM_COLORS = [
  { value: "red", label: "Red", bg: "#dc2626", text: "white" },
  { value: "blue", label: "Blue", bg: "#2563eb", text: "white" },
  { value: "green", label: "Green", bg: "#16a34a", text: "white" },
  { value: "orange", label: "Orange", bg: "#ea580c", text: "white" },
  { value: "purple", label: "Purple", bg: "#9333ea", text: "white" },
  { value: "yellow", label: "Yellow", bg: "#ca8a04", text: "white" },
  { value: "teal", label: "Teal", bg: "#0d9488", text: "white" },
  { value: "pink", label: "Pink", bg: "#db2777", text: "white" },
] as const;
export type EventTeamColor = (typeof EVENT_TEAM_COLORS)[number]["value"];

export function getTeamColorHex(colorValue: string | null): string {
  if (!colorValue) return "#94a3b8";
  const found = EVENT_TEAM_COLORS.find((c) => c.value === colorValue);
  return found ? found.bg : "#94a3b8";
}

export const DISCRETIONARY_AWARD_NAME_MAX_LENGTH = 100;
export const DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH = 500;
export const MAX_DISCRETIONARY_AWARD_RECIPIENTS = 50;

export const HIGH_SCORE_SESSION_NAME_MAX_LENGTH = 100;
export const HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH = 500;

export const DEFAULT_ITEMS_PER_PAGE = 10;
