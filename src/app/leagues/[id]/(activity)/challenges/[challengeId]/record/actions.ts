"use server";

import { auth } from "@/lib/server/auth";
import {
  recordChallengeH2HScoreResult,
  recordChallengeH2HWinLossResult,
} from "@/services/challenges";
import { ServiceResult } from "@/services/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function recordChallengeWinLossResultAction(
  challengeId: string,
  input: unknown,
): Promise<ServiceResult<{ recorded: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Not authenticated" };
  }

  const result = await recordChallengeH2HWinLossResult(
    session.user.id,
    challengeId,
    input,
  );
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/challenges`);
    return { data: { recorded: true } };
  }

  return {
    error: result.error,
    fieldErrors: result.fieldErrors,
  };
}

export async function recordChallengeScoreResultAction(
  challengeId: string,
  input: unknown,
): Promise<ServiceResult<{ recorded: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Not authenticated" };
  }

  const result = await recordChallengeH2HScoreResult(
    session.user.id,
    challengeId,
    input,
  );
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/challenges`);
    return { data: { recorded: true } };
  }

  return {
    error: result.error,
    fieldErrors: result.fieldErrors,
  };
}
