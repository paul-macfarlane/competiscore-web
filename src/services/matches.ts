import { getGameTypeById as dbGetGameTypeById } from "@/db/game-types";
import { createHighScoreEntry as dbCreateHighScoreEntry } from "@/db/high-scores";
import { withTransaction } from "@/db/index";
import { getLeagueMember } from "@/db/league-members";
import {
  MatchParticipantWithDetails,
  MatchWithGameType,
  MatchWithParticipants,
  countMatchesByLeagueId as dbCountMatchesByLeagueId,
  createMatch as dbCreateMatch,
  createMatchParticipants as dbCreateMatchParticipants,
  getMatchById as dbGetMatchById,
  getMatchParticipants as dbGetMatchParticipants,
  getMatchWithParticipants as dbGetMatchWithParticipants,
  getMatchesByGameTypeId as dbGetMatchesByGameTypeId,
  getMatchesByLeagueId as dbGetMatchesByLeagueId,
  getMatchesByUserParticipation as dbGetMatchesByUserParticipation,
  getMatchesWithGameTypeByLeagueId as dbGetMatchesWithGameTypeByLeagueId,
} from "@/db/matches";
import { getPlaceholderMemberById } from "@/db/placeholder-members";
import {
  GameType,
  HighScoreEntry,
  Match,
  NewMatchParticipant,
} from "@/db/schema";
import { isUserMemberOfTeam } from "@/db/teams";
import {
  TournamentMatchInfo,
  getTournamentInfoByMatchIds,
} from "@/db/tournaments";
import {
  GameCategory,
  H2HWinningSide,
  MatchResult,
  MatchStatus,
  ParticipantType,
  ScoreOrder,
  ScoringType,
} from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import {
  FFAConfig,
  H2HConfig,
  HighScoreConfig,
} from "@/lib/shared/game-templates";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import {
  ParticipantInput,
  recordFFARankedMatchSchema,
  recordFFAScoreMatchSchema,
  recordH2HScoreMatchSchema,
  recordH2HWinLossMatchSchema,
  submitHighScoreSchema,
} from "@/validators/matches";

import { updateEloRatingsForMatch } from "./elo-ratings";
import { ServiceResult, formatZodErrors, isSuspended } from "./shared";

function parseGameTypeConfig(
  gameType: GameType,
): H2HConfig | FFAConfig | HighScoreConfig {
  return parseGameConfig(gameType.config, gameType.category);
}

function validateParticipantCount(
  participants: ParticipantInput[],
  min: number,
  max: number,
  label: string,
): string | null {
  if (participants.length < min) {
    return `${label} must have at least ${min} participant(s)`;
  }
  if (participants.length > max) {
    return `${label} can have at most ${max} participant(s)`;
  }
  return null;
}

async function isUserInvolvedInMatch(
  userId: string,
  participants: ParticipantInput[],
): Promise<boolean> {
  for (const participant of participants) {
    if (participant.userId === userId) {
      return true;
    }

    if (participant.teamId) {
      const isTeamMember = await isUserMemberOfTeam(userId, participant.teamId);
      if (isTeamMember) {
        return true;
      }
    }

    if (participant.placeholderMemberId) {
      const placeholder = await getPlaceholderMemberById(
        participant.placeholderMemberId,
      );
      if (placeholder?.linkedUserId === userId) {
        return true;
      }
    }
  }

  return false;
}

export async function recordH2HWinLossMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = recordH2HWinLossMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, ...data } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.PLAY_GAMES)) {
    return { error: "You do not have permission to record matches" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot record matches while suspended" };
  }

  if (
    !canPerformAction(membership.role, LeagueAction.RECORD_MATCHES_FOR_OTHERS)
  ) {
    const allParticipants = [
      ...data.side1Participants,
      ...data.side2Participants,
    ];
    const isInvolved = await isUserInvolvedInMatch(userId, allParticipants);
    if (!isInvolved) {
      return { error: "You can only record matches you're involved in" };
    }
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot record matches for an archived game type" };
  }

  if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
    return {
      error: "This game type is not configured for head-to-head matches",
    };
  }

  const config = parseGameTypeConfig(gameType) as H2HConfig;
  if (config.scoringType !== ScoringType.WIN_LOSS) {
    return { error: "This game type requires score-based recording" };
  }
  if (data.winningSide === H2HWinningSide.DRAW && !config.drawsAllowed) {
    return { error: "Draws are not allowed for this game type" };
  }

  const side1Error = validateParticipantCount(
    data.side1Participants,
    config.minPlayersPerSide,
    config.maxPlayersPerSide,
    "Side 1",
  );
  if (side1Error) return { error: side1Error };

  const side2Error = validateParticipantCount(
    data.side2Participants,
    config.minPlayersPerSide,
    config.maxPlayersPerSide,
    "Side 2",
  );
  if (side2Error) return { error: side2Error };

  return withTransaction(async (tx) => {
    const match = await dbCreateMatch(
      {
        leagueId,
        gameTypeId: data.gameTypeId,
        status: MatchStatus.COMPLETED,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    const participants: Omit<NewMatchParticipant, "id" | "createdAt">[] = [];

    const side1Result =
      data.winningSide === H2HWinningSide.SIDE1
        ? MatchResult.WIN
        : data.winningSide === H2HWinningSide.DRAW
          ? MatchResult.DRAW
          : MatchResult.LOSS;
    const side2Result =
      data.winningSide === H2HWinningSide.SIDE2
        ? MatchResult.WIN
        : data.winningSide === H2HWinningSide.DRAW
          ? MatchResult.DRAW
          : MatchResult.LOSS;

    for (const p of data.side1Participants) {
      participants.push({
        matchId: match.id,
        userId: p.userId ?? null,
        teamId: p.teamId ?? null,
        placeholderMemberId: p.placeholderMemberId ?? null,
        side: 1,
        result: side1Result,
        score: null,
        rank: null,
        isChallenged: null,
      });
    }

    for (const p of data.side2Participants) {
      participants.push({
        matchId: match.id,
        userId: p.userId ?? null,
        teamId: p.teamId ?? null,
        placeholderMemberId: p.placeholderMemberId ?? null,
        side: 2,
        result: side2Result,
        score: null,
        rank: null,
        isChallenged: null,
      });
    }

    await dbCreateMatchParticipants(participants, tx);

    await updateEloRatingsForMatch(match.id, tx);

    return { data: match };
  });
}

export async function recordH2HScoreMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = recordH2HScoreMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, ...data } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.PLAY_GAMES)) {
    return { error: "You do not have permission to record matches" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot record matches while suspended" };
  }

  if (
    !canPerformAction(membership.role, LeagueAction.RECORD_MATCHES_FOR_OTHERS)
  ) {
    const allParticipants = [
      ...data.side1Participants,
      ...data.side2Participants,
    ];
    const isInvolved = await isUserInvolvedInMatch(userId, allParticipants);
    if (!isInvolved) {
      return { error: "You can only record matches you're involved in" };
    }
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot record matches for an archived game type" };
  }

  if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
    return {
      error: "This game type is not configured for head-to-head matches",
    };
  }

  const config = parseGameTypeConfig(gameType) as H2HConfig;
  if (config.scoringType !== ScoringType.SCORE_BASED) {
    return { error: "This game type requires win/loss recording" };
  }

  const side1Error = validateParticipantCount(
    data.side1Participants,
    config.minPlayersPerSide,
    config.maxPlayersPerSide,
    "Side 1",
  );
  if (side1Error) return { error: side1Error };

  const side2Error = validateParticipantCount(
    data.side2Participants,
    config.minPlayersPerSide,
    config.maxPlayersPerSide,
    "Side 2",
  );
  if (side2Error) return { error: side2Error };

  const isDraw = data.side1Score === data.side2Score;
  if (isDraw && !config.drawsAllowed) {
    return { error: "Draws are not allowed for this game type" };
  }

  return withTransaction(async (tx) => {
    const match = await dbCreateMatch(
      {
        leagueId,
        gameTypeId: data.gameTypeId,
        status: MatchStatus.COMPLETED,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    const participants: Omit<NewMatchParticipant, "id" | "createdAt">[] = [];

    let side1Result:
      | typeof MatchResult.WIN
      | typeof MatchResult.LOSS
      | typeof MatchResult.DRAW;
    let side2Result:
      | typeof MatchResult.WIN
      | typeof MatchResult.LOSS
      | typeof MatchResult.DRAW;

    if (data.side1Score > data.side2Score) {
      side1Result = MatchResult.WIN;
      side2Result = MatchResult.LOSS;
    } else if (data.side2Score > data.side1Score) {
      side1Result = MatchResult.LOSS;
      side2Result = MatchResult.WIN;
    } else {
      side1Result = MatchResult.DRAW;
      side2Result = MatchResult.DRAW;
    }

    for (const p of data.side1Participants) {
      participants.push({
        matchId: match.id,
        userId: p.userId ?? null,
        teamId: p.teamId ?? null,
        placeholderMemberId: p.placeholderMemberId ?? null,
        side: 1,
        score: data.side1Score,
        result: side1Result,
        rank: null,
        isChallenged: null,
      });
    }

    for (const p of data.side2Participants) {
      participants.push({
        matchId: match.id,
        userId: p.userId ?? null,
        teamId: p.teamId ?? null,
        placeholderMemberId: p.placeholderMemberId ?? null,
        side: 2,
        score: data.side2Score,
        result: side2Result,
        rank: null,
        isChallenged: null,
      });
    }

    await dbCreateMatchParticipants(participants, tx);

    await updateEloRatingsForMatch(match.id, tx);

    return { data: match };
  });
}

export async function recordFFARankedMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = recordFFARankedMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, ...data } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.PLAY_GAMES)) {
    return { error: "You do not have permission to record matches" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot record matches while suspended" };
  }

  if (
    !canPerformAction(membership.role, LeagueAction.RECORD_MATCHES_FOR_OTHERS)
  ) {
    const isInvolved = await isUserInvolvedInMatch(userId, data.participants);
    if (!isInvolved) {
      return { error: "You can only record matches you're involved in" };
    }
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot record matches for an archived game type" };
  }

  if (gameType.category !== GameCategory.FREE_FOR_ALL) {
    return {
      error: "This game type is not configured for free-for-all matches",
    };
  }

  const config = parseGameTypeConfig(gameType) as FFAConfig;
  if (config.scoringType !== ScoringType.RANKED_FINISH) {
    return { error: "This game type requires score-based recording" };
  }

  if (data.participants.length < config.minPlayers) {
    return { error: `At least ${config.minPlayers} participants are required` };
  }
  if (data.participants.length > config.maxPlayers) {
    return { error: `At most ${config.maxPlayers} participants are allowed` };
  }

  const ranks = data.participants.map((p) => p.rank);
  const uniqueRanks = new Set(ranks);
  if (uniqueRanks.size !== ranks.length) {
    return { error: "Each participant must have a unique rank" };
  }
  const maxRank = Math.max(...ranks);
  if (maxRank > data.participants.length) {
    return { error: "Ranks must be consecutive starting from 1" };
  }

  return withTransaction(async (tx) => {
    const match = await dbCreateMatch(
      {
        leagueId,
        gameTypeId: data.gameTypeId,
        status: MatchStatus.COMPLETED,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    const participants: Omit<NewMatchParticipant, "id" | "createdAt">[] =
      data.participants.map((p) => ({
        matchId: match.id,
        userId: p.userId ?? null,
        teamId: p.teamId ?? null,
        placeholderMemberId: p.placeholderMemberId ?? null,
        side: null,
        score: null,
        rank: p.rank,
        result: null,
        isChallenged: null,
      }));

    await dbCreateMatchParticipants(participants, tx);

    await updateEloRatingsForMatch(match.id, tx);

    return { data: match };
  });
}

export async function recordFFAScoreMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = recordFFAScoreMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, ...data } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.PLAY_GAMES)) {
    return { error: "You do not have permission to record matches" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot record matches while suspended" };
  }

  if (
    !canPerformAction(membership.role, LeagueAction.RECORD_MATCHES_FOR_OTHERS)
  ) {
    const isInvolved = await isUserInvolvedInMatch(userId, data.participants);
    if (!isInvolved) {
      return { error: "You can only record matches you're involved in" };
    }
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot record matches for an archived game type" };
  }

  if (gameType.category !== GameCategory.FREE_FOR_ALL) {
    return {
      error: "This game type is not configured for free-for-all matches",
    };
  }

  const config = parseGameTypeConfig(gameType) as FFAConfig;
  if (config.scoringType !== ScoringType.SCORE_BASED) {
    return { error: "This game type requires ranked recording" };
  }

  if (data.participants.length < config.minPlayers) {
    return { error: `At least ${config.minPlayers} participants are required` };
  }
  if (data.participants.length > config.maxPlayers) {
    return { error: `At most ${config.maxPlayers} participants are allowed` };
  }

  return withTransaction(async (tx) => {
    const match = await dbCreateMatch(
      {
        leagueId,
        gameTypeId: data.gameTypeId,
        status: MatchStatus.COMPLETED,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    const sortedParticipants = [...data.participants].sort((a, b) => {
      if (config.scoreOrder === ScoreOrder.HIGHEST_WINS) {
        return b.score - a.score;
      }
      return a.score - b.score;
    });

    const participants: Omit<NewMatchParticipant, "id" | "createdAt">[] =
      sortedParticipants.map((p, index) => ({
        matchId: match.id,
        userId: p.userId ?? null,
        teamId: p.teamId ?? null,
        placeholderMemberId: p.placeholderMemberId ?? null,
        side: null,
        score: p.score,
        rank: index + 1,
        result: null,
        isChallenged: null,
      }));

    await dbCreateMatchParticipants(participants, tx);

    await updateEloRatingsForMatch(match.id, tx);

    return { data: match };
  });
}

export async function submitHighScore(
  userId: string,
  input: unknown,
): Promise<ServiceResult<HighScoreEntry>> {
  const parsed = submitHighScoreSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, ...data } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.PLAY_GAMES)) {
    return { error: "You do not have permission to submit scores" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot submit scores while suspended" };
  }

  if (
    !canPerformAction(membership.role, LeagueAction.RECORD_MATCHES_FOR_OTHERS)
  ) {
    const isInvolved = await isUserInvolvedInMatch(userId, [data.participant]);
    if (!isInvolved) {
      return { error: "You can only submit scores for yourself or your team" };
    }
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot submit scores for an archived game type" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return {
      error: "This game type is not configured for high score submissions",
    };
  }

  const config = parseGameTypeConfig(gameType) as HighScoreConfig;

  if (
    config.participantType === ParticipantType.INDIVIDUAL &&
    !data.participant.userId &&
    !data.participant.placeholderMemberId
  ) {
    return { error: "This game type requires individual participants" };
  }
  if (
    config.participantType === ParticipantType.TEAM &&
    !data.participant.teamId
  ) {
    return { error: "This game type requires team participants" };
  }

  const entry = await dbCreateHighScoreEntry({
    leagueId,
    gameTypeId: data.gameTypeId,
    userId: data.participant.userId ?? null,
    teamId: data.participant.teamId ?? null,
    placeholderMemberId: data.participant.placeholderMemberId ?? null,
    score: data.score,
    recorderId: userId,
    achievedAt: data.achievedAt,
  });

  return { data: entry };
}

export type MatchWithParticipantsAndGameType = MatchWithParticipants & {
  gameType: { id: string; name: string; category: string } | null;
  tournament?: TournamentMatchInfo | null;
};

export async function getMatch(
  userId: string,
  matchId: string,
): Promise<ServiceResult<MatchWithParticipantsAndGameType>> {
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Match not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const [matchWithParticipants, gameType, tournamentInfos] = await Promise.all([
    dbGetMatchWithParticipants(matchId),
    dbGetGameTypeById(match.gameTypeId),
    getTournamentInfoByMatchIds([matchId]),
  ]);

  if (!matchWithParticipants) {
    return { error: "Match not found" };
  }

  return {
    data: {
      ...matchWithParticipants,
      gameType: gameType
        ? { id: gameType.id, name: gameType.name, category: gameType.category }
        : null,
      tournament: tournamentInfos[0] ?? null,
    },
  };
}

export async function getGameTypeMatches(
  userId: string,
  gameTypeId: string,
  options: { limit?: number; offset?: number; status?: string } = {},
): Promise<ServiceResult<MatchWithParticipants[]>> {
  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const matches = await dbGetMatchesByGameTypeId(gameTypeId, options);
  const matchesWithParticipants: MatchWithParticipants[] = [];

  for (const match of matches) {
    const participants = await dbGetMatchParticipants(match.id);
    matchesWithParticipants.push({ ...match, participants });
  }

  return { data: matchesWithParticipants };
}

export async function getLeagueMatches(
  userId: string,
  leagueId: string,
  options: { limit?: number; offset?: number; status?: string } = {},
): Promise<ServiceResult<MatchWithParticipants[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const matches = await dbGetMatchesByLeagueId(leagueId, options);
  const matchesWithParticipants: MatchWithParticipants[] = [];

  for (const match of matches) {
    const participants = await dbGetMatchParticipants(match.id);
    matchesWithParticipants.push({ ...match, participants });
  }

  return { data: matchesWithParticipants };
}

export async function getUserMatchHistory(
  userId: string,
  leagueId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ServiceResult<MatchWithParticipants[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const matches = await dbGetMatchesByUserParticipation(
    userId,
    leagueId,
    options,
  );
  const matchesWithParticipants: MatchWithParticipants[] = [];

  for (const match of matches) {
    const participants = await dbGetMatchParticipants(match.id);
    matchesWithParticipants.push({ ...match, participants });
  }

  return { data: matchesWithParticipants };
}

export type MatchWithGameTypeAndParticipants = MatchWithGameType & {
  participants: MatchParticipantWithDetails[];
  tournament?: TournamentMatchInfo | null;
};

export type PaginatedMatchesResult = {
  matches: MatchWithGameTypeAndParticipants[];
  total: number;
  limit: number;
  offset: number;
};

export async function getLeagueMatchesPaginated(
  userId: string,
  leagueId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    gameTypeId?: string;
  } = {},
): Promise<ServiceResult<PaginatedMatchesResult>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const { limit = 20, offset = 0, status, gameTypeId } = options;

  const [matches, total] = await Promise.all([
    dbGetMatchesWithGameTypeByLeagueId(leagueId, {
      limit,
      offset,
      status,
      gameTypeId,
      excludeArchivedGameTypes: true,
    }),
    dbCountMatchesByLeagueId(leagueId, {
      status,
      gameTypeId,
      excludeArchivedGameTypes: true,
    }),
  ]);

  const matchesWithParticipants: MatchWithGameTypeAndParticipants[] = [];

  for (const match of matches) {
    const participants = await dbGetMatchParticipants(match.id);
    matchesWithParticipants.push({ ...match, participants });
  }

  return {
    data: {
      matches: matchesWithParticipants,
      total,
      limit,
      offset,
    },
  };
}

export type HighScoreActivityItem = {
  type: "high_score";
  id: string;
  leagueId: string;
  gameTypeId: string;
  score: number;
  achievedAt: Date;
  createdAt: Date;
  gameType: { id: string; name: string; category: string } | null;
  participant: {
    user: {
      id: string;
      name: string;
      username: string;
      image: string | null;
    } | null;
    team: { id: string; name: string; logo: string | null } | null;
    placeholderMember: { id: string; displayName: string } | null;
  };
};

export type LeagueActivityItem =
  | ({ type: "match" } & MatchWithGameTypeAndParticipants)
  | HighScoreActivityItem;

export type PaginatedActivityResult = {
  items: LeagueActivityItem[];
  matchCount: number;
  highScoreCount: number;
  limit: number;
  offset: number;
};

export async function getLeagueActivityPaginated(
  userId: string,
  leagueId: string,
  options: {
    limit?: number;
    offset?: number;
    gameTypeId?: string;
  } = {},
): Promise<ServiceResult<PaginatedActivityResult>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const { limit = 20, offset = 0, gameTypeId } = options;

  const {
    getHighScoreEntriesWithDetailsByLeagueId,
    countHighScoreEntriesByLeagueId,
  } = await import("@/db/high-scores");

  const fetchLimit = offset + limit;

  const [matches, matchCount, highScores, highScoreCount] = await Promise.all([
    dbGetMatchesWithGameTypeByLeagueId(leagueId, {
      limit: fetchLimit,
      offset: 0,
      gameTypeId,
      excludeArchivedGameTypes: true,
    }),
    dbCountMatchesByLeagueId(leagueId, {
      gameTypeId,
      excludeArchivedGameTypes: true,
    }),
    getHighScoreEntriesWithDetailsByLeagueId(leagueId, {
      limit: fetchLimit,
      offset: 0,
      gameTypeId,
      excludeArchivedGameTypes: true,
    }),
    countHighScoreEntriesByLeagueId(leagueId, {
      gameTypeId,
      excludeArchivedGameTypes: true,
    }),
  ]);

  const matchIds = matches.filter((m) => m.id).map((m) => m.id);
  const tournamentInfos = await getTournamentInfoByMatchIds(matchIds);
  const tournamentMap = new Map(tournamentInfos.map((t) => [t.matchId, t]));

  const matchesWithParticipants: ({
    type: "match";
  } & MatchWithGameTypeAndParticipants)[] = [];

  for (const match of matches) {
    const participants = await dbGetMatchParticipants(match.id);
    matchesWithParticipants.push({
      type: "match",
      ...match,
      participants,
      tournament: tournamentMap.get(match.id) ?? null,
    });
  }

  const highScoreItems: HighScoreActivityItem[] = highScores.map((hs) => ({
    type: "high_score" as const,
    id: hs.id,
    leagueId: hs.leagueId,
    gameTypeId: hs.gameTypeId,
    score: hs.score,
    achievedAt: hs.achievedAt,
    createdAt: hs.createdAt,
    gameType: hs.gameType,
    participant: {
      user: hs.user,
      team: hs.team,
      placeholderMember: hs.placeholderMember,
    },
  }));

  const allItems: LeagueActivityItem[] = [
    ...matchesWithParticipants,
    ...highScoreItems,
  ].sort((a, b) => {
    const dateA = a.type === "match" ? a.playedAt : a.achievedAt;
    const dateB = b.type === "match" ? b.playedAt : b.achievedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const paginatedItems = allItems.slice(offset, offset + limit);

  return {
    data: {
      items: paginatedItems,
      matchCount,
      highScoreCount,
      limit,
      offset,
    },
  };
}
