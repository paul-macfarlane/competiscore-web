"use server";

import { HighScoreEntry, Match } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  recordFFARankedMatch,
  recordFFAScoreMatch,
  recordH2HScoreMatch,
  recordH2HWinLossMatch,
  submitHighScore,
} from "@/services/matches";
import { ServiceResult } from "@/services/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function recordH2HWinLossMatchAction(
  input: unknown,
): Promise<ServiceResult<Match>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await recordH2HWinLossMatch(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/matches`);
    revalidatePath(
      `/leagues/${result.data.leagueId}/game-types/${result.data.gameTypeId}`,
    );
  }

  return result;
}

export async function recordH2HScoreMatchAction(
  input: unknown,
): Promise<ServiceResult<Match>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await recordH2HScoreMatch(session.user.id, input);

  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/matches`);
    revalidatePath(
      `/leagues/${result.data.leagueId}/game-types/${result.data.gameTypeId}`,
    );
  }

  return result;
}

export async function recordFFARankedMatchAction(
  input: unknown,
): Promise<ServiceResult<Match>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await recordFFARankedMatch(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/matches`);
    revalidatePath(
      `/leagues/${result.data.leagueId}/game-types/${result.data.gameTypeId}`,
    );
  }

  return result;
}

export async function recordFFAScoreMatchAction(
  input: unknown,
): Promise<ServiceResult<Match>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await recordFFAScoreMatch(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/matches`);
    revalidatePath(
      `/leagues/${result.data.leagueId}/game-types/${result.data.gameTypeId}`,
    );
  }

  return result;
}

export async function submitHighScoreAction(
  input: unknown,
): Promise<ServiceResult<HighScoreEntry>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await submitHighScore(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/game-types/${result.data.gameTypeId}`,
    );
    revalidatePath(
      `/leagues/${result.data.leagueId}/game-types/${result.data.gameTypeId}/leaderboard`,
    );
  }

  return result;
}
