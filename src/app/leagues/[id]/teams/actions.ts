"use server";

import { Team, TeamMember } from "@/db/schema";
import { TeamInvitationWithDetails } from "@/db/team-invitations";
import { auth } from "@/lib/server/auth";
import { ServiceResult } from "@/services/shared";
import {
  cancelTeamInvitation as cancelTeamInvitationService,
  generateTeamInviteLink as generateTeamInviteLinkService,
  getTeamPendingInvitations as getTeamPendingInvitationsService,
  inviteTeamMember as inviteTeamMemberService,
} from "@/services/team-invitations";
import {
  addTeamMember as addTeamMemberService,
  archiveTeam as archiveTeamService,
  createTeam as createTeamService,
  deleteTeam as deleteTeamService,
  leaveTeam as leaveTeamService,
  removeTeamMember as removeTeamMemberService,
  unarchiveTeam as unarchiveTeamService,
  updateTeam as updateTeamService,
} from "@/services/teams";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createTeamAction(
  leagueId: string,
  input: unknown,
): Promise<ServiceResult<Team>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return createTeamService(session.user.id, leagueId, input);
}

export async function updateTeamAction(
  teamId: string,
  input: unknown,
): Promise<ServiceResult<Team>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return updateTeamService(session.user.id, teamId, input);
}

export async function archiveTeamAction(
  teamId: string,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return archiveTeamService(session.user.id, teamId);
}

export async function unarchiveTeamAction(
  teamId: string,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return unarchiveTeamService(session.user.id, teamId);
}

export async function deleteTeamAction(
  teamId: string,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return deleteTeamService(session.user.id, teamId);
}

export async function addTeamMemberAction(
  teamId: string,
  input: unknown,
): Promise<ServiceResult<TeamMember>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return addTeamMemberService(session.user.id, teamId, input);
}

export async function removeTeamMemberAction(
  teamMemberId: string,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return removeTeamMemberService(session.user.id, teamMemberId);
}

export async function leaveTeamAction(
  teamId: string,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return leaveTeamService(session.user.id, teamId);
}

export async function inviteTeamMemberAction(
  teamId: string,
  input: unknown,
): Promise<ServiceResult<{ invited: boolean; invitationId: string }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await inviteTeamMemberService(session.user.id, {
    ...((input as object) || {}),
    teamId,
  });

  if (result.data) {
    revalidatePath(`/leagues/[id]/teams/${teamId}/settings`);
  }

  return result;
}

export async function generateTeamInviteLinkAction(
  teamId: string,
  input: unknown,
): Promise<ServiceResult<{ token: string; invitationId: string }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await generateTeamInviteLinkService(session.user.id, {
    ...((input as object) || {}),
    teamId,
  });

  if (result.data) {
    revalidatePath(`/leagues/[id]/teams/${teamId}/settings`);
  }

  return result;
}

export async function cancelTeamInvitationAction(
  invitationId: string,
): Promise<ServiceResult<{ cancelled: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await cancelTeamInvitationService(
    invitationId,
    session.user.id,
  );

  if (result.data) {
    revalidatePath(`/leagues`);
  }

  return result;
}

export async function getTeamPendingInvitationsAction(
  teamId: string,
): Promise<ServiceResult<TeamInvitationWithDetails[]>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getTeamPendingInvitationsService(teamId, session.user.id);
}
