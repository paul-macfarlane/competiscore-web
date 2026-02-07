"use server";

import { getLeagueMembers } from "@/db/league-members";
import { getActivePlaceholderMembersByLeague } from "@/db/placeholder-members";
import { getTeamsByLeagueId } from "@/db/teams";
import { auth } from "@/lib/server/auth";
import {
  ParticipantOption,
  buildParticipantOptions,
} from "@/lib/shared/participant-options";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function getLeagueParticipantOptions(
  leagueId: string,
): Promise<ServiceResult<ParticipantOption[]>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const [members, teams, placeholders] = await Promise.all([
    getLeagueMembers(leagueId),
    getTeamsByLeagueId(leagueId),
    getActivePlaceholderMembersByLeague(leagueId),
  ]);

  return { data: buildParticipantOptions(members, teams, placeholders) };
}
