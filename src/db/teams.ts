import { and, count, eq, isNull, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  NewTeam,
  NewTeamMember,
  PlaceholderMember,
  Team,
  TeamMember,
  User,
  placeholderMember,
  team,
  teamColumns,
  teamMember,
  teamMemberColumns,
  user,
} from "./schema";

export async function createTeam(
  data: Omit<NewTeam, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<Team> {
  const result = await dbOrTx.insert(team).values(data).returning();
  return result[0];
}

export async function getTeamById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Team | undefined> {
  const result = await dbOrTx
    .select()
    .from(team)
    .where(eq(team.id, id))
    .limit(1);
  return result[0];
}

export async function getTeamsByLeagueId(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<Team[]> {
  return await dbOrTx
    .select()
    .from(team)
    .where(eq(team.leagueId, leagueId))
    .orderBy(team.createdAt);
}

export async function updateTeam(
  id: string,
  data: Partial<Pick<Team, "name" | "description" | "logo">>,
  dbOrTx: DBOrTx = db,
): Promise<Team | undefined> {
  const result = await dbOrTx
    .update(team)
    .set(data)
    .where(eq(team.id, id))
    .returning();
  return result[0];
}

export async function archiveTeam(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Team | undefined> {
  const result = await dbOrTx
    .update(team)
    .set({ isArchived: true })
    .where(eq(team.id, id))
    .returning();
  return result[0];
}

export async function unarchiveTeam(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Team | undefined> {
  const result = await dbOrTx
    .update(team)
    .set({ isArchived: false })
    .where(eq(team.id, id))
    .returning();
  return result[0];
}

export async function deleteTeam(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx.delete(team).where(eq(team.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function checkTeamNameExists(
  leagueId: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(team.leagueId, leagueId),
    sql`LOWER(${team.name}) = LOWER(${name})`,
  ];

  if (excludeId) {
    conditions.push(sql`${team.id} != ${excludeId}`);
  }

  const result = await dbOrTx
    .select({ count: count() })
    .from(team)
    .where(and(...conditions));

  return result[0].count > 0;
}

export async function createTeamMember(
  data: Omit<NewTeamMember, "id" | "joinedAt" | "leftAt">,
  dbOrTx: DBOrTx = db,
): Promise<TeamMember> {
  const result = await dbOrTx.insert(teamMember).values(data).returning();
  return result[0];
}

export async function getTeamMemberById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamMember | undefined> {
  const result = await dbOrTx
    .select()
    .from(teamMember)
    .where(eq(teamMember.id, id))
    .limit(1);
  return result[0];
}

export async function getTeamMemberByUserId(
  teamId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamMember | undefined> {
  const result = await dbOrTx
    .select()
    .from(teamMember)
    .where(
      and(
        eq(teamMember.teamId, teamId),
        eq(teamMember.userId, userId),
        isNull(teamMember.leftAt),
      ),
    )
    .limit(1);
  return result[0];
}

export async function getTeamMemberByPlaceholderId(
  teamId: string,
  placeholderMemberId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamMember | undefined> {
  const result = await dbOrTx
    .select()
    .from(teamMember)
    .where(
      and(
        eq(teamMember.teamId, teamId),
        eq(teamMember.placeholderMemberId, placeholderMemberId),
        isNull(teamMember.leftAt),
      ),
    )
    .limit(1);
  return result[0];
}

export type TeamMemberWithDetails = TeamMember & {
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderMember: Pick<PlaceholderMember, "id" | "displayName"> | null;
};

export async function getTeamMembers(
  teamId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamMemberWithDetails[]> {
  const results = await dbOrTx
    .select({
      ...teamMemberColumns,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      placeholderMember: {
        id: placeholderMember.id,
        displayName: placeholderMember.displayName,
      },
    })
    .from(teamMember)
    .leftJoin(user, eq(teamMember.userId, user.id))
    .leftJoin(
      placeholderMember,
      eq(teamMember.placeholderMemberId, placeholderMember.id),
    )
    .where(and(eq(teamMember.teamId, teamId), isNull(teamMember.leftAt)))
    .orderBy(teamMember.joinedAt);

  return results;
}

export async function getActiveTeamMemberCount(
  teamId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), isNull(teamMember.leftAt)));
  return result[0].count;
}

export async function removeTeamMember(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamMember | undefined> {
  const result = await dbOrTx
    .update(teamMember)
    .set({ leftAt: new Date() })
    .where(eq(teamMember.id, id))
    .returning();
  return result[0];
}

export async function deleteTeamMember(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx.delete(teamMember).where(eq(teamMember.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export type TeamWithMemberCount = Team & {
  memberCount: number;
};

export async function getTeamsWithMemberCountByLeagueId(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamWithMemberCount[]> {
  const teams = await getTeamsByLeagueId(leagueId, dbOrTx);

  if (teams.length === 0) {
    return [];
  }

  const memberCounts = await Promise.all(
    teams.map(async (t) => {
      const memberCount = await getActiveTeamMemberCount(t.id, dbOrTx);
      return { teamId: t.id, count: memberCount };
    }),
  );

  const countMap = new Map(memberCounts.map((c) => [c.teamId, c.count]));

  return teams.map((t) => ({
    ...t,
    memberCount: countMap.get(t.id) ?? 0,
  }));
}

export type TeamWithDetails = Team & {
  members: TeamMemberWithDetails[];
  createdBy: Pick<User, "id" | "name" | "username" | "image">;
};

export async function getTeamWithDetails(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamWithDetails | undefined> {
  const teamResult = await dbOrTx
    .select({
      ...teamColumns,
      createdBy: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(team)
    .innerJoin(user, eq(team.createdById, user.id))
    .where(eq(team.id, id))
    .limit(1);

  if (!teamResult[0]) {
    return undefined;
  }

  const members = await getTeamMembers(id, dbOrTx);

  return {
    ...teamResult[0],
    members,
  };
}

export async function getUserTeamsByLeagueId(
  userId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<Team[]> {
  const results = await dbOrTx
    .select({ ...teamColumns })
    .from(team)
    .innerJoin(teamMember, eq(team.id, teamMember.teamId))
    .where(
      and(
        eq(team.leagueId, leagueId),
        eq(teamMember.userId, userId),
        isNull(teamMember.leftAt),
        eq(team.isArchived, false),
      ),
    )
    .orderBy(team.createdAt);

  return results;
}
