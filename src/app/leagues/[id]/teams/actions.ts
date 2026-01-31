"use server";

import { Team, TeamMember } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import { ServiceResult } from "@/services/shared";
import {
  cancelTeamInvitation as cancelTeamInvitationService,
  generateTeamInviteLink as generateTeamInviteLinkService,
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
  input: unknown,
): Promise<ServiceResult<Team>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return createTeamService(session.user.id, input);
}

export async function updateTeamAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<Team>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return updateTeamService(session.user.id, idInput, dataInput);
}

export async function archiveTeamAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return archiveTeamService(session.user.id, input);
}

export async function unarchiveTeamAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return unarchiveTeamService(session.user.id, input);
}

export async function deleteTeamAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return deleteTeamService(session.user.id, input);
}

export async function addTeamMemberAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<TeamMember>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return addTeamMemberService(session.user.id, idInput, dataInput);
}

export async function removeTeamMemberAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return removeTeamMemberService(session.user.id, input);
}

export async function leaveTeamAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return leaveTeamService(session.user.id, input);
}

export async function inviteTeamMemberAction(
  input: unknown,
): Promise<
  ServiceResult<{ invited: boolean; invitationId: string; teamId: string }>
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await inviteTeamMemberService(session.user.id, {
    ...((input as object) || {}),
  });

  if (result.data) {
    revalidatePath(`/leagues/[id]/teams/${result.data.teamId}/settings`);
  }

  return result;
}

export async function generateTeamInviteLinkAction(
  input: unknown,
): Promise<
  ServiceResult<{ token: string; invitationId: string; teamId: string }>
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await generateTeamInviteLinkService(session.user.id, {
    ...((input as object) || {}),
  });

  if (result.data) {
    revalidatePath(`/leagues/[id]/teams/${result.data.teamId}/settings`);
  }

  return result;
}

export async function cancelTeamInvitationAction(
  input: unknown,
): Promise<
  ServiceResult<{ cancelled: boolean; teamId: string; leagueId: string }>
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const parsed = input as { invitationId?: string };
  const result = await cancelTeamInvitationService(
    parsed.invitationId || "",
    session.user.id,
  );

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}`);
    revalidatePath(
      `/leagues/${result.data.leagueId}/teams/${result.data.teamId}/settings`,
    );
  }

  return result;
}
