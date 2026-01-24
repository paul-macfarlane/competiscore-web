import { LeagueVisibility } from "@/lib/shared/constants";
import { and, count, eq, ilike, or } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  League,
  NewLeague,
  league,
  leagueColumns,
  leagueMember,
} from "./schema";

export async function createLeague(
  data: Omit<NewLeague, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<League> {
  const result = await dbOrTx.insert(league).values(data).returning();
  return result[0];
}

export async function getLeagueById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<League | undefined> {
  const result = await dbOrTx
    .select()
    .from(league)
    .where(eq(league.id, id))
    .limit(1);
  return result[0];
}

export async function updateLeague(
  id: string,
  data: Partial<Pick<League, "name" | "description" | "visibility" | "logo">>,
  dbOrTx: DBOrTx = db,
): Promise<League | undefined> {
  const result = await dbOrTx
    .update(league)
    .set(data)
    .where(eq(league.id, id))
    .returning();
  return result[0];
}

export async function archiveLeague(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<League | undefined> {
  const result = await dbOrTx
    .update(league)
    .set({ isArchived: true })
    .where(eq(league.id, id))
    .returning();
  return result[0];
}

export async function unarchiveLeague(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<League | undefined> {
  const result = await dbOrTx
    .update(league)
    .set({ isArchived: false })
    .where(eq(league.id, id))
    .returning();
  return result[0];
}

export async function deleteLeague(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx.delete(league).where(eq(league.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function searchPublicLeagues(
  query: string,
  dbOrTx: DBOrTx = db,
): Promise<Array<League & { memberCount: number }>> {
  const searchPattern = `%${query}%`;

  const results = await dbOrTx
    .select({
      ...leagueColumns,
      memberCount: count(leagueMember.id),
    })
    .from(league)
    .leftJoin(leagueMember, eq(league.id, leagueMember.leagueId))
    .where(
      and(
        eq(league.visibility, LeagueVisibility.PUBLIC),
        eq(league.isArchived, false),
        or(
          ilike(league.name, searchPattern),
          ilike(league.description, searchPattern),
        ),
      ),
    )
    .groupBy(league.id)
    .limit(20);

  return results;
}

export async function getLeagueWithMemberCount(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<(League & { memberCount: number }) | undefined> {
  const results = await dbOrTx
    .select({
      ...leagueColumns,
      memberCount: count(leagueMember.id),
    })
    .from(league)
    .leftJoin(leagueMember, eq(league.id, leagueMember.leagueId))
    .where(eq(league.id, id))
    .groupBy(league.id)
    .limit(1);

  return results[0];
}
