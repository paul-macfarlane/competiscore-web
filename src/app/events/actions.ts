"use server";

import { Event } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import { createEvent as createEventService } from "@/services/events";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function createEventAction(
  input: unknown,
): Promise<ServiceResult<Event>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return createEventService(session.user.id, input);
}
