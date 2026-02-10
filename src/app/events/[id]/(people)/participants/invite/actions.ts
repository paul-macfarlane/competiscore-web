"use server";

import { auth } from "@/lib/server/auth";
import { searchUsersForEventInvite } from "@/services/event-leaderboards";
import { headers } from "next/headers";

export async function searchUsersForEventAction(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };
  return searchUsersForEventInvite(session.user.id, input);
}
