import { ScoreOrder } from "@/lib/shared/constants";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  HighScoreEntry,
  NewHighScoreEntry,
  highScoreEntry,
  highScoreEntryColumns,
  placeholderMember,
  team,
  user,
} from "./schema";

export async function createHighScoreEntry(
  data: Omit<NewHighScoreEntry, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntry> {
  const result = await dbOrTx.insert(highScoreEntry).values(data).returning();
  return result[0];
}

export async function getHighScoreEntryById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntry | undefined> {
  const result = await dbOrTx
    .select()
    .from(highScoreEntry)
    .where(eq(highScoreEntry.id, id))
    .limit(1);
  return result[0];
}

export type HighScoreEntryWithDetails = HighScoreEntry & {
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  team: { id: string; name: string; logo: string | null } | null;
  placeholderMember: { id: string; displayName: string } | null;
};

export async function getHighScoreEntriesByGameTypeId(
  gameTypeId: string,
  options: {
    limit?: number;
    offset?: number;
    scoreOrder?: ScoreOrder;
    since?: Date;
    sortBy?: "score" | "date";
  } = {},
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntryWithDetails[]> {
  const {
    limit = 50,
    offset = 0,
    scoreOrder = ScoreOrder.HIGHEST_WINS,
    since,
    sortBy = "score",
  } = options;

  const conditions = [eq(highScoreEntry.gameTypeId, gameTypeId)];
  if (since) {
    conditions.push(gte(highScoreEntry.achievedAt, since));
  }

  const orderDirection =
    scoreOrder === ScoreOrder.HIGHEST_WINS
      ? desc(highScoreEntry.score)
      : asc(highScoreEntry.score);

  const query = dbOrTx
    .select({
      ...highScoreEntryColumns,
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
    .from(highScoreEntry)
    .leftJoin(user, eq(highScoreEntry.userId, user.id))
    .leftJoin(team, eq(highScoreEntry.teamId, team.id))
    .leftJoin(
      placeholderMember,
      eq(highScoreEntry.placeholderMemberId, placeholderMember.id),
    )
    .where(and(...conditions));

  const orderedQuery =
    sortBy === "date"
      ? query.orderBy(desc(highScoreEntry.achievedAt))
      : query.orderBy(orderDirection, desc(highScoreEntry.achievedAt));

  const result = await orderedQuery.limit(limit).offset(offset);

  return result;
}

export async function getPersonalBestByUser(
  userId: string,
  gameTypeId: string,
  scoreOrder: ScoreOrder = ScoreOrder.HIGHEST_WINS,
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntry | undefined> {
  const orderDirection =
    scoreOrder === ScoreOrder.HIGHEST_WINS
      ? desc(highScoreEntry.score)
      : asc(highScoreEntry.score);

  const result = await dbOrTx
    .select()
    .from(highScoreEntry)
    .where(
      and(
        eq(highScoreEntry.userId, userId),
        eq(highScoreEntry.gameTypeId, gameTypeId),
      ),
    )
    .orderBy(orderDirection)
    .limit(1);

  return result[0];
}

export async function getPersonalBestByTeam(
  teamId: string,
  gameTypeId: string,
  scoreOrder: ScoreOrder = ScoreOrder.HIGHEST_WINS,
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntry | undefined> {
  const orderDirection =
    scoreOrder === ScoreOrder.HIGHEST_WINS
      ? desc(highScoreEntry.score)
      : asc(highScoreEntry.score);

  const result = await dbOrTx
    .select()
    .from(highScoreEntry)
    .where(
      and(
        eq(highScoreEntry.teamId, teamId),
        eq(highScoreEntry.gameTypeId, gameTypeId),
      ),
    )
    .orderBy(orderDirection)
    .limit(1);

  return result[0];
}

export async function getHighScoreEntriesByLeagueId(
  leagueId: string,
  options: { limit?: number; offset?: number } = {},
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntry[]> {
  const { limit = 50, offset = 0 } = options;

  return await dbOrTx
    .select()
    .from(highScoreEntry)
    .where(eq(highScoreEntry.leagueId, leagueId))
    .orderBy(desc(highScoreEntry.achievedAt))
    .limit(limit)
    .offset(offset);
}

export type HighScoreEntryWithGameType = HighScoreEntryWithDetails & {
  gameType: { id: string; name: string; category: string } | null;
};

export async function getHighScoreEntriesWithDetailsByLeagueId(
  leagueId: string,
  options: { limit?: number; offset?: number; gameTypeId?: string } = {},
  dbOrTx: DBOrTx = db,
): Promise<HighScoreEntryWithGameType[]> {
  const { limit = 50, offset = 0, gameTypeId } = options;

  const { gameType } = await import("./schema");

  const conditions = [eq(highScoreEntry.leagueId, leagueId)];
  if (gameTypeId) {
    conditions.push(eq(highScoreEntry.gameTypeId, gameTypeId));
  }

  const result = await dbOrTx
    .select({
      ...highScoreEntryColumns,
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
      gameType: {
        id: gameType.id,
        name: gameType.name,
        category: gameType.category,
      },
    })
    .from(highScoreEntry)
    .leftJoin(user, eq(highScoreEntry.userId, user.id))
    .leftJoin(team, eq(highScoreEntry.teamId, team.id))
    .leftJoin(
      placeholderMember,
      eq(highScoreEntry.placeholderMemberId, placeholderMember.id),
    )
    .leftJoin(gameType, eq(highScoreEntry.gameTypeId, gameType.id))
    .where(and(...conditions))
    .orderBy(desc(highScoreEntry.achievedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function countHighScoreEntriesByLeagueId(
  leagueId: string,
  options: { gameTypeId?: string } = {},
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const { gameTypeId } = options;

  const conditions = [eq(highScoreEntry.leagueId, leagueId)];
  if (gameTypeId) {
    conditions.push(eq(highScoreEntry.gameTypeId, gameTypeId));
  }

  const result = await dbOrTx
    .select({ count: sql<number>`count(*)` })
    .from(highScoreEntry)
    .where(and(...conditions));

  return Number(result[0]?.count ?? 0);
}

export async function getHighScoreCountByGameTypeId(
  gameTypeId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: sql<number>`count(*)::int` })
    .from(highScoreEntry)
    .where(eq(highScoreEntry.gameTypeId, gameTypeId));
  return result[0].count;
}

export type LeaderboardEntry = {
  entryId: string;
  rank: number;
  participantId: string;
  participantType: "user" | "team" | "placeholder";
  participantName: string;
  participantUsername: string | null;
  participantImage: string | null;
  bestScore: number;
  achievedAt: Date;
};

export async function countLeaderboardEntries(
  gameTypeId: string,
  options: {
    since?: Date;
  } = {},
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const { since } = options;

  const conditions = [eq(highScoreEntry.gameTypeId, gameTypeId)];
  if (since) {
    conditions.push(gte(highScoreEntry.achievedAt, since));
  }

  const result = await dbOrTx
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(highScoreEntry)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

export async function getLeaderboard(
  gameTypeId: string,
  options: {
    limit?: number;
    offset?: number;
    scoreOrder?: "highest_wins" | "lowest_wins";
    since?: Date;
  } = {},
  dbOrTx: DBOrTx = db,
): Promise<LeaderboardEntry[]> {
  const {
    limit = 50,
    offset = 0,
    scoreOrder = ScoreOrder.HIGHEST_WINS,
    since,
  } = options;

  const conditions = [eq(highScoreEntry.gameTypeId, gameTypeId)];
  if (since) {
    conditions.push(gte(highScoreEntry.achievedAt, since));
  }

  const orderDirection =
    scoreOrder === ScoreOrder.HIGHEST_WINS
      ? desc(highScoreEntry.score)
      : asc(highScoreEntry.score);

  const result = await dbOrTx
    .select({
      entryId: highScoreEntry.id,
      participantId: sql<string>`COALESCE(${highScoreEntry.userId}, ${highScoreEntry.teamId}, ${highScoreEntry.placeholderMemberId})`,
      participantType: sql<string>`CASE
        WHEN ${highScoreEntry.userId} IS NOT NULL THEN 'user'
        WHEN ${highScoreEntry.teamId} IS NOT NULL THEN 'team'
        ELSE 'placeholder'
      END`,
      participantName: sql<string>`COALESCE(${user.name}, ${team.name}, ${placeholderMember.displayName})`,
      participantUsername: sql<string | null>`${user.username}`,
      participantImage: sql<
        string | null
      >`COALESCE(${user.image}, ${team.logo})`,
      bestScore: highScoreEntry.score,
      achievedAt: highScoreEntry.achievedAt,
    })
    .from(highScoreEntry)
    .leftJoin(user, eq(highScoreEntry.userId, user.id))
    .leftJoin(team, eq(highScoreEntry.teamId, team.id))
    .leftJoin(
      placeholderMember,
      eq(highScoreEntry.placeholderMemberId, placeholderMember.id),
    )
    .where(and(...conditions))
    .orderBy(orderDirection, desc(highScoreEntry.achievedAt))
    .limit(limit)
    .offset(offset);

  return result.map((row, index) => ({
    entryId: row.entryId,
    rank: offset + index + 1,
    participantId: row.participantId,
    participantType: row.participantType as "user" | "team" | "placeholder",
    participantName: row.participantName,
    participantUsername: row.participantUsername,
    participantImage: row.participantImage,
    bestScore: row.bestScore,
    achievedAt: row.achievedAt,
  }));
}
