import { InvitationStatus } from "@/lib/shared/constants";
import {
  and,
  count,
  eq,
  gt,
  isNotNull,
  isNull,
  notInArray,
  or,
} from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  NewPlaceholderMember,
  PlaceholderMember,
  highScoreEntry,
  leagueInvitation,
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
  options?: { limit?: number; offset?: number },
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember[]> {
  let query = dbOrTx
    .select()
    .from(placeholderMember)
    .where(
      and(
        eq(placeholderMember.leagueId, leagueId),
        isNull(placeholderMember.retiredAt),
      ),
    )
    .orderBy(placeholderMember.createdAt)
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  return await query;
}

export async function countActivePlaceholderMembersByLeague(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(placeholderMember)
    .where(
      and(
        eq(placeholderMember.leagueId, leagueId),
        isNull(placeholderMember.retiredAt),
      ),
    );
  return result[0].count;
}

export async function getUnlinkedPlaceholderMembersByLeague(
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
        isNull(placeholderMember.linkedUserId),
      ),
    )
    .orderBy(placeholderMember.createdAt);

  return results;
}

export async function getAvailablePlaceholderMembersForInvite(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<PlaceholderMember[]> {
  const now = new Date();

  const placeholdersWithPendingInvites = await dbOrTx
    .selectDistinct({ placeholderId: leagueInvitation.placeholderId })
    .from(leagueInvitation)
    .where(
      and(
        eq(leagueInvitation.leagueId, leagueId),
        eq(leagueInvitation.status, InvitationStatus.PENDING),
        isNotNull(leagueInvitation.placeholderId),
        or(
          isNull(leagueInvitation.expiresAt),
          gt(leagueInvitation.expiresAt, now),
        ),
      ),
    );

  const excludedIds = placeholdersWithPendingInvites
    .map((r) => r.placeholderId)
    .filter((id): id is string => id !== null);

  const whereConditions = [
    eq(placeholderMember.leagueId, leagueId),
    isNull(placeholderMember.retiredAt),
    isNull(placeholderMember.linkedUserId),
  ];

  if (excludedIds.length > 0) {
    whereConditions.push(notInArray(placeholderMember.id, excludedIds));
  }

  const results = await dbOrTx
    .select()
    .from(placeholderMember)
    .where(and(...whereConditions))
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

export async function migrateMatchParticipantsToUser(
  placeholderId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(matchParticipant)
    .set({
      userId,
      placeholderMemberId: null,
    })
    .where(eq(matchParticipant.placeholderMemberId, placeholderId));
}

export async function migrateTeamMembersToUser(
  placeholderId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(teamMember)
    .set({
      userId,
      placeholderMemberId: null,
    })
    .where(eq(teamMember.placeholderMemberId, placeholderId));
}

export async function migrateHighScoreEntriesToUser(
  placeholderId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(highScoreEntry)
    .set({
      userId,
      placeholderMemberId: null,
    })
    .where(eq(highScoreEntry.placeholderMemberId, placeholderId));
}
