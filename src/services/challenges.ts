import { getGameTypeById as dbGetGameTypeById } from "@/db/game-types";
import { withTransaction } from "@/db/index";
import { getLeagueMember } from "@/db/league-members";
import {
  MatchWithParticipants,
  countPendingChallengesForUser as dbCountPendingChallenges,
  countSentChallengesByUser as dbCountSentChallenges,
  createMatch as dbCreateMatch,
  createMatchParticipants as dbCreateMatchParticipants,
  getMatchById as dbGetMatchById,
  getMatchParticipants as dbGetMatchParticipants,
  getMatchWithParticipants as dbGetMatchWithParticipants,
  getPendingChallengesForUser as dbGetPendingChallengesForUser,
  getSentChallengesByUser as dbGetSentChallengesByUser,
  updateMatchForChallengeResult as dbUpdateMatchForChallengeResult,
  updateMatchParticipantResults as dbUpdateMatchParticipantResults,
  updateMatchStatus as dbUpdateMatchStatus,
} from "@/db/matches";
import { Match, NewMatchParticipant } from "@/db/schema";
import {
  ChallengeWinningSide,
  GameCategory,
  MatchResult,
  MatchStatus,
  ScoringType,
} from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { matchIdSchema } from "@/validators/challenges";
import {
  createChallengeSchema,
  recordChallengeH2HScoreResultSchema,
  recordChallengeH2HWinLossResultSchema,
} from "@/validators/matches";

import { DEFAULT_ITEMS_PER_PAGE } from "./constants";
import {
  PaginatedResult,
  ServiceResult,
  formatZodErrors,
  isSuspended,
} from "./shared";

export async function createChallenge(
  userId: string,
  leagueId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.PLAY_GAMES)) {
    return { error: "You do not have permission to create challenges" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot create challenges while suspended" };
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot create challenges for an archived game type" };
  }

  if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
    return {
      error: "Challenges are only available for head-to-head game types",
    };
  }

  for (const p of data.challengedParticipants) {
    const challengedMembership = await getLeagueMember(p.userId, leagueId);
    if (challengedMembership && isSuspended(challengedMembership)) {
      return { error: "Cannot challenge suspended members" };
    }
  }

  return withTransaction(async (tx) => {
    const match = await dbCreateMatch(
      {
        leagueId,
        gameTypeId: data.gameTypeId,
        status: MatchStatus.PENDING,
        playedAt: new Date(),
        recorderId: userId,
        challengerId: userId,
        challengedAt: new Date(),
      },
      tx,
    );

    const participants: Omit<NewMatchParticipant, "id" | "createdAt">[] = [];

    for (const p of data.challengerParticipants) {
      participants.push({
        matchId: match.id,
        userId: p.userId,
        teamId: null,
        placeholderMemberId: null,
        side: 1,
        result: null,
        score: null,
        rank: null,
        isChallenged: false,
      });
    }

    for (const p of data.challengedParticipants) {
      participants.push({
        matchId: match.id,
        userId: p.userId,
        teamId: null,
        placeholderMemberId: null,
        side: 2,
        result: null,
        score: null,
        rank: null,
        isChallenged: true,
      });
    }

    await dbCreateMatchParticipants(participants, tx);

    return { data: match };
  });
}

export async function acceptChallenge(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = matchIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { matchId } = parsed.data;
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Challenge not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot accept challenges while suspended" };
  }

  if (match.status !== MatchStatus.PENDING) {
    return { error: "This challenge is no longer pending" };
  }

  const participants = await dbGetMatchParticipants(matchId);
  const challengedParticipants = participants.filter((p) => p.isChallenged);
  const isChallengee = challengedParticipants.some((p) => p.userId === userId);
  if (!isChallengee) {
    return { error: "You are not the target of this challenge" };
  }

  const updated = await dbUpdateMatchStatus(matchId, MatchStatus.ACCEPTED, {
    acceptedAt: new Date(),
  });
  if (!updated) {
    return { error: "Failed to accept challenge" };
  }

  return { data: updated };
}

export async function declineChallenge(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = matchIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { matchId } = parsed.data;
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Challenge not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (match.status !== MatchStatus.PENDING) {
    return { error: "This challenge is no longer pending" };
  }

  const participants = await dbGetMatchParticipants(matchId);
  const challengedParticipants = participants.filter((p) => p.isChallenged);
  const isChallengee = challengedParticipants.some((p) => p.userId === userId);
  if (!isChallengee) {
    return { error: "You are not the target of this challenge" };
  }

  const updated = await dbUpdateMatchStatus(matchId, MatchStatus.DECLINED, {
    declinedAt: new Date(),
  });

  if (!updated) {
    return { error: "Failed to decline challenge" };
  }

  return { data: updated };
}

export async function cancelChallenge(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = matchIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { matchId } = parsed.data;
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Challenge not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (match.status !== MatchStatus.PENDING) {
    return { error: "This challenge is no longer pending" };
  }

  if (match.challengerId !== userId) {
    return { error: "You can only cancel challenges you created" };
  }

  const updated = await dbUpdateMatchStatus(matchId, MatchStatus.CANCELLED, {
    cancelledAt: new Date(),
  });

  if (!updated) {
    return { error: "Failed to cancel challenge" };
  }

  return { data: undefined };
}

export async function recordChallengeH2HWinLossResult(
  userId: string,
  matchId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = recordChallengeH2HWinLossResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Challenge not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot record results while suspended" };
  }

  if (match.status !== MatchStatus.ACCEPTED) {
    return {
      error: "This challenge must be accepted before recording a result",
    };
  }

  const gameType = await dbGetGameTypeById(match.gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const config = parseH2HConfig(gameType.config);
  if (config.scoringType !== ScoringType.WIN_LOSS) {
    return { error: "This game type requires score-based results" };
  }

  if (data.winningSide === ChallengeWinningSide.DRAW && !config.drawsAllowed) {
    return { error: "Draws are not allowed for this game type" };
  }

  const participants = await dbGetMatchParticipants(matchId);
  const challengerParticipants = participants.filter((p) => !p.isChallenged);
  const challengedParticipants = participants.filter((p) => p.isChallenged);

  const isParticipant =
    challengerParticipants.some((p) => p.userId === userId) ||
    challengedParticipants.some((p) => p.userId === userId);

  if (!isParticipant) {
    return { error: "Only challenge participants can record the result" };
  }

  return withTransaction(async (tx) => {
    let challengerResult:
      | typeof MatchResult.WIN
      | typeof MatchResult.LOSS
      | typeof MatchResult.DRAW;
    let challengedResult:
      | typeof MatchResult.WIN
      | typeof MatchResult.LOSS
      | typeof MatchResult.DRAW;

    if (data.winningSide === ChallengeWinningSide.CHALLENGER) {
      challengerResult = MatchResult.WIN;
      challengedResult = MatchResult.LOSS;
    } else if (data.winningSide === ChallengeWinningSide.CHALLENGED) {
      challengerResult = MatchResult.LOSS;
      challengedResult = MatchResult.WIN;
    } else {
      challengerResult = MatchResult.DRAW;
      challengedResult = MatchResult.DRAW;
    }

    const updates = [
      ...challengerParticipants.map((p) => ({
        participantId: p.id,
        result: challengerResult,
      })),
      ...challengedParticipants.map((p) => ({
        participantId: p.id,
        result: challengedResult,
      })),
    ];

    await dbUpdateMatchParticipantResults(matchId, updates, tx);
    const updated = await dbUpdateMatchForChallengeResult(
      matchId,
      data.playedAt,
      tx,
    );
    if (!updated) {
      return { error: "Failed to record result" };
    }

    return { data: updated };
  });
}

export async function recordChallengeH2HScoreResult(
  userId: string,
  matchId: string,
  input: unknown,
): Promise<ServiceResult<Match>> {
  const parsed = recordChallengeH2HScoreResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Challenge not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot record results while suspended" };
  }

  if (match.status !== MatchStatus.ACCEPTED) {
    return {
      error: "This challenge must be accepted before recording a result",
    };
  }

  const gameType = await dbGetGameTypeById(match.gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const config = parseH2HConfig(gameType.config);
  if (config.scoringType !== ScoringType.SCORE_BASED) {
    return { error: "This game type requires win/loss results" };
  }

  const isDraw = data.challengerScore === data.challengedScore;
  if (isDraw && !config.drawsAllowed) {
    return { error: "Draws are not allowed for this game type" };
  }

  const participants = await dbGetMatchParticipants(matchId);
  const challengerParticipants = participants.filter((p) => !p.isChallenged);
  const challengedParticipants = participants.filter((p) => p.isChallenged);

  const isParticipant =
    challengerParticipants.some((p) => p.userId === userId) ||
    challengedParticipants.some((p) => p.userId === userId);
  if (!isParticipant) {
    return { error: "Only challenge participants can record the result" };
  }

  return withTransaction(async (tx) => {
    let challengerResult:
      | typeof MatchResult.WIN
      | typeof MatchResult.LOSS
      | typeof MatchResult.DRAW;
    let challengedResult:
      | typeof MatchResult.WIN
      | typeof MatchResult.LOSS
      | typeof MatchResult.DRAW;

    if (data.challengerScore > data.challengedScore) {
      challengerResult = MatchResult.WIN;
      challengedResult = MatchResult.LOSS;
    } else if (data.challengedScore > data.challengerScore) {
      challengerResult = MatchResult.LOSS;
      challengedResult = MatchResult.WIN;
    } else {
      challengerResult = MatchResult.DRAW;
      challengedResult = MatchResult.DRAW;
    }

    const updates = [
      ...challengerParticipants.map((p) => ({
        participantId: p.id,
        result: challengerResult,
        score: data.challengerScore,
      })),
      ...challengedParticipants.map((p) => ({
        participantId: p.id,
        result: challengedResult,
        score: data.challengedScore,
      })),
    ];

    await dbUpdateMatchParticipantResults(matchId, updates, tx);
    const updated = await dbUpdateMatchForChallengeResult(
      matchId,
      data.playedAt,
      tx,
    );
    if (!updated) {
      return { error: "Failed to record result" };
    }

    return { data: updated };
  });
}

export async function getPendingChallenges(
  userId: string,
  leagueId: string,
): Promise<
  ServiceResult<
    (MatchWithParticipants & {
      gameType: { id: string; name: string; category: string };
    })[]
  >
> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const challenges = await dbGetPendingChallengesForUser(userId, leagueId);
  const challengesWithParticipants: (MatchWithParticipants & {
    gameType: { id: string; name: string; category: string };
  })[] = [];

  for (const challenge of challenges) {
    const participants = await dbGetMatchParticipants(challenge.id);
    const gameType = await dbGetGameTypeById(challenge.gameTypeId);
    if (gameType && !gameType.isArchived) {
      challengesWithParticipants.push({
        ...challenge,
        participants,
        gameType: {
          id: gameType.id,
          name: gameType.name,
          category: gameType.category,
        },
      });
    }
  }

  return { data: challengesWithParticipants };
}

export async function getSentChallenges(
  userId: string,
  leagueId: string,
): Promise<
  ServiceResult<
    (MatchWithParticipants & {
      gameType: { id: string; name: string; category: string };
    })[]
  >
> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const challenges = await dbGetSentChallengesByUser(userId, leagueId);
  const challengesWithParticipants: (MatchWithParticipants & {
    gameType: { id: string; name: string; category: string };
  })[] = [];

  for (const challenge of challenges) {
    const participants = await dbGetMatchParticipants(challenge.id);
    const gameType = await dbGetGameTypeById(challenge.gameTypeId);
    if (gameType && !gameType.isArchived) {
      challengesWithParticipants.push({
        ...challenge,
        participants,
        gameType: {
          id: gameType.id,
          name: gameType.name,
          category: gameType.category,
        },
      });
    }
  }

  return { data: challengesWithParticipants };
}

export type ChallengeWithDetails = MatchWithParticipants & {
  gameType: { id: string; name: string; category: string };
};

async function hydrateChallenges(
  challenges: Match[],
): Promise<ChallengeWithDetails[]> {
  const result: ChallengeWithDetails[] = [];
  for (const challenge of challenges) {
    const participants = await dbGetMatchParticipants(challenge.id);
    const gameType = await dbGetGameTypeById(challenge.gameTypeId);
    if (gameType && !gameType.isArchived) {
      result.push({
        ...challenge,
        participants,
        gameType: {
          id: gameType.id,
          name: gameType.name,
          category: gameType.category,
        },
      });
    }
  }
  return result;
}

export async function getPendingChallengesPaginated(
  userId: string,
  leagueId: string,
  options?: { limit?: number; offset?: number },
): Promise<ServiceResult<PaginatedResult<ChallengeWithDetails>>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const limit = options?.limit ?? DEFAULT_ITEMS_PER_PAGE;
  const offset = options?.offset ?? 0;

  const [challenges, total] = await Promise.all([
    dbGetPendingChallengesForUser(userId, leagueId, { limit, offset }),
    dbCountPendingChallenges(userId, leagueId),
  ]);

  const items = await hydrateChallenges(challenges);
  return { data: { items, total, limit, offset } };
}

export async function getSentChallengesPaginated(
  userId: string,
  leagueId: string,
  options?: { limit?: number; offset?: number },
): Promise<ServiceResult<PaginatedResult<ChallengeWithDetails>>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const limit = options?.limit ?? DEFAULT_ITEMS_PER_PAGE;
  const offset = options?.offset ?? 0;

  const [challenges, total] = await Promise.all([
    dbGetSentChallengesByUser(userId, leagueId, { limit, offset }),
    dbCountSentChallenges(userId, leagueId),
  ]);

  const items = await hydrateChallenges(challenges);
  return { data: { items, total, limit, offset } };
}

export async function getChallenge(
  userId: string,
  matchId: string,
): Promise<ServiceResult<MatchWithParticipants>> {
  const match = await dbGetMatchById(matchId);
  if (!match) {
    return { error: "Challenge not found" };
  }

  const membership = await getLeagueMember(userId, match.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const matchWithParticipants = await dbGetMatchWithParticipants(matchId);
  if (!matchWithParticipants) {
    return { error: "Challenge not found" };
  }

  return { data: matchWithParticipants };
}
