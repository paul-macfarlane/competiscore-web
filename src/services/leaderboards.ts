import { getGameTypeById as dbGetGameTypeById } from "@/db/game-types";
import {
  LeaderboardEntry,
  countLeaderboardEntries as dbCountLeaderboardEntries,
  getHighScoreEntriesByGameTypeId as dbGetHighScoreEntriesByGameTypeId,
  getLeaderboard as dbGetLeaderboard,
  getPersonalBestByTeam as dbGetPersonalBestByTeam,
  getPersonalBestByUser as dbGetPersonalBestByUser,
} from "@/db/high-scores";
import { getLeagueMember } from "@/db/league-members";
import { HighScoreEntry } from "@/db/schema";
import {
  GameCategory,
  ParticipantType,
  TimeRange,
} from "@/lib/shared/constants";
import { parseHighScoreConfig } from "@/lib/shared/game-config-parser";

import { ServiceResult } from "./shared";

function getTimeRangeDate(timeRange: TimeRange): Date | undefined {
  const now = new Date();
  switch (timeRange) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "year":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return undefined;
  }
}

export type PaginatedLeaderboardResult = {
  leaderboard: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
};

export async function getHighScoreLeaderboard(
  userId: string,
  gameTypeId: string,
  options: { limit?: number; offset?: number; timeRange?: TimeRange } = {},
): Promise<ServiceResult<PaginatedLeaderboardResult>> {
  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return { error: "This game type does not have a leaderboard" };
  }

  const config = parseHighScoreConfig(gameType.config);
  const scoreOrder = config.scoreOrder;

  const since = getTimeRangeDate(options.timeRange ?? "all");
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const [leaderboard, total] = await Promise.all([
    dbGetLeaderboard(gameTypeId, {
      limit,
      offset,
      scoreOrder,
      since,
    }),
    dbCountLeaderboardEntries(gameTypeId, { since }),
  ]);

  return {
    data: {
      leaderboard,
      total,
      limit,
      offset,
    },
  };
}

export async function getHighScoreEntries(
  userId: string,
  gameTypeId: string,
  options: {
    limit?: number;
    offset?: number;
    timeRange?: TimeRange;
    sortBy?: "score" | "date";
  } = {},
): Promise<
  ServiceResult<
    (HighScoreEntry & {
      user: {
        id: string;
        name: string;
        username: string;
        image: string | null;
      } | null;
      team: { id: string; name: string; logo: string | null } | null;
      placeholderMember: { id: string; displayName: string } | null;
    })[]
  >
> {
  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return { error: "This game type does not have high score entries" };
  }

  const config = parseHighScoreConfig(gameType.config);
  const scoreOrder = config.scoreOrder;

  const since = getTimeRangeDate(options.timeRange ?? "all");

  const entries = await dbGetHighScoreEntriesByGameTypeId(gameTypeId, {
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
    scoreOrder,
    since,
    sortBy: options.sortBy ?? "score",
  });

  return { data: entries };
}

export async function getPersonalBest(
  userId: string,
  gameTypeId: string,
  participantId?: string,
  participantType?: ParticipantType,
): Promise<ServiceResult<HighScoreEntry | null>> {
  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return { error: "This game type does not have personal bests" };
  }

  const config = parseHighScoreConfig(gameType.config);
  const scoreOrder = config.scoreOrder;

  const targetId = participantId ?? userId;
  const targetType = participantType ?? ParticipantType.INDIVIDUAL;

  let personalBest: HighScoreEntry | undefined;
  if (targetType === ParticipantType.INDIVIDUAL) {
    personalBest = await dbGetPersonalBestByUser(
      targetId,
      gameTypeId,
      scoreOrder,
    );
  } else {
    personalBest = await dbGetPersonalBestByTeam(
      targetId,
      gameTypeId,
      scoreOrder,
    );
  }

  return { data: personalBest ?? null };
}

export async function getUserRank(
  userId: string,
  gameTypeId: string,
  targetUserId?: string,
): Promise<ServiceResult<{ rank: number; score: number } | null>> {
  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return { error: "This game type does not have rankings" };
  }

  const config = parseHighScoreConfig(gameType.config);
  const scoreOrder = config.scoreOrder;

  const targetId = targetUserId ?? userId;
  const personalBest = await dbGetPersonalBestByUser(
    targetId,
    gameTypeId,
    scoreOrder,
  );

  if (!personalBest) {
    return { data: null };
  }

  const leaderboard = await dbGetLeaderboard(gameTypeId, {
    limit: 1000,
    scoreOrder,
  });

  const userEntry = leaderboard.find(
    (entry) =>
      entry.participantId === targetId && entry.participantType === "user",
  );
  if (!userEntry) {
    return { data: null };
  }

  return { data: { rank: userEntry.rank, score: userEntry.bestScore } };
}
