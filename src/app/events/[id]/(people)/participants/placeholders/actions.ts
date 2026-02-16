"use server";

import { auth } from "@/lib/server/auth";
import {
  createEventPlaceholder,
  deleteEventPlaceholder,
  restoreEventPlaceholder,
  retireEventPlaceholder,
  updateEventPlaceholder,
} from "@/services/event-placeholder-participants";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createEventPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await createEventPlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}/participants/placeholders`);
  }

  return result;
}

export async function updateEventPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await updateEventPlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}/participants/placeholders`);
  }

  return result;
}

export async function retireEventPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await retireEventPlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}/participants/placeholders`);
  }

  return result;
}

export async function restoreEventPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await restoreEventPlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}/participants/placeholders`);
  }

  return result;
}

export async function deleteEventPlaceholderAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await deleteEventPlaceholder(session.user.id, input);

  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}/participants/placeholders`);
  }

  return result;
}
