"use server";

import { auth } from "@/lib/auth";
import { createReport } from "@/services/moderation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createReportAction(leagueId: string, input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await createReport(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/members`);
    revalidatePath(`/leagues/${leagueId}/moderation`);
  }

  return result;
}
