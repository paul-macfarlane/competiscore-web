"use server";

import { auth } from "@/lib/server/auth";
import {
  getLeagueMembers,
  removeMember,
  updateMemberRole,
} from "@/services/members";
import {
  getPlaceholders,
  getRetiredPlaceholders,
  restorePlaceholder,
  retirePlaceholder,
} from "@/services/placeholder-members";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getLeagueMembersAction(leagueId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getLeagueMembers(leagueId, session.user.id);
}

export async function getPlaceholdersAction(leagueId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getPlaceholders(leagueId, session.user.id);
}

export async function removeMemberAction(
  leagueId: string,
  targetUserId: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await removeMember(leagueId, targetUserId, session.user.id);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members`);
  }

  return result;
}

export async function updateMemberRoleAction(
  leagueId: string,
  targetUserId: string,
  role: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await updateMemberRole(session.user.id, {
    leagueId,
    targetUserId,
    role,
  });
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members`);
  }

  return result;
}

export async function retirePlaceholderAction(
  placeholderId: string,
  leagueId: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await retirePlaceholder(placeholderId, session.user.id);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members`);
  }

  return result;
}

export async function getRetiredPlaceholdersAction(leagueId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getRetiredPlaceholders(leagueId, session.user.id);
}

export async function restorePlaceholderAction(
  placeholderId: string,
  leagueId: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await restorePlaceholder(placeholderId, session.user.id);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members`);
  }

  return result;
}
