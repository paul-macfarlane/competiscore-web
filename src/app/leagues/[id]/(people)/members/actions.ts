"use server";

import { auth } from "@/lib/server/auth";
import { removeMember, updateMemberRole } from "@/services/members";
import {
  restorePlaceholder,
  retirePlaceholder,
} from "@/services/placeholder-members";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function removeMemberAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await removeMember(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
  }

  return result;
}

export async function updateMemberRoleAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await updateMemberRole(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
  }

  return result;
}

export async function retirePlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await retirePlaceholder(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
  }

  return result;
}

export async function restorePlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await restorePlaceholder(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
  }

  return result;
}
