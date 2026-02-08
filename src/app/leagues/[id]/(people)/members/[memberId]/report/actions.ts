"use server";

import { auth } from "@/lib/server/auth";
import { createReport } from "@/services/moderation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createReportAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await createReport(session.user.id, input);
  if (result.data) {
    const parsed = input as { leagueId?: string };

    revalidatePath(`/leagues/${parsed.leagueId}/members`);
    revalidatePath(`/leagues/${parsed.leagueId}/moderation`);
  }

  return result;
}
