"use server";

import { auth } from "@/lib/server/auth";
import {
  cancelInvitation,
  generateInviteLink,
  inviteUser,
} from "@/services/invitations";
import { searchUsersForInvite } from "@/services/members";
import { createPlaceholder } from "@/services/placeholder-members";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function searchUsersAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return searchUsersForInvite(session.user.id, input);
}

export async function inviteUserAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await inviteUser(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/invite`);
  }

  return result;
}

export async function generateInviteLinkAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await generateInviteLink(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/invite`);
  }

  return result;
}

export async function cancelInvitationAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await cancelInvitation(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/invite`);
  }

  return result;
}

export async function createPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await createPlaceholder(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
    revalidatePath(`/leagues/${result.data.leagueId}/members/invite`);
  }

  return result;
}
