"use server";

import { auth } from "@/lib/server/auth";
import {
  createPlaceholder,
  deletePlaceholder,
  restorePlaceholder,
  retirePlaceholder,
  updatePlaceholder,
} from "@/services/placeholder-members";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await createPlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/placeholders`);
    revalidatePath(`/leagues/${result.data.leagueId}/members/invite`);
  }

  return result;
}

export async function updatePlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await updatePlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/placeholders`);
  }

  return result;
}

export async function retirePlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await retirePlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/placeholders`);
  }

  return result;
}

export async function restorePlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await restorePlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/placeholders`);
  }

  return result;
}

export async function deletePlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await deletePlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/members/placeholders`);
  }

  return result;
}
