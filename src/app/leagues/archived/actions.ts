"use server";

import { auth } from "@/lib/server/auth";
import { unarchiveLeague } from "@/services/leagues";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function unarchiveLeagueAction(
  input: unknown,
): Promise<ServiceResult<{ unarchived: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Not authenticated" };
  }

  return unarchiveLeague(session.user.id, input);
}
