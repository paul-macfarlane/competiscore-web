"use server";

import { League } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  archiveLeague as archiveLeagueService,
  deleteLeague as deleteLeagueService,
  leaveLeague as leaveLeagueService,
  updateLeague as updateLeagueService,
} from "@/services/leagues";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function updateLeagueAction(
  input: unknown,
): Promise<ServiceResult<League>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return updateLeagueService(session.user.id, input);
}

export async function archiveLeagueAction(
  input: unknown,
): Promise<ServiceResult<{ archived: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return archiveLeagueService(session.user.id, input);
}

export async function deleteLeagueAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return deleteLeagueService(session.user.id, input);
}

export async function leaveLeagueAction(
  input: unknown,
): Promise<ServiceResult<{ left: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return leaveLeagueService(session.user.id, input);
}
