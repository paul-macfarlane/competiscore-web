import { withTransaction } from "@/db/index";
import { getLeagueMember } from "@/db/league-members";
import { getLeagueById as dbGetLeagueById } from "@/db/leagues";
import { League, Team } from "@/db/schema";
import {
  TeamInvitationWithDetails,
  acceptAllPendingTeamInvitationsForTeam,
  checkExistingPendingTeamInvitation,
  createTeamInvitation as dbCreateTeamInvitation,
  getPendingTeamInvitationsForTeam as dbGetPendingTeamInvitationsForTeam,
  getPendingTeamInvitationsForUser as dbGetPendingTeamInvitationsForUser,
  deleteTeamInvitation,
  getTeamInvitationByIdWithDetails,
  getTeamInvitationByTokenWithDetails,
  incrementTeamInvitationUseCount,
  updateTeamInvitationStatus,
} from "@/db/team-invitations";
import {
  createTeamMember as dbCreateTeamMember,
  getTeamById as dbGetTeamById,
  getTeamMemberByUserId as dbGetTeamMemberByUserId,
} from "@/db/teams";
import { getUserById } from "@/db/users";
import { InvitationStatus, TeamMemberRole } from "@/lib/shared/constants";
import {
  LeagueAction,
  TeamAction,
  canPerformAction,
  canPerformTeamAction,
} from "@/lib/shared/permissions";
import {
  generateTeamInviteLinkSchema,
  inviteTeamMemberSchema,
} from "@/validators/teams";
import { z } from "zod";

import { addUserToLeague } from "./join-league";
import { ServiceResult, formatZodErrors } from "./shared";

async function validateTeamInvitePermissions(
  inviterId: string,
  teamId: string,
): Promise<
  ServiceResult<{
    team: Team;
    hasPermission: boolean;
  }>
> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(inviterId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, inviterId);
  const hasTeamPermission =
    teamMember && canPerformTeamAction(teamMember.role, TeamAction.ADD_MEMBERS);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );

  if (!hasTeamPermission && !hasLeaguePermission) {
    return {
      error: "You don't have permission to invite members to this team",
    };
  }

  return { data: { team, hasPermission: true } };
}

const inviteInputSchema = inviteTeamMemberSchema.extend({
  teamId: z.string(),
});

export async function inviteTeamMember(
  inviterId: string,
  input: unknown,
): Promise<ServiceResult<{ invited: boolean; invitationId: string }>> {
  const parsed = inviteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamId, inviteeUserId, role } = parsed.data;

  const validation = await validateTeamInvitePermissions(inviterId, teamId);
  if (validation.error || !validation.data) {
    return { error: validation.error ?? "Unknown error" };
  }

  const { team } = validation.data;

  const invitee = await getUserById(inviteeUserId);
  if (!invitee) {
    return { error: "User not found" };
  }

  const inviteeMembership = await getLeagueMember(inviteeUserId, team.leagueId);
  if (!inviteeMembership) {
    return { error: "User is not a member of this league" };
  }

  const existingTeamMember = await dbGetTeamMemberByUserId(
    teamId,
    inviteeUserId,
  );
  if (existingTeamMember) {
    return { error: "User is already a member of this team" };
  }

  const existingInvitation = await checkExistingPendingTeamInvitation(
    teamId,
    inviteeUserId,
  );
  if (existingInvitation) {
    return { error: "User already has a pending invitation to this team" };
  }

  const invitation = await dbCreateTeamInvitation({
    teamId,
    inviterId,
    inviteeUserId,
    role,
    status: InvitationStatus.PENDING,
  });

  return { data: { invited: true, invitationId: invitation.id } };
}

const generateLinkInputSchema = generateTeamInviteLinkSchema.extend({
  teamId: z.string(),
});

export async function generateTeamInviteLink(
  inviterId: string,
  input: unknown,
): Promise<ServiceResult<{ token: string; invitationId: string }>> {
  const parsed = generateLinkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamId, role, expiresInDays, maxUses } = parsed.data;

  const validation = await validateTeamInvitePermissions(inviterId, teamId);
  if (validation.error) {
    return { error: validation.error };
  }

  const token = crypto.randomUUID();
  let expiresAt: Date | undefined;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const invitation = await dbCreateTeamInvitation({
    teamId,
    inviterId,
    role,
    status: InvitationStatus.PENDING,
    token,
    maxUses: maxUses ?? null,
    expiresAt: expiresAt ?? null,
  });

  return { data: { token, invitationId: invitation.id } };
}

export type TeamInviteLinkDetails = {
  team: Pick<Team, "id" | "name" | "logo">;
  league: Pick<League, "id" | "name" | "logo">;
  role: TeamMemberRole;
  isValid: boolean;
  reason?: string;
  userIsLeagueMember?: boolean;
};

export async function getTeamInviteLinkDetails(
  token: string,
  userId?: string,
): Promise<ServiceResult<TeamInviteLinkDetails>> {
  const invitation = await getTeamInvitationByTokenWithDetails(token);
  if (!invitation) {
    return { error: "Invite link not found or has expired" };
  }

  const now = new Date();
  let isValid = true;
  let reason: string | undefined;

  if (invitation.status !== InvitationStatus.PENDING) {
    isValid = false;
    reason = "This invite link is no longer active";
  } else if (invitation.expiresAt && invitation.expiresAt < now) {
    isValid = false;
    reason = "This invite link has expired";
  } else if (
    invitation.maxUses !== null &&
    invitation.useCount >= invitation.maxUses
  ) {
    isValid = false;
    reason = "This invite link has reached its maximum uses";
  }

  let userIsLeagueMember: boolean | undefined;
  if (userId) {
    const membership = await getLeagueMember(userId, invitation.team.league.id);
    userIsLeagueMember = !!membership;
  }

  return {
    data: {
      team: {
        id: invitation.team.id,
        name: invitation.team.name,
        logo: invitation.team.logo,
      },
      league: invitation.team.league,
      role: invitation.role,
      isValid,
      reason,
      userIsLeagueMember,
    },
  };
}

async function addUserToTeam(
  userId: string,
  teamId: string,
  leagueId: string,
  role: TeamMemberRole,
  requireLeagueMembership: boolean = true,
): Promise<ServiceResult<{ joined: boolean; joinedLeague: boolean }>> {
  const existingTeamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (existingTeamMember) {
    return { error: "You are already a member of this team" };
  }

  const existingLeagueMember = await getLeagueMember(userId, leagueId);
  let joinedLeague = false;

  if (!existingLeagueMember) {
    if (requireLeagueMembership) {
      return { error: "You must be a league member to join this team" };
    }

    const joinResult = await addUserToLeague(userId, leagueId, "member");
    if (joinResult.error) {
      return { error: joinResult.error };
    }
    joinedLeague = true;
  }

  await dbCreateTeamMember({
    teamId,
    userId,
    role,
  });

  return { data: { joined: true, joinedLeague } };
}

export async function acceptTeamInvitation(
  invitationId: string,
  userId: string,
): Promise<ServiceResult<{ joined: boolean }>> {
  const invitation = await getTeamInvitationByIdWithDetails(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeUserId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  const now = new Date();
  if (invitation.expiresAt && invitation.expiresAt < now) {
    await updateTeamInvitationStatus(invitationId, InvitationStatus.EXPIRED);
    return { error: "This invitation has expired" };
  }

  const result = await addUserToTeam(
    userId,
    invitation.teamId,
    invitation.team.league.id,
    invitation.role,
    true,
  );

  if (result.error) {
    if (result.error === "You are already a member of this team") {
      await updateTeamInvitationStatus(invitationId, InvitationStatus.ACCEPTED);
    }
    return result;
  }

  await updateTeamInvitationStatus(invitationId, InvitationStatus.ACCEPTED);

  return { data: { joined: true } };
}

export async function declineTeamInvitation(
  invitationId: string,
  userId: string,
): Promise<ServiceResult<{ declined: boolean }>> {
  const invitation = await getTeamInvitationByIdWithDetails(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeUserId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  await updateTeamInvitationStatus(invitationId, InvitationStatus.DECLINED);

  return { data: { declined: true } };
}

export async function joinTeamViaInviteLink(
  token: string,
  userId: string,
): Promise<
  ServiceResult<{
    joined: boolean;
    teamId: string;
    leagueId: string;
    joinedLeague: boolean;
  }>
> {
  const invitation = await getTeamInvitationByTokenWithDetails(token);
  if (!invitation) {
    return { error: "Invite link not found" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invite link is no longer active" };
  }

  const now = new Date();
  if (invitation.expiresAt && invitation.expiresAt < now) {
    return { error: "This invite link has expired" };
  }

  if (
    invitation.maxUses !== null &&
    invitation.useCount >= invitation.maxUses
  ) {
    return { error: "This invite link has reached its maximum uses" };
  }

  const team = await dbGetTeamById(invitation.teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  if (team.isArchived) {
    return { error: "This team has been archived" };
  }

  const league = await dbGetLeagueById(team.leagueId);
  if (!league) {
    return { error: "League not found" };
  }

  if (league.isArchived) {
    return { error: "This league has been archived" };
  }

  let joinedLeague = false;

  await withTransaction(async (tx) => {
    const result = await addUserToTeam(
      userId,
      team.id,
      team.leagueId,
      invitation.role,
      false,
    );

    if (result.error || !result.data) {
      throw new Error(result.error ?? "Failed to add user to team");
    }

    joinedLeague = result.data.joinedLeague;

    await acceptAllPendingTeamInvitationsForTeam(team.id, userId, tx);
    await incrementTeamInvitationUseCount(invitation.id, tx);
  });

  return {
    data: {
      joined: true,
      teamId: team.id,
      leagueId: team.leagueId,
      joinedLeague,
    },
  };
}

export async function cancelTeamInvitation(
  invitationId: string,
  requestingUserId: string,
): Promise<ServiceResult<{ cancelled: boolean }>> {
  const invitation = await getTeamInvitationByIdWithDetails(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  const team = await dbGetTeamById(invitation.teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const validation = await validateTeamInvitePermissions(
    requestingUserId,
    invitation.teamId,
  );
  if (validation.error) {
    return { error: "You don't have permission to cancel this invitation" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  const deleted = await deleteTeamInvitation(invitationId);
  if (!deleted) {
    return { error: "Failed to cancel invitation" };
  }

  return { data: { cancelled: true } };
}

export async function getUserPendingTeamInvitations(
  userId: string,
): Promise<ServiceResult<TeamInvitationWithDetails[]>> {
  const invitations = await dbGetPendingTeamInvitationsForUser(userId);
  return { data: invitations };
}

export async function getTeamPendingInvitations(
  teamId: string,
  userId: string,
): Promise<ServiceResult<TeamInvitationWithDetails[]>> {
  const validation = await validateTeamInvitePermissions(userId, teamId);
  if (validation.error) {
    return { error: validation.error };
  }

  const invitations = await dbGetPendingTeamInvitationsForTeam(teamId);
  return { data: invitations };
}
