import { countEventsByUser } from "@/db/events";
import { getGameTypeCountByLeagueId } from "@/db/game-types";
import { getMemberCount, getUserLeagueCount } from "@/db/league-members";
import {
  LimitTypeValue,
  getLimitOverrideForLeague,
  getLimitOverrideForUser,
} from "@/db/limit-overrides";
import {
  LimitType,
  MAX_EVENTS_PER_USER,
  MAX_GAME_TYPES_PER_LEAGUE,
  MAX_LEAGUES_PER_USER,
  MAX_MEMBERS_PER_LEAGUE,
  NEAR_LIMIT_THRESHOLD,
} from "@/services/constants";

export type LimitInfo = {
  current: number;
  max: number | null;
  isAtLimit: boolean;
  isNearLimit: boolean;
};

export type LimitCheckResult = {
  allowed: boolean;
  limitInfo: LimitInfo;
  message?: string;
};

function createLimitInfo(current: number, max: number | null): LimitInfo {
  const isAtLimit = max !== null && current >= max;
  const isNearLimit =
    max !== null && !isAtLimit && current >= max - NEAR_LIMIT_THRESHOLD;
  return { current, max, isAtLimit, isNearLimit };
}

export async function getEffectiveUserLeagueLimit(
  userId: string,
): Promise<number | null> {
  const override = await getLimitOverrideForUser(
    userId,
    LimitType.MAX_LEAGUES_PER_USER as LimitTypeValue,
  );
  if (override) {
    return override.limitValue;
  }
  return MAX_LEAGUES_PER_USER;
}

export async function getEffectiveLeagueMemberLimit(
  leagueId: string,
): Promise<number | null> {
  const override = await getLimitOverrideForLeague(
    leagueId,
    LimitType.MAX_MEMBERS_PER_LEAGUE as LimitTypeValue,
  );
  if (override) {
    return override.limitValue;
  }
  return MAX_MEMBERS_PER_LEAGUE;
}

export async function getUserLeagueLimitInfo(
  userId: string,
): Promise<LimitInfo> {
  const [current, max] = await Promise.all([
    getUserLeagueCount(userId),
    getEffectiveUserLeagueLimit(userId),
  ]);
  return createLimitInfo(current, max);
}

export async function getLeagueMemberLimitInfo(
  leagueId: string,
): Promise<LimitInfo> {
  const [current, max] = await Promise.all([
    getMemberCount(leagueId),
    getEffectiveLeagueMemberLimit(leagueId),
  ]);
  return createLimitInfo(current, max);
}

export async function canUserJoinAnotherLeague(
  userId: string,
): Promise<LimitCheckResult> {
  const limitInfo = await getUserLeagueLimitInfo(userId);

  if (limitInfo.isAtLimit) {
    return {
      allowed: false,
      limitInfo,
      message:
        limitInfo.max === null
          ? undefined
          : `You can only be a member of ${limitInfo.max} leagues`,
    };
  }

  return { allowed: true, limitInfo };
}

export async function canLeagueAddMember(
  leagueId: string,
): Promise<LimitCheckResult> {
  const limitInfo = await getLeagueMemberLimitInfo(leagueId);

  if (limitInfo.isAtLimit) {
    return {
      allowed: false,
      limitInfo,
      message:
        limitInfo.max === null
          ? undefined
          : `This league has reached its maximum of ${limitInfo.max} members`,
    };
  }

  return { allowed: true, limitInfo };
}

export async function getEffectiveLeagueGameTypeLimit(
  leagueId: string,
): Promise<number | null> {
  const override = await getLimitOverrideForLeague(
    leagueId,
    LimitType.MAX_GAME_TYPES_PER_LEAGUE as LimitTypeValue,
  );
  if (override) {
    return override.limitValue;
  }
  return MAX_GAME_TYPES_PER_LEAGUE;
}

export async function getLeagueGameTypeLimitInfo(
  leagueId: string,
): Promise<LimitInfo> {
  const [current, max] = await Promise.all([
    getGameTypeCountByLeagueId(leagueId),
    getEffectiveLeagueGameTypeLimit(leagueId),
  ]);
  return createLimitInfo(current, max);
}

export async function getUserEventLimitInfo(
  userId: string,
): Promise<LimitInfo> {
  const current = await countEventsByUser(userId);
  return createLimitInfo(current, MAX_EVENTS_PER_USER);
}

export async function canLeagueAddGameType(
  leagueId: string,
): Promise<LimitCheckResult> {
  const limitInfo = await getLeagueGameTypeLimitInfo(leagueId);

  if (limitInfo.isAtLimit) {
    return {
      allowed: false,
      limitInfo,
      message:
        limitInfo.max === null
          ? undefined
          : `This league has reached its maximum of ${limitInfo.max} game types`,
    };
  }

  return { allowed: true, limitInfo };
}
