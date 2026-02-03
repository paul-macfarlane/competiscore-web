import { ELO_CONSTANTS } from "@/lib/shared/constants";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";

import { db } from "./index";
import type { DBOrTx } from "./index";
import {
  type EloHistory,
  type EloRating,
  type NewEloHistory,
  type NewEloRating,
  eloHistory,
  eloHistoryColumns,
  eloRating,
  eloRatingColumns,
  placeholderMember,
  placeholderMemberColumns,
  team,
  teamColumns,
  user,
  userColumns,
} from "./schema";

export async function getOrCreateEloRating(
  params: {
    gameTypeId: string;
    leagueId: string;
    userId?: string;
    teamId?: string;
    placeholderMemberId?: string;
  },
  dbOrTx: DBOrTx = db,
): Promise<EloRating> {
  const { gameTypeId, leagueId, userId, teamId, placeholderMemberId } = params;

  const whereConditions = [
    eq(eloRating.gameTypeId, gameTypeId),
    userId ? eq(eloRating.userId, userId) : sql`${eloRating.userId} IS NULL`,
    teamId ? eq(eloRating.teamId, teamId) : sql`${eloRating.teamId} IS NULL`,
    placeholderMemberId
      ? eq(eloRating.placeholderMemberId, placeholderMemberId)
      : sql`${eloRating.placeholderMemberId} IS NULL`,
  ];

  const existing = await dbOrTx.query.eloRating.findFirst({
    where: and(...whereConditions),
  });

  if (existing) {
    return existing;
  }

  const newRating: NewEloRating = {
    gameTypeId,
    leagueId,
    userId,
    teamId,
    placeholderMemberId,
    rating: ELO_CONSTANTS.STARTING_ELO,
    matchesPlayed: 0,
  };

  const [created] = await dbOrTx
    .insert(eloRating)
    .values(newRating)
    .returning();

  return created;
}

export async function getEloRatingByParticipant(
  params: {
    gameTypeId: string;
    userId?: string;
    teamId?: string;
    placeholderMemberId?: string;
  },
  dbOrTx: DBOrTx = db,
): Promise<EloRating | undefined> {
  const { gameTypeId, userId, teamId, placeholderMemberId } = params;

  const whereConditions = [
    eq(eloRating.gameTypeId, gameTypeId),
    userId ? eq(eloRating.userId, userId) : sql`${eloRating.userId} IS NULL`,
    teamId ? eq(eloRating.teamId, teamId) : sql`${eloRating.teamId} IS NULL`,
    placeholderMemberId
      ? eq(eloRating.placeholderMemberId, placeholderMemberId)
      : sql`${eloRating.placeholderMemberId} IS NULL`,
  ];

  return await dbOrTx.query.eloRating.findFirst({
    where: and(...whereConditions),
  });
}

export async function updateEloRating(
  eloRatingId: string,
  newRating: number,
  dbOrTx: DBOrTx = db,
): Promise<EloRating> {
  const [updated] = await dbOrTx
    .update(eloRating)
    .set({
      rating: newRating,
      matchesPlayed: sql`${eloRating.matchesPlayed} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(eloRating.id, eloRatingId))
    .returning();

  return updated;
}

export async function createEloHistoryEntry(
  entry: NewEloHistory,
  dbOrTx: DBOrTx = db,
): Promise<EloHistory> {
  const [created] = await dbOrTx.insert(eloHistory).values(entry).returning();
  return created;
}

export async function getEloHistoryByRatingId(
  eloRatingId: string,
  params: { limit?: number; offset?: number } = {},
  dbOrTx: DBOrTx = db,
): Promise<EloHistory[]> {
  const { limit = 50, offset = 0 } = params;

  return await dbOrTx
    .select()
    .from(eloHistory)
    .where(eq(eloHistory.eloRatingId, eloRatingId))
    .orderBy(desc(eloHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

export interface EloStanding {
  rank: number;
  eloRatingId: string;
  rating: number;
  matchesPlayed: number;
  userId: string | null;
  userName: string | null;
  userUsername: string | null;
  userImage: string | null;
  teamId: string | null;
  teamName: string | null;
  teamLogo: string | null;
  placeholderMemberId: string | null;
  placeholderDisplayName: string | null;
}

export async function getEloStandingsByGameType(
  gameTypeId: string,
  params: { limit?: number; offset?: number } = {},
  dbOrTx: DBOrTx = db,
): Promise<EloStanding[]> {
  const { limit = 50, offset = 0 } = params;

  const results = await dbOrTx
    .select({
      eloRatingId: eloRatingColumns.id,
      rating: eloRatingColumns.rating,
      matchesPlayed: eloRatingColumns.matchesPlayed,
      userId: eloRatingColumns.userId,
      userName: userColumns.name,
      userUsername: userColumns.username,
      userImage: userColumns.image,
      teamId: eloRatingColumns.teamId,
      teamName: teamColumns.name,
      teamLogo: teamColumns.logo,
      placeholderMemberId: eloRatingColumns.placeholderMemberId,
      placeholderDisplayName: placeholderMemberColumns.displayName,
    })
    .from(eloRating)
    .leftJoin(user, eq(eloRating.userId, user.id))
    .leftJoin(team, eq(eloRating.teamId, team.id))
    .leftJoin(
      placeholderMember,
      eq(eloRating.placeholderMemberId, placeholderMember.id),
    )
    .where(eq(eloRating.gameTypeId, gameTypeId))
    .orderBy(desc(eloRating.rating), desc(eloRating.matchesPlayed))
    .limit(limit)
    .offset(offset);

  return results.map((row, index) => ({
    rank: offset + index + 1,
    ...row,
  }));
}

export async function getParticipantEloRank(
  params: {
    gameTypeId: string;
    userId?: string;
    teamId?: string;
    placeholderMemberId?: string;
  },
  dbOrTx: DBOrTx = db,
): Promise<number | null> {
  const { gameTypeId, userId, teamId, placeholderMemberId } = params;

  const participantRating = await getEloRatingByParticipant(
    { gameTypeId, userId, teamId, placeholderMemberId },
    dbOrTx,
  );

  if (!participantRating) {
    return null;
  }

  const [result] = await dbOrTx
    .select({ rank: sql<number>`count(*)::int + 1` })
    .from(eloRating)
    .where(
      and(
        eq(eloRating.gameTypeId, gameTypeId),
        or(
          sql`${eloRating.rating} > ${participantRating.rating}`,
          and(
            sql`${eloRating.rating} = ${participantRating.rating}`,
            sql`${eloRating.matchesPlayed} > ${participantRating.matchesPlayed}`,
          ),
        ),
      ),
    );

  return result?.rank ?? null;
}
