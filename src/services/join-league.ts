import { acceptAllPendingInvitationsForLeague } from "@/db/invitations";
import { createLeagueMember, getLeagueMember } from "@/db/league-members";
import {
  canLeagueAddMember,
  canUserJoinAnotherLeague,
} from "@/lib/server/limits";
import { LeagueMemberRole } from "@/lib/shared/constants";

import { ServiceResult } from "./shared";

/**
 * Core logic for adding a user to a league.
 * Handles limit checks, membership creation, and invitation cleanup.
 *
 * Callers should validate league-specific requirements (exists, not archived,
 * visibility, invitation validity) before calling this function.
 */
export async function addUserToLeague(
  userId: string,
  leagueId: string,
  role: LeagueMemberRole,
): Promise<ServiceResult<{ joined: boolean }>> {
  const existingMembership = await getLeagueMember(userId, leagueId);
  if (existingMembership) {
    return { error: "You are already a member of this league" };
  }

  const userLimitCheck = await canUserJoinAnotherLeague(userId);
  if (!userLimitCheck.allowed) {
    return { error: userLimitCheck.message };
  }

  const leagueLimitCheck = await canLeagueAddMember(leagueId);
  if (!leagueLimitCheck.allowed) {
    return { error: leagueLimitCheck.message };
  }

  await createLeagueMember({ userId, leagueId, role });

  await acceptAllPendingInvitationsForLeague(leagueId, userId);

  return { data: { joined: true } };
}
