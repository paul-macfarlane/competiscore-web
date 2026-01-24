"use server";

import { auth } from "@/lib/server/auth";
import {
  cancelInvitation,
  generateInviteLink,
  getLeaguePendingInvitations,
  inviteUser,
} from "@/services/invitations";
import { searchUsersForInvite } from "@/services/members";
import { createPlaceholder } from "@/services/placeholder-members";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function searchUsersAction(leagueId: string, query: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return searchUsersForInvite(leagueId, query, session.user.id);
}

export async function inviteUserAction(
  leagueId: string,
  inviteeUserId: string,
  role: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await inviteUser(session.user.id, {
    leagueId,
    inviteeUserId,
    role,
  });
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members/invite`);
  }

  return result;
}

export async function generateInviteLinkAction(
  leagueId: string,
  role: string,
  expiresInDays?: number,
  maxUses?: number,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await generateInviteLink(session.user.id, {
    leagueId,
    role,
    expiresInDays,
    maxUses,
  });
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members/invite`);
  }

  return result;
}

export async function cancelInvitationAction(
  invitationId: string,
  leagueId: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await cancelInvitation(invitationId, session.user.id);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members/invite`);
  }

  return result;
}

export async function getPendingInvitationsAction(leagueId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getLeaguePendingInvitations(leagueId, session.user.id);
}

export async function createPlaceholderAction(
  leagueId: string,
  displayName: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await createPlaceholder(session.user.id, {
    leagueId,
    displayName,
  });
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members`);
    revalidatePath(`/leagues/${leagueId}/members/invite`);
  }

  return result;
}
