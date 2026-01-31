"use server";

import { auth } from "@/lib/server/auth";
import {
  getSuspendedMembers,
  liftSuspension,
  takeModerationAction,
} from "@/services/moderation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function takeModerationActionAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await takeModerationAction(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/moderation`);
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
  }

  return result;
}

export async function getSuspendedMembersAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getSuspendedMembers(session.user.id, input);
}

export async function liftSuspensionAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await liftSuspension(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/moderation`);
    revalidatePath(`/leagues/${result.data.leagueId}/members`);
  }

  return result;
}
