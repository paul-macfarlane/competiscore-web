import { TournamentStatus } from "@/lib/shared/constants";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  NewTournament,
  NewTournamentParticipant,
  NewTournamentRoundMatch,
  Tournament,
  TournamentParticipant,
  TournamentRoundMatch,
  gameType,
  matchParticipant,
  placeholderMember,
  team,
  tournament,
  tournamentColumns,
  tournamentParticipant,
  tournamentParticipantColumns,
  tournamentRoundMatch,
  user,
} from "./schema";

export async function createTournament(
  data: Omit<NewTournament, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<Tournament> {
  const result = await dbOrTx.insert(tournament).values(data).returning();
  return result[0];
}

export async function getTournamentById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Tournament | undefined> {
  const result = await dbOrTx
    .select()
    .from(tournament)
    .where(eq(tournament.id, id))
    .limit(1);
  return result[0];
}

export type TournamentWithDetails = Tournament & {
  gameType: {
    id: string;
    name: string;
    category: string;
    config: string;
    logo: string | null;
  };
  createdBy: { id: string; name: string; username: string };
  participantCount: number;
};

export async function getTournamentWithDetails(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TournamentWithDetails | undefined> {
  const participantCountSq = dbOrTx
    .select({
      tournamentId: tournamentParticipant.tournamentId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(tournamentParticipant)
    .groupBy(tournamentParticipant.tournamentId)
    .as("participant_count");

  const result = await dbOrTx
    .select({
      ...tournamentColumns,
      gameType: {
        id: gameType.id,
        name: gameType.name,
        category: gameType.category,
        config: gameType.config,
        logo: gameType.logo,
      },
      createdBy: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      participantCount: sql<number>`coalesce(${participantCountSq.count}, 0)`,
    })
    .from(tournament)
    .innerJoin(gameType, eq(tournament.gameTypeId, gameType.id))
    .innerJoin(user, eq(tournament.createdById, user.id))
    .leftJoin(
      participantCountSq,
      eq(tournament.id, participantCountSq.tournamentId),
    )
    .where(eq(tournament.id, id))
    .limit(1);

  return result[0] as TournamentWithDetails | undefined;
}

export async function getTournamentsByLeagueId(
  leagueId: string,
  options?: {
    statuses?: TournamentStatus[];
    limit?: number;
    offset?: number;
  },
  dbOrTx: DBOrTx = db,
): Promise<TournamentWithDetails[]> {
  const participantCountSq = dbOrTx
    .select({
      tournamentId: tournamentParticipant.tournamentId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(tournamentParticipant)
    .groupBy(tournamentParticipant.tournamentId)
    .as("participant_count");

  const conditions = [eq(tournament.leagueId, leagueId)];
  if (options?.statuses && options.statuses.length > 0) {
    conditions.push(inArray(tournament.status, options.statuses));
  }

  let query = dbOrTx
    .select({
      ...tournamentColumns,
      gameType: {
        id: gameType.id,
        name: gameType.name,
        category: gameType.category,
        config: gameType.config,
        logo: gameType.logo,
      },
      createdBy: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      participantCount: sql<number>`coalesce(${participantCountSq.count}, 0)`,
    })
    .from(tournament)
    .innerJoin(gameType, eq(tournament.gameTypeId, gameType.id))
    .innerJoin(user, eq(tournament.createdById, user.id))
    .leftJoin(
      participantCountSq,
      eq(tournament.id, participantCountSq.tournamentId),
    )
    .where(and(...conditions))
    .orderBy(desc(tournament.createdAt))
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  const result = await query;
  return result as TournamentWithDetails[];
}

export async function countTournamentsByLeagueIdAndStatus(
  leagueId: string,
  statuses: TournamentStatus[],
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const conditions = [eq(tournament.leagueId, leagueId)];
  if (statuses.length > 0) {
    conditions.push(inArray(tournament.status, statuses));
  }
  const result = await dbOrTx
    .select({ count: count() })
    .from(tournament)
    .where(and(...conditions));
  return result[0].count;
}

export async function updateTournament(
  id: string,
  data: Partial<
    Pick<
      Tournament,
      | "name"
      | "description"
      | "logo"
      | "seedingType"
      | "startDate"
      | "status"
      | "totalRounds"
      | "completedAt"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<Tournament | undefined> {
  const result = await dbOrTx
    .update(tournament)
    .set(data)
    .where(eq(tournament.id, id))
    .returning();
  return result[0];
}

export async function checkTournamentNameExists(
  leagueId: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(tournament.leagueId, leagueId),
    sql`lower(${tournament.name}) = lower(${name})`,
  ];
  if (excludeId) {
    conditions.push(sql`${tournament.id} != ${excludeId}`);
  }
  const result = await dbOrTx
    .select({ count: count() })
    .from(tournament)
    .where(and(...conditions));
  return result[0].count > 0;
}

export async function countTournamentsByLeagueId(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(tournament)
    .where(eq(tournament.leagueId, leagueId));
  return result[0].count;
}

export async function deleteTournament(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(tournament)
    .where(eq(tournament.id, id))
    .returning({ id: tournament.id });
  return result.length > 0;
}

export async function addTournamentParticipant(
  data: Omit<NewTournamentParticipant, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<TournamentParticipant> {
  const result = await dbOrTx
    .insert(tournamentParticipant)
    .values(data)
    .returning();
  return result[0];
}

export async function removeTournamentParticipant(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(tournamentParticipant)
    .where(eq(tournamentParticipant.id, id))
    .returning({ id: tournamentParticipant.id });
  return result.length > 0;
}

export type TournamentParticipantWithDetails = TournamentParticipant & {
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  team: { id: string; name: string; logo: string | null } | null;
  placeholderMember: { id: string; displayName: string } | null;
};

export async function getTournamentParticipants(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<TournamentParticipantWithDetails[]> {
  const result = await dbOrTx
    .select({
      ...tournamentParticipantColumns,
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
    .from(tournamentParticipant)
    .leftJoin(user, eq(tournamentParticipant.userId, user.id))
    .leftJoin(team, eq(tournamentParticipant.teamId, team.id))
    .leftJoin(
      placeholderMember,
      eq(tournamentParticipant.placeholderMemberId, placeholderMember.id),
    )
    .where(eq(tournamentParticipant.tournamentId, tournamentId))
    .orderBy(tournamentParticipant.seed, tournamentParticipant.createdAt);

  return result;
}

export async function getTournamentParticipantById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TournamentParticipant | undefined> {
  const result = await dbOrTx
    .select()
    .from(tournamentParticipant)
    .where(eq(tournamentParticipant.id, id))
    .limit(1);
  return result[0];
}

export async function bulkUpdateParticipantSeeds(
  updates: { id: string; seed: number }[],
  dbOrTx: DBOrTx = db,
): Promise<void> {
  for (const update of updates) {
    await dbOrTx
      .update(tournamentParticipant)
      .set({ seed: update.seed })
      .where(eq(tournamentParticipant.id, update.id));
  }
}

export async function updateTournamentParticipant(
  id: string,
  data: Partial<
    Pick<
      TournamentParticipant,
      "seed" | "isEliminated" | "eliminatedInRound" | "finalPlacement"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(tournamentParticipant)
    .set(data)
    .where(eq(tournamentParticipant.id, id));
}

export async function countTournamentParticipants(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(tournamentParticipant)
    .where(eq(tournamentParticipant.tournamentId, tournamentId));
  return result[0].count;
}

export async function checkParticipantInTournament(
  tournamentId: string,
  participant: {
    userId?: string;
    teamId?: string;
    placeholderMemberId?: string;
  },
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [eq(tournamentParticipant.tournamentId, tournamentId)];

  if (participant.userId) {
    conditions.push(eq(tournamentParticipant.userId, participant.userId));
  } else if (participant.teamId) {
    conditions.push(eq(tournamentParticipant.teamId, participant.teamId));
  } else if (participant.placeholderMemberId) {
    conditions.push(
      eq(
        tournamentParticipant.placeholderMemberId,
        participant.placeholderMemberId,
      ),
    );
  }

  const result = await dbOrTx
    .select({ count: count() })
    .from(tournamentParticipant)
    .where(and(...conditions));
  return result[0].count > 0;
}

export async function createTournamentRoundMatches(
  matches: Omit<NewTournamentRoundMatch, "id" | "createdAt" | "updatedAt">[],
  dbOrTx: DBOrTx = db,
): Promise<TournamentRoundMatch[]> {
  if (matches.length === 0) return [];
  return await dbOrTx.insert(tournamentRoundMatch).values(matches).returning();
}

export type TournamentRoundMatchWithDetails = TournamentRoundMatch & {
  participant1: TournamentParticipantWithDetails | null;
  participant2: TournamentParticipantWithDetails | null;
  winner: TournamentParticipantWithDetails | null;
  participant1Score: number | null;
  participant2Score: number | null;
};

export async function getTournamentBracket(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<TournamentRoundMatchWithDetails[]> {
  const roundMatches = await dbOrTx
    .select()
    .from(tournamentRoundMatch)
    .where(eq(tournamentRoundMatch.tournamentId, tournamentId))
    .orderBy(tournamentRoundMatch.round, tournamentRoundMatch.position);

  const participants = await getTournamentParticipants(tournamentId, dbOrTx);
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  const matchIds = roundMatches
    .map((rm) => rm.matchId)
    .filter((id): id is string => id !== null);

  const scoreMap = new Map<string, Map<number, number | null>>();
  if (matchIds.length > 0) {
    const matchParticipants = await dbOrTx
      .select({
        matchId: matchParticipant.matchId,
        side: matchParticipant.side,
        score: matchParticipant.score,
      })
      .from(matchParticipant)
      .where(inArray(matchParticipant.matchId, matchIds));

    for (const mp of matchParticipants) {
      if (!scoreMap.has(mp.matchId)) {
        scoreMap.set(mp.matchId, new Map());
      }
      if (mp.side !== null) {
        scoreMap.get(mp.matchId)!.set(mp.side, mp.score);
      }
    }
  }

  return roundMatches.map((rm) => {
    const scores = rm.matchId ? scoreMap.get(rm.matchId) : undefined;
    return {
      ...rm,
      participant1: rm.participant1Id
        ? (participantMap.get(rm.participant1Id) ?? null)
        : null,
      participant2: rm.participant2Id
        ? (participantMap.get(rm.participant2Id) ?? null)
        : null,
      winner: rm.winnerId ? (participantMap.get(rm.winnerId) ?? null) : null,
      participant1Score: scores?.get(1) ?? null,
      participant2Score: scores?.get(2) ?? null,
    };
  });
}

export async function getTournamentRoundMatchById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TournamentRoundMatch | undefined> {
  const result = await dbOrTx
    .select()
    .from(tournamentRoundMatch)
    .where(eq(tournamentRoundMatch.id, id))
    .limit(1);
  return result[0];
}

export async function updateTournamentRoundMatch(
  id: string,
  data: Partial<
    Pick<
      TournamentRoundMatch,
      | "participant1Id"
      | "participant2Id"
      | "winnerId"
      | "matchId"
      | "isBye"
      | "isForfeit"
      | "nextMatchId"
      | "nextMatchSlot"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<TournamentRoundMatch | undefined> {
  const result = await dbOrTx
    .update(tournamentRoundMatch)
    .set(data)
    .where(eq(tournamentRoundMatch.id, id))
    .returning();
  return result[0];
}

export async function getTournamentRoundMatchByPosition(
  tournamentId: string,
  round: number,
  position: number,
  dbOrTx: DBOrTx = db,
): Promise<TournamentRoundMatch | undefined> {
  const result = await dbOrTx
    .select()
    .from(tournamentRoundMatch)
    .where(
      and(
        eq(tournamentRoundMatch.tournamentId, tournamentId),
        eq(tournamentRoundMatch.round, round),
        eq(tournamentRoundMatch.position, position),
      ),
    )
    .limit(1);
  return result[0];
}

export type TournamentMatchInfo = {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentLogo: string | null;
  leagueId: string;
  round: number;
  totalRounds: number | null;
};

export async function getTournamentInfoByMatchIds(
  matchIds: string[],
  dbOrTx: DBOrTx = db,
): Promise<TournamentMatchInfo[]> {
  if (matchIds.length === 0) return [];

  const result = await dbOrTx
    .select({
      matchId: tournamentRoundMatch.matchId,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentLogo: tournament.logo,
      leagueId: tournament.leagueId,
      round: tournamentRoundMatch.round,
      totalRounds: tournament.totalRounds,
    })
    .from(tournamentRoundMatch)
    .innerJoin(tournament, eq(tournamentRoundMatch.tournamentId, tournament.id))
    .where(inArray(tournamentRoundMatch.matchId, matchIds));

  return result as TournamentMatchInfo[];
}
