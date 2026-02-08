import { MatchStatus } from "@/lib/shared/constants";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  Match,
  MatchParticipant,
  NewMatch,
  NewMatchParticipant,
  gameType,
  league,
  match,
  matchColumns,
  matchParticipant,
  matchParticipantColumns,
  placeholderMember,
  team,
  user,
} from "./schema";

export async function createMatch(
  data: Omit<NewMatch, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<Match> {
  const result = await dbOrTx.insert(match).values(data).returning();
  return result[0];
}

export async function createMatchParticipants(
  participants: Omit<NewMatchParticipant, "id" | "createdAt">[],
  dbOrTx: DBOrTx = db,
): Promise<MatchParticipant[]> {
  if (participants.length === 0) return [];
  return await dbOrTx.insert(matchParticipant).values(participants).returning();
}

export async function getMatchById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Match | undefined> {
  const result = await dbOrTx
    .select()
    .from(match)
    .where(eq(match.id, id))
    .limit(1);
  return result[0];
}

export type MatchParticipantWithDetails = MatchParticipant & {
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  team: { id: string; name: string; logo: string | null } | null;
  placeholderMember: { id: string; displayName: string } | null;
};

export async function getMatchParticipants(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<MatchParticipantWithDetails[]> {
  const result = await dbOrTx
    .select({
      ...matchParticipantColumns,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      team: {
        id: team.id,
        name: team.name,
        logo: team.logo,
      },
      placeholderMember: {
        id: placeholderMember.id,
        displayName: placeholderMember.displayName,
      },
    })
    .from(matchParticipant)
    .leftJoin(user, eq(matchParticipant.userId, user.id))
    .leftJoin(team, eq(matchParticipant.teamId, team.id))
    .leftJoin(
      placeholderMember,
      eq(matchParticipant.placeholderMemberId, placeholderMember.id),
    )
    .where(eq(matchParticipant.matchId, matchId))
    .orderBy(matchParticipant.side, matchParticipant.rank);

  return result;
}

export type MatchWithParticipants = Match & {
  participants: MatchParticipantWithDetails[];
};

export async function getMatchWithParticipants(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<MatchWithParticipants | undefined> {
  const matchData = await getMatchById(matchId, dbOrTx);
  if (!matchData) return undefined;

  const participants = await getMatchParticipants(matchId, dbOrTx);

  return {
    ...matchData,
    participants,
  };
}

export async function getMatchesByGameTypeId(
  gameTypeId: string,
  options: { limit?: number; offset?: number; status?: string } = {},
  dbOrTx: DBOrTx = db,
): Promise<Match[]> {
  const { limit = 50, offset = 0, status } = options;

  const conditions = [eq(match.gameTypeId, gameTypeId)];
  if (status) {
    conditions.push(eq(match.status, status as Match["status"]));
  }

  return await dbOrTx
    .select()
    .from(match)
    .where(and(...conditions))
    .orderBy(desc(match.playedAt))
    .limit(limit)
    .offset(offset);
}

export async function getMatchesByLeagueId(
  leagueId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    gameTypeId?: string;
  } = {},
  dbOrTx: DBOrTx = db,
): Promise<Match[]> {
  const { limit = 50, offset = 0, status, gameTypeId } = options;

  const conditions = [eq(match.leagueId, leagueId)];
  if (status) {
    conditions.push(eq(match.status, status as Match["status"]));
  }
  if (gameTypeId) {
    conditions.push(eq(match.gameTypeId, gameTypeId));
  }

  return await dbOrTx
    .select()
    .from(match)
    .where(and(...conditions))
    .orderBy(desc(match.playedAt))
    .limit(limit)
    .offset(offset);
}

export async function countMatchesByLeagueId(
  leagueId: string,
  options: {
    status?: string;
    gameTypeId?: string;
    excludeArchivedGameTypes?: boolean;
  } = {},
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const { status, gameTypeId, excludeArchivedGameTypes = false } = options;

  const conditions = [eq(match.leagueId, leagueId)];
  if (status) {
    conditions.push(eq(match.status, status as Match["status"]));
  }
  if (gameTypeId) {
    conditions.push(eq(match.gameTypeId, gameTypeId));
  }

  const query = dbOrTx.select({ count: sql<number>`count(*)` }).from(match);

  if (excludeArchivedGameTypes) {
    conditions.push(eq(gameType.isArchived, false));
    const result = await query
      .innerJoin(gameType, eq(match.gameTypeId, gameType.id))
      .where(and(...conditions));
    return Number(result[0]?.count ?? 0);
  }

  const result = await query.where(and(...conditions));
  return Number(result[0]?.count ?? 0);
}

export async function getMatchesByUserParticipation(
  userId: string,
  leagueId: string,
  options: { limit?: number; offset?: number } = {},
  dbOrTx: DBOrTx = db,
): Promise<Match[]> {
  const { limit = 50, offset = 0 } = options;

  const participantMatchIds = dbOrTx
    .select({ matchId: matchParticipant.matchId })
    .from(matchParticipant)
    .where(eq(matchParticipant.userId, userId));

  return await dbOrTx
    .select()
    .from(match)
    .where(
      and(eq(match.leagueId, leagueId), inArray(match.id, participantMatchIds)),
    )
    .orderBy(desc(match.playedAt))
    .limit(limit)
    .offset(offset);
}

export async function updateMatchStatus(
  matchId: string,
  status: Match["status"],
  timestamps: Partial<
    Pick<Match, "acceptedAt" | "declinedAt" | "cancelledAt">
  > = {},
  dbOrTx: DBOrTx = db,
): Promise<Match | undefined> {
  const result = await dbOrTx
    .update(match)
    .set({ status, ...timestamps })
    .where(eq(match.id, matchId))
    .returning();
  return result[0];
}

export async function updateMatchForChallengeResult(
  matchId: string,
  playedAt: Date,
  dbOrTx: DBOrTx = db,
): Promise<Match | undefined> {
  const result = await dbOrTx
    .update(match)
    .set({ status: "completed", playedAt })
    .where(eq(match.id, matchId))
    .returning();
  return result[0];
}

export async function updateMatchParticipantResults(
  matchId: string,
  updates: {
    participantId: string;
    result?: string;
    score?: number;
    rank?: number;
  }[],
  dbOrTx: DBOrTx = db,
): Promise<void> {
  for (const update of updates) {
    await dbOrTx
      .update(matchParticipant)
      .set({
        result: update.result as MatchParticipant["result"],
        score: update.score,
        rank: update.rank,
      })
      .where(
        and(
          eq(matchParticipant.id, update.participantId),
          eq(matchParticipant.matchId, matchId),
        ),
      );
  }
}

export async function getPendingChallengesForUser(
  userId: string,
  leagueId: string | null,
  options?: { limit?: number; offset?: number },
  dbOrTx: DBOrTx = db,
): Promise<Match[]> {
  const challengedMatchIds = dbOrTx
    .select({ matchId: matchParticipant.matchId })
    .from(matchParticipant)
    .where(
      and(
        eq(matchParticipant.userId, userId),
        eq(matchParticipant.isChallenged, true),
      ),
    );

  const conditions = [
    eq(match.status, MatchStatus.PENDING),
    inArray(match.id, challengedMatchIds),
  ];

  if (leagueId !== null) {
    conditions.push(eq(match.leagueId, leagueId));
  }

  let query = dbOrTx
    .select()
    .from(match)
    .where(and(...conditions))
    .orderBy(desc(match.challengedAt))
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  return await query;
}

export async function countPendingChallengesForUser(
  userId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const challengedMatchIds = dbOrTx
    .select({ matchId: matchParticipant.matchId })
    .from(matchParticipant)
    .where(
      and(
        eq(matchParticipant.userId, userId),
        eq(matchParticipant.isChallenged, true),
      ),
    );

  const result = await dbOrTx
    .select({ count: count() })
    .from(match)
    .where(
      and(
        eq(match.status, MatchStatus.PENDING),
        eq(match.leagueId, leagueId),
        inArray(match.id, challengedMatchIds),
      ),
    );
  return result[0].count;
}

export type PendingChallengeWithDetails = Match & {
  league: {
    id: string;
    name: string;
  };
  gameType: {
    id: string;
    name: string;
  };
  challenger: {
    id: string;
    name: string;
  };
};

export async function getPendingChallengesWithDetailsForUser(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<PendingChallengeWithDetails[]> {
  const challengedMatchIds = dbOrTx
    .select({ matchId: matchParticipant.matchId })
    .from(matchParticipant)
    .where(
      and(
        eq(matchParticipant.userId, userId),
        eq(matchParticipant.isChallenged, true),
      ),
    );

  const results = await dbOrTx
    .select({
      ...matchColumns,
      league: {
        id: league.id,
        name: league.name,
      },
      gameType: {
        id: gameType.id,
        name: gameType.name,
      },
      challenger: {
        id: user.id,
        name: user.name,
      },
    })
    .from(match)
    .innerJoin(league, eq(match.leagueId, league.id))
    .innerJoin(gameType, eq(match.gameTypeId, gameType.id))
    .innerJoin(user, eq(match.challengerId, user.id))
    .where(
      and(eq(match.status, "pending"), inArray(match.id, challengedMatchIds)),
    )
    .orderBy(desc(match.challengedAt));

  return results;
}

export async function getSentChallengesByUser(
  userId: string,
  leagueId: string,
  options?: { limit?: number; offset?: number },
  dbOrTx: DBOrTx = db,
): Promise<Match[]> {
  let query = dbOrTx
    .select()
    .from(match)
    .where(
      and(
        eq(match.leagueId, leagueId),
        eq(match.challengerId, userId),
        inArray(match.status, ["pending", "accepted"]),
      ),
    )
    .orderBy(desc(match.challengedAt))
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  return await query;
}

export async function countSentChallengesByUser(
  userId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(match)
    .where(
      and(
        eq(match.leagueId, leagueId),
        eq(match.challengerId, userId),
        inArray(match.status, ["pending", "accepted"]),
      ),
    );
  return result[0].count;
}

export async function getMatchCountByGameTypeId(
  gameTypeId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: sql<number>`count(*)::int` })
    .from(match)
    .where(
      and(eq(match.gameTypeId, gameTypeId), eq(match.status, "completed")),
    );
  return result[0].count;
}

export type MatchWithGameType = Match & {
  gameType: { id: string; name: string; category: string } | null;
};

export async function getMatchesWithGameTypeByLeagueId(
  leagueId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    gameTypeId?: string;
    excludeArchivedGameTypes?: boolean;
  } = {},
  dbOrTx: DBOrTx = db,
): Promise<MatchWithGameType[]> {
  const {
    limit = 50,
    offset = 0,
    status,
    gameTypeId: filterGameTypeId,
    excludeArchivedGameTypes = false,
  } = options;

  const conditions = [eq(match.leagueId, leagueId)];
  if (status) {
    conditions.push(eq(match.status, status as Match["status"]));
  }
  if (filterGameTypeId) {
    conditions.push(eq(match.gameTypeId, filterGameTypeId));
  }
  if (excludeArchivedGameTypes) {
    conditions.push(eq(gameType.isArchived, false));
  }

  const result = await dbOrTx
    .select({
      ...matchColumns,
      gameType: {
        id: gameType.id,
        name: gameType.name,
        category: gameType.category,
      },
    })
    .from(match)
    .leftJoin(gameType, eq(match.gameTypeId, gameType.id))
    .where(and(...conditions))
    .orderBy(desc(match.playedAt))
    .limit(limit)
    .offset(offset);

  return result;
}
