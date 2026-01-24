import { withTransaction } from "@/db";
import { acceptAllPendingInvitationsForLeague } from "@/db/invitations";
import {
  LeagueWithRole,
  createLeagueMember,
  deleteLeagueMember,
  getArchivedLeaguesByUserId,
  getLeagueMember,
  getLeaguesByUserId,
  getMemberCount,
  getMemberCountByRole,
  getUserLeagueCount,
} from "@/db/league-members";
import {
  archiveLeague as dbArchiveLeague,
  createLeague as dbCreateLeague,
  deleteLeague as dbDeleteLeague,
  getLeagueById as dbGetLeagueById,
  getLeagueWithMemberCount as dbGetLeagueWithMemberCount,
  searchPublicLeagues as dbSearchPublicLeagues,
  unarchiveLeague as dbUnarchiveLeague,
  updateLeague as dbUpdateLeague,
} from "@/db/leagues";
import { League } from "@/db/schema";
import { LeagueMemberRole, LeagueVisibility } from "@/lib/constants";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import {
  createLeagueFormSchema,
  updateLeagueFormSchema,
} from "@/validators/leagues";
import { z } from "zod";

import { MAX_LEAGUES_PER_USER, MAX_MEMBERS_PER_LEAGUE } from "./constants";
import { ServiceResult, formatZodErrors } from "./shared";

export type LeagueWithMemberCount = League & { memberCount: number };

export async function createLeague(
  userId: string,
  input: unknown,
): Promise<ServiceResult<League>> {
  const parsed = createLeagueFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const userLeagueCount = await getUserLeagueCount(userId);
  if (userLeagueCount >= MAX_LEAGUES_PER_USER) {
    return {
      error: `You can only be a member of ${MAX_LEAGUES_PER_USER} leagues`,
    };
  }

  const result = await withTransaction(async (tx) => {
    const newLeague = await dbCreateLeague(parsed.data, tx);

    await createLeagueMember(
      {
        userId,
        leagueId: newLeague.id,
        role: LeagueMemberRole.EXECUTIVE,
      },
      tx,
    );

    return newLeague;
  });

  return { data: result };
}

export async function getLeagueById(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<LeagueWithMemberCount>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const league = await dbGetLeagueWithMemberCount(leagueId);
  if (!league) {
    return { error: "League not found" };
  }

  if (league.isArchived) {
    return { error: "This league has been archived" };
  }

  return { data: league };
}

export async function getLeagueWithRole(
  leagueId: string,
  userId: string,
): Promise<
  ServiceResult<
    LeagueWithMemberCount & {
      role: LeagueMemberRole;
      suspendedUntil: Date | null;
    }
  >
> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const league = await dbGetLeagueWithMemberCount(leagueId);
  if (!league) {
    return { error: "League not found" };
  }

  if (league.isArchived) {
    return { error: "This league has been archived" };
  }

  return {
    data: {
      ...league,
      role: membership.role,
      suspendedUntil: membership.suspendedUntil,
    },
  };
}

const updateLeagueInputSchema = updateLeagueFormSchema.extend({
  leagueId: z.string(),
});

export async function updateLeague(
  userId: string,
  input: unknown,
): Promise<ServiceResult<League>> {
  const parsed = updateLeagueInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, ...updateData } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.EDIT_SETTINGS)) {
    return { error: "You don't have permission to edit league settings" };
  }

  const existingLeague = await dbGetLeagueById(leagueId);
  if (!existingLeague) {
    return { error: "League not found" };
  }

  if (existingLeague.isArchived) {
    return { error: "Cannot edit an archived league" };
  }

  const updatedLeague = await dbUpdateLeague(leagueId, updateData);
  if (!updatedLeague) {
    return { error: "Failed to update league" };
  }

  return { data: updatedLeague };
}

export async function archiveLeague(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<{ archived: boolean }>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.ARCHIVE_LEAGUE)) {
    return { error: "You don't have permission to archive the league" };
  }

  const existingLeague = await dbGetLeagueById(leagueId);
  if (!existingLeague) {
    return { error: "League not found" };
  }

  if (existingLeague.isArchived) {
    return { error: "League is already archived" };
  }

  const archived = await dbArchiveLeague(leagueId);
  if (!archived) {
    return { error: "Failed to archive league" };
  }

  return { data: { archived: true } };
}

export async function deleteLeague(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.DELETE_LEAGUE)) {
    return { error: "You don't have permission to delete the league" };
  }

  const existingLeague = await dbGetLeagueById(leagueId);
  if (!existingLeague) {
    return { error: "League not found" };
  }

  const deleted = await dbDeleteLeague(leagueId);
  if (!deleted) {
    return { error: "Failed to delete league" };
  }

  return { data: { deleted: true } };
}

export async function getUserLeagues(
  userId: string,
): Promise<ServiceResult<LeagueWithRole[]>> {
  const leagues = await getLeaguesByUserId(userId);
  return { data: leagues };
}

const searchQuerySchema = z.string().min(1).max(100);

export type SearchResultLeague = LeagueWithMemberCount & { isMember: boolean };

export async function searchPublicLeagues(
  query: unknown,
  userId: string,
): Promise<ServiceResult<SearchResultLeague[]>> {
  const parsed = searchQuerySchema.safeParse(query);
  if (!parsed.success) {
    return {
      error: "Invalid search query",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const leagues = await dbSearchPublicLeagues(parsed.data);

  const leaguesWithMembership = await Promise.all(
    leagues.map(async (league) => {
      const membership = await getLeagueMember(userId, league.id);
      return {
        ...league,
        isMember: !!membership,
      };
    }),
  );

  return { data: leaguesWithMembership };
}

export async function joinPublicLeague(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<{ joined: boolean }>> {
  const existingMembership = await getLeagueMember(userId, leagueId);
  if (existingMembership) {
    return { error: "You are already a member of this league" };
  }

  const league = await dbGetLeagueById(leagueId);
  if (!league) {
    return { error: "League not found" };
  }

  if (league.visibility !== LeagueVisibility.PUBLIC) {
    return { error: "This league is private and requires an invitation" };
  }

  if (league.isArchived) {
    return { error: "This league has been archived" };
  }

  const userLeagueCount = await getUserLeagueCount(userId);
  if (userLeagueCount >= MAX_LEAGUES_PER_USER) {
    return {
      error: `You can only be a member of ${MAX_LEAGUES_PER_USER} leagues`,
    };
  }

  const memberCount = await getMemberCount(leagueId);
  if (memberCount >= MAX_MEMBERS_PER_LEAGUE) {
    return {
      error: `This league has reached its maximum of ${MAX_MEMBERS_PER_LEAGUE} members`,
    };
  }

  await createLeagueMember({
    userId,
    leagueId,
    role: LeagueMemberRole.MEMBER,
  });

  await acceptAllPendingInvitationsForLeague(leagueId, userId);

  return { data: { joined: true } };
}

export async function leaveLeague(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<{ left: boolean }>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (membership.role === LeagueMemberRole.EXECUTIVE) {
    const executiveCount = await getMemberCountByRole(
      leagueId,
      LeagueMemberRole.EXECUTIVE,
    );
    if (executiveCount <= 1) {
      return {
        error:
          "You are the only executive. Please transfer the executive role to another member before leaving.",
      };
    }
  }

  const deleted = await deleteLeagueMember(userId, leagueId);
  if (!deleted) {
    return { error: "Failed to leave league" };
  }

  return { data: { left: true } };
}

export async function getExecutiveCount(leagueId: string): Promise<number> {
  return getMemberCountByRole(leagueId, LeagueMemberRole.EXECUTIVE);
}

export async function getArchivedLeagues(
  userId: string,
): Promise<ServiceResult<LeagueWithRole[]>> {
  const leagues = await getArchivedLeaguesByUserId(userId);
  return { data: leagues };
}

export async function getArchivedLeagueById(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<LeagueWithMemberCount>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (membership.role !== LeagueMemberRole.EXECUTIVE) {
    return { error: "Only executives can view archived leagues" };
  }

  const league = await dbGetLeagueWithMemberCount(leagueId);
  if (!league) {
    return { error: "League not found" };
  }

  if (!league.isArchived) {
    return { error: "This league is not archived" };
  }

  return { data: league };
}

export async function unarchiveLeague(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<{ unarchived: boolean }>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.UNARCHIVE_LEAGUE)) {
    return { error: "You don't have permission to unarchive the league" };
  }

  const existingLeague = await dbGetLeagueById(leagueId);
  if (!existingLeague) {
    return { error: "League not found" };
  }

  if (!existingLeague.isArchived) {
    return { error: "League is not archived" };
  }

  const unarchived = await dbUnarchiveLeague(leagueId);
  if (!unarchived) {
    return { error: "Failed to unarchive league" };
  }

  return { data: { unarchived: true } };
}
