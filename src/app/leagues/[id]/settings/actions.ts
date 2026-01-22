"use server";

import { League } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  archiveLeague as archiveLeagueService,
  deleteLeague as deleteLeagueService,
  leaveLeague as leaveLeagueService,
  updateLeague as updateLeagueService,
} from "@/services/leagues";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function updateLeagueAction(
  leagueId: string,
  input: unknown,
): Promise<ServiceResult<League>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  if (typeof input !== "object" || input === null) {
    return { error: "Invalid input" };
  }

  return updateLeagueService(session.user.id, {
    ...(input as Record<string, unknown>),
    leagueId,
  });
}

export async function archiveLeagueAction(
  leagueId: string,
): Promise<ServiceResult<{ archived: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return archiveLeagueService(leagueId, session.user.id);
}

export async function deleteLeagueAction(
  leagueId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return deleteLeagueService(leagueId, session.user.id);
}

export async function leaveLeagueAction(
  leagueId: string,
): Promise<ServiceResult<{ left: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return leaveLeagueService(leagueId, session.user.id);
}
