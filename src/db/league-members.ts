import { and, count, eq, getTableColumns } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  League,
  LeagueMember,
  NewLeagueMember,
  league,
  leagueMember,
} from "./schema";

const leagueColumns = getTableColumns(league);

export async function createLeagueMember(
  data: Omit<NewLeagueMember, "id" | "joinedAt">,
  dbOrTx: DBOrTx = db,
): Promise<LeagueMember> {
  const result = await dbOrTx.insert(leagueMember).values(data).returning();
  return result[0];
}

export async function getLeagueMember(
  userId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueMember | undefined> {
  const result = await dbOrTx
    .select()
    .from(leagueMember)
    .where(
      and(eq(leagueMember.userId, userId), eq(leagueMember.leagueId, leagueId)),
    )
    .limit(1);
  return result[0];
}

export type LeagueWithRole = League & {
  role: LeagueMember["role"];
  memberCount: number;
};

export async function getLeaguesByUserId(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueWithRole[]> {
  const userMemberships = await dbOrTx
    .select({
      ...leagueColumns,
      role: leagueMember.role,
    })
    .from(leagueMember)
    .innerJoin(league, eq(leagueMember.leagueId, league.id))
    .where(and(eq(leagueMember.userId, userId), eq(league.isArchived, false)));

  if (userMemberships.length === 0) {
    return [];
  }

  const leagueIds = userMemberships.map((m) => m.id);
  const memberCounts = await Promise.all(
    leagueIds.map(async (leagueId) => {
      const countResult = await dbOrTx
        .select({ count: count() })
        .from(leagueMember)
        .where(eq(leagueMember.leagueId, leagueId));
      return { leagueId, count: countResult[0]?.count ?? 0 };
    }),
  );

  const countMap = new Map(memberCounts.map((c) => [c.leagueId, c.count]));

  return userMemberships.map((m) => ({
    ...m,
    memberCount: countMap.get(m.id) ?? 0,
  }));
}

export async function getMemberCount(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(leagueMember)
    .where(eq(leagueMember.leagueId, leagueId));
  return result[0]?.count ?? 0;
}

export async function getUserLeagueCount(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(leagueMember)
    .innerJoin(league, eq(leagueMember.leagueId, league.id))
    .where(and(eq(leagueMember.userId, userId), eq(league.isArchived, false)));
  return result[0]?.count ?? 0;
}

export async function deleteLeagueMember(
  userId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(leagueMember)
    .where(
      and(eq(leagueMember.userId, userId), eq(leagueMember.leagueId, leagueId)),
    );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getMemberCountByRole(
  leagueId: string,
  role: LeagueMember["role"],
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(leagueMember)
    .where(
      and(eq(leagueMember.leagueId, leagueId), eq(leagueMember.role, role)),
    );
  return result[0]?.count ?? 0;
}

export async function updateMemberRole(
  userId: string,
  leagueId: string,
  role: LeagueMember["role"],
  dbOrTx: DBOrTx = db,
): Promise<LeagueMember | undefined> {
  const result = await dbOrTx
    .update(leagueMember)
    .set({ role })
    .where(
      and(eq(leagueMember.userId, userId), eq(leagueMember.leagueId, leagueId)),
    )
    .returning();
  return result[0];
}

export async function getArchivedLeaguesByUserId(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueWithRole[]> {
  const userMemberships = await dbOrTx
    .select({
      ...leagueColumns,
      role: leagueMember.role,
    })
    .from(leagueMember)
    .innerJoin(league, eq(leagueMember.leagueId, league.id))
    .where(
      and(
        eq(leagueMember.userId, userId),
        eq(league.isArchived, true),
        eq(leagueMember.role, "executive"),
      ),
    );
  if (userMemberships.length === 0) {
    return [];
  }

  const leagueIds = userMemberships.map((m) => m.id);
  const memberCounts = await Promise.all(
    leagueIds.map(async (leagueId) => {
      const countResult = await dbOrTx
        .select({ count: count() })
        .from(leagueMember)
        .where(eq(leagueMember.leagueId, leagueId));
      return { leagueId, count: countResult[0]?.count ?? 0 };
    }),
  );

  const countMap = new Map(memberCounts.map((c) => [c.leagueId, c.count]));

  return userMemberships.map((m) => ({
    ...m,
    memberCount: countMap.get(m.id) ?? 0,
  }));
}
