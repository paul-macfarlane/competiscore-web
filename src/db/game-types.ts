import { and, count, eq, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import { GameType, NewGameType, gameType } from "./schema";

export async function createGameType(
  data: Omit<NewGameType, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<GameType> {
  const result = await dbOrTx.insert(gameType).values(data).returning();
  return result[0];
}

export async function getGameTypeById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<GameType | undefined> {
  const result = await dbOrTx
    .select()
    .from(gameType)
    .where(eq(gameType.id, id))
    .limit(1);
  return result[0];
}

export async function getGameTypesByLeagueId(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<GameType[]> {
  return await dbOrTx
    .select()
    .from(gameType)
    .where(eq(gameType.leagueId, leagueId))
    .orderBy(gameType.createdAt);
}

export async function updateGameType(
  id: string,
  data: Partial<Pick<GameType, "name" | "description" | "logo" | "config">>,
  dbOrTx: DBOrTx = db,
): Promise<GameType | undefined> {
  const result = await dbOrTx
    .update(gameType)
    .set(data)
    .where(eq(gameType.id, id))
    .returning();
  return result[0];
}

export async function archiveGameType(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<GameType | undefined> {
  const result = await dbOrTx
    .update(gameType)
    .set({ isArchived: true })
    .where(eq(gameType.id, id))
    .returning();
  return result[0];
}

export async function unarchiveGameType(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<GameType | undefined> {
  const result = await dbOrTx
    .update(gameType)
    .set({ isArchived: false })
    .where(eq(gameType.id, id))
    .returning();
  return result[0];
}

export async function deleteGameType(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx.delete(gameType).where(eq(gameType.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getGameTypeCountByLeagueId(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(gameType)
    .where(
      and(eq(gameType.leagueId, leagueId), eq(gameType.isArchived, false)),
    );
  return result[0].count;
}

export async function checkGameTypeNameExists(
  leagueId: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(gameType.leagueId, leagueId),
    sql`LOWER(${gameType.name}) = LOWER(${name})`,
  ];

  if (excludeId) {
    conditions.push(sql`${gameType.id} != ${excludeId}`);
  }

  const result = await dbOrTx
    .select({ count: count() })
    .from(gameType)
    .where(and(...conditions));

  return result[0].count > 0;
}
