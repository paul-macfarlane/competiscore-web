"use server";

import { League } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  SearchResultLeague,
  createLeague as createLeagueService,
  joinPublicLeague as joinPublicLeagueService,
  searchPublicLeagues as searchPublicLeaguesService,
} from "@/services/leagues";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function createLeagueAction(
  input: unknown,
): Promise<ServiceResult<League>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return createLeagueService(session.user.id, input);
}

export async function searchLeaguesAction(
  query: unknown,
): Promise<ServiceResult<SearchResultLeague[]>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return searchPublicLeaguesService(query, session.user.id);
}

export async function joinLeagueAction(
  leagueId: string,
): Promise<ServiceResult<{ joined: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return joinPublicLeagueService(leagueId, session.user.id);
}
