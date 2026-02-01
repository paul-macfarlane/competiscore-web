import { and, count, eq, isNotNull, isNull } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  NewPlaceholderMember,
  PlaceholderMember,
  highScoreEntry,
  matchParticipant,
  placeholderMember,
  teamMember,
} from "./schema";

export async function createPlaceholderMember(
  data: Omit<NewPlaceholderMember, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember> {
  const result = await dbOrTx
    .insert(placeholderMember)
    .values(data)
    .returning();
  return result[0];
}

export async function getPlaceholderMemberById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember | undefined> {
  const result = await dbOrTx
    .select()
    .from(placeholderMember)
    .where(eq(placeholderMember.id, id))
    .limit(1);
  return result[0];
}

export async function getActivePlaceholderMembersByLeague(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember[]> {
  const results = await dbOrTx
    .select()
    .from(placeholderMember)
    .where(
      and(
        eq(placeholderMember.leagueId, leagueId),
        isNull(placeholderMember.retiredAt),
      ),
    )
    .orderBy(placeholderMember.createdAt);

  return results;
}

export async function updatePlaceholderMember(
  id: string,
  data: Partial<Pick<PlaceholderMember, "displayName" | "linkedUserId">>,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember | undefined> {
  const result = await dbOrTx
    .update(placeholderMember)
    .set(data)
    .where(eq(placeholderMember.id, id))
    .returning();
  return result[0];
}

export async function getRetiredPlaceholderMembersByLeague(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember[]> {
  const results = await dbOrTx
    .select()
    .from(placeholderMember)
    .where(
      and(
        eq(placeholderMember.leagueId, leagueId),
        isNotNull(placeholderMember.retiredAt),
      ),
    )
    .orderBy(placeholderMember.createdAt);

  return results;
}

export async function retirePlaceholderMember(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember | undefined> {
  const result = await dbOrTx
    .update(placeholderMember)
    .set({ retiredAt: new Date() })
    .where(eq(placeholderMember.id, id))
    .returning();
  return result[0];
}

export async function restorePlaceholderMember(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember | undefined> {
  const result = await dbOrTx
    .update(placeholderMember)
    .set({ retiredAt: null })
    .where(eq(placeholderMember.id, id))
    .returning();
  return result[0];
}

export async function hasPlaceholderActivity(
  placeholderId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const [matchCount, teamCount, highScoreCount] = await Promise.all([
    dbOrTx
      .select({ count: count() })
      .from(matchParticipant)
      .where(eq(matchParticipant.placeholderMemberId, placeholderId))
      .then((r) => r[0]?.count ?? 0),
    dbOrTx
      .select({ count: count() })
      .from(teamMember)
      .where(eq(teamMember.placeholderMemberId, placeholderId))
      .then((r) => r[0]?.count ?? 0),
    dbOrTx
      .select({ count: count() })
      .from(highScoreEntry)
      .where(eq(highScoreEntry.placeholderMemberId, placeholderId))
      .then((r) => r[0]?.count ?? 0),
  ]);

  return matchCount > 0 || teamCount > 0 || highScoreCount > 0;
}

export async function deletePlaceholderMember(
  placeholderId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(placeholderMember)
    .where(eq(placeholderMember.id, placeholderId));
  return result.rowCount !== null && result.rowCount > 0;
}
