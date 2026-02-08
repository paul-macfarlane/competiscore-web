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

export const DEFAULT_ITEMS_PER_PAGE = 10;
