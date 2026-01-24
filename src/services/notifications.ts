import { getUnacknowledgedModerationActions } from "@/db/moderation-actions";
import { ModerationActionType } from "@/lib/constants";
import { Notification, NotificationType } from "@/lib/notifications";

import { getUserPendingInvitations } from "./invitations";
import { ServiceResult } from "./shared";

export async function getNotifications(
  userId: string,
): Promise<ServiceResult<Notification[]>> {
  const notifications: Notification[] = [];

  const invitationsResult = await getUserPendingInvitations(userId);
  if (invitationsResult.data) {
    for (const inv of invitationsResult.data) {
      notifications.push({
        type: NotificationType.LEAGUE_INVITATION,
        id: `invitation_${inv.id}`,
        createdAt: inv.createdAt,
        data: {
          invitationId: inv.id,
          leagueId: inv.league.id,
          leagueName: inv.league.name,
          leagueLogo: inv.league.logo,
          role: inv.role,
          inviterName: inv.inviter.name,
        },
      });
    }
  }

  const moderationActions = await getUnacknowledgedModerationActions(userId);
  for (const action of moderationActions) {
    notifications.push({
      type: NotificationType.MODERATION_ACTION,
      id: `moderation_${action.id}`,
      createdAt: action.createdAt,
      data: {
        actionId: action.id,
        leagueId: action.leagueId,
        leagueName: action.league.name,
        leagueLogo: action.league.logo,
        actionType: action.action as ModerationActionType,
        reason: action.reason,
        suspendedUntil: action.suspendedUntil,
      },
    });
  }

  // Future: Add other notification types here
  // const challenges = await getPendingChallenges(userId);
  // for (const challenge of challenges) { ... }

  // Sort by date, newest first
  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { data: notifications };
}

export async function getNotificationCount(userId: string): Promise<number> {
  const result = await getNotifications(userId);
  return result.data?.length ?? 0;
}
