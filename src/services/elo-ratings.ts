import {
  type EloStanding,
  createEloHistoryEntry,
  getEloHistoryByRatingId,
  getEloStandingsByGameType,
  getOrCreateEloRating,
  getParticipantEloRank,
  updateEloRating,
} from "@/db/elo-ratings";
import { type DBOrTx, db, withTransaction } from "@/db/index";
import type {
  EloHistory,
  GameType,
  Match,
  MatchParticipant,
  NewEloHistory,
  PlaceholderMember,
  Team,
  User,
} from "@/db/schema";
import { GameCategory, MatchResult } from "@/lib/shared/constants";
import {
  type FFAParticipant,
  calculateFFAEloChanges,
  calculateH2HEloChange,
} from "@/lib/shared/elo-calculator";
import {
  getEloStandingsSchema,
  getParticipantEloHistorySchema,
} from "@/validators/elo-ratings";

import type { ServiceResult } from "./shared";

type MatchWithRelations = Match & {
  gameType: GameType;
  participants: Array<
    MatchParticipant & {
      user: User | null;
      team: Team | null;
      placeholderMember: PlaceholderMember | null;
    }
  >;
};

export async function updateEloRatingsForMatch(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<ServiceResult<void>> {
  try {
    const match = await dbOrTx.query.match.findFirst({
      where: (match, { eq }) => eq(match.id, matchId),
      with: {
        gameType: true,
        participants: {
          with: {
            user: true,
            team: true,
            placeholderMember: true,
          },
        },
      },
    });
    if (!match) {
      return { error: "Match not found" };
    }

    if (
      match.gameType.category !== GameCategory.HEAD_TO_HEAD &&
      match.gameType.category !== GameCategory.FREE_FOR_ALL
    ) {
      return { data: undefined };
    }

    if (match.gameType.category === GameCategory.HEAD_TO_HEAD) {
      return await updateH2HEloRatings(match, matchId, dbOrTx);
    } else {
      return await updateFFAEloRatings(match, matchId, dbOrTx);
    }
  } catch (error) {
    console.error("Error updating ELO ratings:", error);
    return { error: "Failed to update ELO ratings" };
  }
}

async function updateH2HEloRatings(
  match: MatchWithRelations,
  matchId: string,
  dbOrTx: DBOrTx,
): Promise<ServiceResult<void>> {
  const processEloUpdates = async (tx: DBOrTx) => {
    if (match.participants.length !== 2) {
      return { error: "H2H matches must have exactly 2 participants" };
    }

    const [p1, p2] = match.participants;

    const p1Rating = await getOrCreateEloRating(
      {
        gameTypeId: match.gameTypeId,
        leagueId: match.leagueId,
        userId: p1.userId ?? undefined,
        teamId: p1.teamId ?? undefined,
        placeholderMemberId: p1.placeholderMemberId ?? undefined,
      },
      tx,
    );

    const p2Rating = await getOrCreateEloRating(
      {
        gameTypeId: match.gameTypeId,
        leagueId: match.leagueId,
        userId: p2.userId ?? undefined,
        teamId: p2.teamId ?? undefined,
        placeholderMemberId: p2.placeholderMemberId ?? undefined,
      },
      tx,
    );

    let p1ActualScore: number;
    let p2ActualScore: number;

    if (p1.result === MatchResult.WIN) {
      p1ActualScore = 1.0;
      p2ActualScore = 0.0;
    } else if (p1.result === MatchResult.LOSS) {
      p1ActualScore = 0.0;
      p2ActualScore = 1.0;
    } else {
      p1ActualScore = 0.5;
      p2ActualScore = 0.5;
    }

    const p1Change = calculateH2HEloChange(
      p1Rating.rating,
      p1Rating.matchesPlayed,
      p2Rating.rating,
      p1ActualScore,
    );

    const p2Change = calculateH2HEloChange(
      p2Rating.rating,
      p2Rating.matchesPlayed,
      p1Rating.rating,
      p2ActualScore,
    );

    const newP1Rating = p1Rating.rating + p1Change.ratingChange;
    const newP2Rating = p2Rating.rating + p2Change.ratingChange;

    await updateEloRating(p1Rating.id, newP1Rating, tx);
    await updateEloRating(p2Rating.id, newP2Rating, tx);

    const p1History: NewEloHistory = {
      eloRatingId: p1Rating.id,
      matchId,
      ratingBefore: p1Rating.rating,
      ratingAfter: newP1Rating,
      ratingChange: p1Change.ratingChange,
      kFactor: p1Change.kFactor,
      opponentRatingAvg: p1Change.opponentRating,
      expectedScore: p1Change.expectedScore,
      actualScore: p1Change.actualScore,
    };

    const p2History: NewEloHistory = {
      eloRatingId: p2Rating.id,
      matchId,
      ratingBefore: p2Rating.rating,
      ratingAfter: newP2Rating,
      ratingChange: p2Change.ratingChange,
      kFactor: p2Change.kFactor,
      opponentRatingAvg: p2Change.opponentRating,
      expectedScore: p2Change.expectedScore,
      actualScore: p2Change.actualScore,
    };

    await createEloHistoryEntry(p1History, tx);
    await createEloHistoryEntry(p2History, tx);

    return { data: undefined };
  };

  if (dbOrTx === db) {
    return withTransaction(processEloUpdates);
  }
  return processEloUpdates(dbOrTx);
}

async function updateFFAEloRatings(
  match: MatchWithRelations,
  matchId: string,
  dbOrTx: DBOrTx,
): Promise<ServiceResult<void>> {
  const processEloUpdates = async (tx: DBOrTx) => {
    if (match.participants.length < 2) {
      return { error: "FFA matches must have at least 2 participants" };
    }

    if (match.participants.some((p) => p.rank === null)) {
      return { error: "All FFA participants must have a rank" };
    }

    const participantRatings = await Promise.all(
      match.participants.map(async (p) => {
        const rating = await getOrCreateEloRating(
          {
            gameTypeId: match.gameTypeId,
            leagueId: match.leagueId,
            userId: p.userId ?? undefined,
            teamId: p.teamId ?? undefined,
            placeholderMemberId: p.placeholderMemberId ?? undefined,
          },
          tx,
        );
        return {
          participant: p,
          rating,
        };
      }),
    );

    const ffaParticipants: FFAParticipant[] = participantRatings.map(
      ({ participant, rating }) => ({
        rating: rating.rating,
        matchesPlayed: rating.matchesPlayed,
        rank: participant.rank!,
      }),
    );

    const eloChanges = calculateFFAEloChanges(ffaParticipants);

    for (let i = 0; i < participantRatings.length; i++) {
      const { rating } = participantRatings[i];
      const change = eloChanges[i];

      const newRating = rating.rating + change.ratingChange;
      await updateEloRating(rating.id, newRating, tx);

      const historyEntry: NewEloHistory = {
        eloRatingId: rating.id,
        matchId,
        ratingBefore: rating.rating,
        ratingAfter: newRating,
        ratingChange: change.ratingChange,
        kFactor: change.kFactor,
        opponentRatingAvg: change.opponentRatingAvg,
        expectedScore: change.expectedScore,
        actualScore: change.actualScore,
      };

      await createEloHistoryEntry(historyEntry, tx);
    }

    return { data: undefined };
  };

  if (dbOrTx === db) {
    return withTransaction(processEloUpdates);
  }
  return processEloUpdates(dbOrTx);
}

export async function getGameTypeEloStandings(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EloStanding[]>> {
  const validation = getEloStandingsSchema.safeParse(input);
  if (!validation.success) {
    return { error: "Invalid input" };
  }

  const { gameTypeId, limit, offset } = validation.data;

  try {
    const gameType = await db.query.gameType.findFirst({
      where: (gt, { eq }) => eq(gt.id, gameTypeId),
      with: {
        league: {
          with: {
            members: {
              where: (lm, { eq }) => eq(lm.userId, userId),
            },
          },
        },
      },
    });

    if (!gameType) {
      return { error: "Game type not found" };
    }

    if (gameType.league.members.length === 0) {
      return { error: "Not a member of this league" };
    }

    if (
      gameType.category !== GameCategory.HEAD_TO_HEAD &&
      gameType.category !== GameCategory.FREE_FOR_ALL
    ) {
      return { error: "ELO standings only available for H2H and FFA games" };
    }

    const standings = await getEloStandingsByGameType(gameTypeId, {
      limit,
      offset,
    });

    return { data: standings };
  } catch (error) {
    console.error("Error fetching ELO standings:", error);
    return { error: "Failed to fetch standings" };
  }
}

export async function getParticipantEloHistory(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EloHistory[]>> {
  const validation = getParticipantEloHistorySchema.safeParse(input);
  if (!validation.success) {
    return { error: "Invalid input" };
  }

  const {
    gameTypeId,
    userId: participantUserId,
    teamId,
    placeholderMemberId,
    limit,
    offset,
  } = validation.data;

  try {
    const gameType = await db.query.gameType.findFirst({
      where: (gt, { eq }) => eq(gt.id, gameTypeId),
      with: {
        league: {
          with: {
            members: {
              where: (lm, { eq }) => eq(lm.userId, userId),
            },
          },
        },
      },
    });

    if (!gameType) {
      return { error: "Game type not found" };
    }

    if (gameType.league.members.length === 0) {
      return { error: "Not a member of this league" };
    }

    const rating = await db.query.eloRating.findFirst({
      where: (er, { eq, and, sql }) =>
        and(
          eq(er.gameTypeId, gameTypeId),
          participantUserId
            ? eq(er.userId, participantUserId)
            : sql`${er.userId} IS NULL`,
          teamId ? eq(er.teamId, teamId) : sql`${er.teamId} IS NULL`,
          placeholderMemberId
            ? eq(er.placeholderMemberId, placeholderMemberId)
            : sql`${er.placeholderMemberId} IS NULL`,
        ),
    });
    if (!rating) {
      return { data: [] };
    }

    const history = await getEloHistoryByRatingId(rating.id, { limit, offset });

    return { data: history };
  } catch (error) {
    console.error("Error fetching ELO history:", error);
    return { error: "Failed to fetch history" };
  }
}

export async function getParticipantEloRating(
  userId: string,
  gameTypeId: string,
  participantUserId?: string,
  teamId?: string,
  placeholderMemberId?: string,
): Promise<
  ServiceResult<{
    rating: number;
    matchesPlayed: number;
    rank: number | null;
    isProvisional: boolean;
  }>
> {
  try {
    const gameType = await db.query.gameType.findFirst({
      where: (gt, { eq }) => eq(gt.id, gameTypeId),
      with: {
        league: {
          with: {
            members: {
              where: (lm, { eq }) => eq(lm.userId, userId),
            },
          },
        },
      },
    });

    if (!gameType) {
      return { error: "Game type not found" };
    }

    if (gameType.league.members.length === 0) {
      return { error: "Not a member of this league" };
    }

    const rating = await db.query.eloRating.findFirst({
      where: (er, { eq, and, sql }) =>
        and(
          eq(er.gameTypeId, gameTypeId),
          participantUserId
            ? eq(er.userId, participantUserId)
            : sql`${er.userId} IS NULL`,
          teamId ? eq(er.teamId, teamId) : sql`${er.teamId} IS NULL`,
          placeholderMemberId
            ? eq(er.placeholderMemberId, placeholderMemberId)
            : sql`${er.placeholderMemberId} IS NULL`,
        ),
    });

    if (!rating) {
      return {
        data: {
          rating: 1200,
          matchesPlayed: 0,
          rank: null,
          isProvisional: true,
        },
      };
    }

    const rank = await getParticipantEloRank({
      gameTypeId,
      userId: participantUserId,
      teamId,
      placeholderMemberId,
    });

    return {
      data: {
        rating: rating.rating,
        matchesPlayed: rating.matchesPlayed,
        rank,
        isProvisional: rating.matchesPlayed < 10,
      },
    };
  } catch (error) {
    console.error("Error fetching participant ELO rating:", error);
    return { error: "Failed to fetch rating" };
  }
}
