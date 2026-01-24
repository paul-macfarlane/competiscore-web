import {
  LeagueMemberWithUser,
  getLeagueMembers as dbGetLeagueMembers,
  updateMemberRole as dbUpdateMemberRole,
  deleteLeagueMember,
  getLeagueMember,
  getMemberCountByRole,
} from "@/db/league-members";
import { UserSearchResult, searchUsersByQuery } from "@/db/users";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { canActOnRole, getAssignableRoles } from "@/lib/shared/roles";
import { updateMemberRoleSchema } from "@/validators/members";
import { z } from "zod";

import { ServiceResult, formatZodErrors } from "./shared";

export async function getLeagueMembers(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<LeagueMemberWithUser[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_MEMBERS)) {
    return { error: "You don't have permission to view members" };
  }

  const members = await dbGetLeagueMembers(leagueId);
  return { data: members };
}

export async function removeMember(
  leagueId: string,
  targetUserId: string,
  requestingUserId: string,
): Promise<ServiceResult<{ removed: boolean }>> {
  if (targetUserId === requestingUserId) {
    return { error: "You cannot remove yourself. Use 'Leave League' instead." };
  }

  const requesterMembership = await getLeagueMember(requestingUserId, leagueId);
  if (!requesterMembership) {
    return { error: "You are not a member of this league" };
  }

  if (
    !canPerformAction(requesterMembership.role, LeagueAction.REMOVE_MEMBERS)
  ) {
    return { error: "You don't have permission to remove members" };
  }

  const targetMembership = await getLeagueMember(targetUserId, leagueId);
  if (!targetMembership) {
    return { error: "User is not a member of this league" };
  }

  if (!canActOnRole(requesterMembership.role, targetMembership.role)) {
    return { error: "You cannot remove someone with an equal or higher role" };
  }

  const deleted = await deleteLeagueMember(targetUserId, leagueId);
  if (!deleted) {
    return { error: "Failed to remove member" };
  }

  return { data: { removed: true } };
}

const updateRoleInputSchema = updateMemberRoleSchema.extend({
  leagueId: z.string(),
});

export async function updateMemberRole(
  requestingUserId: string,
  input: unknown,
): Promise<ServiceResult<{ updated: boolean }>> {
  const parsed = updateRoleInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, targetUserId, role: newRole } = parsed.data;

  if (targetUserId === requestingUserId) {
    return { error: "You cannot change your own role" };
  }

  const requesterMembership = await getLeagueMember(requestingUserId, leagueId);
  if (!requesterMembership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(requesterMembership.role, LeagueAction.MANAGE_ROLES)) {
    return { error: "You don't have permission to manage roles" };
  }

  const targetMembership = await getLeagueMember(targetUserId, leagueId);
  if (!targetMembership) {
    return { error: "User is not a member of this league" };
  }

  if (!canActOnRole(requesterMembership.role, targetMembership.role)) {
    return {
      error:
        "You cannot modify the role of someone with an equal or higher role",
    };
  }

  if (targetMembership.role === newRole) {
    return { error: "User already has this role" };
  }

  const assignableRoles = getAssignableRoles(requesterMembership.role);
  if (!assignableRoles.includes(newRole)) {
    return { error: "You cannot assign a role higher than your own" };
  }

  if (
    targetMembership.role === LeagueMemberRole.EXECUTIVE &&
    newRole !== LeagueMemberRole.EXECUTIVE
  ) {
    const executiveCount = await getMemberCountByRole(
      leagueId,
      LeagueMemberRole.EXECUTIVE,
    );
    if (executiveCount <= 1) {
      return {
        error:
          "Cannot demote the only executive. Transfer executive role first.",
      };
    }
  }

  const updated = await dbUpdateMemberRole(targetUserId, leagueId, newRole);
  if (!updated) {
    return { error: "Failed to update role" };
  }

  return { data: { updated: true } };
}

const searchQuerySchema = z.string().min(1).max(100);

export async function searchUsersForInvite(
  leagueId: string,
  query: unknown,
  userId: string,
): Promise<ServiceResult<UserSearchResult[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.INVITE_MEMBERS)) {
    return { error: "You don't have permission to invite members" };
  }

  const parsed = searchQuerySchema.safeParse(query);
  if (!parsed.success) {
    return {
      error: "Invalid search query",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const members = await dbGetLeagueMembers(leagueId);
  const memberUserIds = members.map((m) => m.userId);

  const users = await searchUsersByQuery(parsed.data, memberUserIds);
  return { data: users };
}
