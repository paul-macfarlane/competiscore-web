import { getPendingChallengesWithDetailsForUser } from "@/db/matches";
import { getUnacknowledgedModerationActions } from "@/db/moderation-actions";
import { ModerationActionType } from "@/lib/shared/constants";
import { Notification, NotificationType } from "@/lib/shared/notifications";

import { getUserPendingEventInvitations } from "./event-invitations";
import { getUserPendingInvitations } from "./invitations";
import { ServiceResult } from "./shared";
import { getUserPendingTeamInvitations } from "./team-invitations";

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

  const teamInvitationsResult = await getUserPendingTeamInvitations(userId);
  if (teamInvitationsResult.data) {
    for (const inv of teamInvitationsResult.data) {
      notifications.push({
        type: NotificationType.TEAM_INVITATION,
        id: `team_invitation_${inv.id}`,
        createdAt: inv.createdAt,
        data: {
          invitationId: inv.id,
          teamId: inv.team.id,
          teamName: inv.team.name,
          teamLogo: inv.team.logo,
          leagueId: inv.team.league.id,
          leagueName: inv.team.league.name,
          role: inv.role,
          inviterName: inv.inviter.name,
        },
      });
    }
  }

  const eventInvitationsResult = await getUserPendingEventInvitations(userId);
  if (eventInvitationsResult.data) {
    for (const inv of eventInvitationsResult.data) {
      notifications.push({
        type: NotificationType.EVENT_INVITATION,
        id: `event_invitation_${inv.id}`,
        createdAt: inv.createdAt,
        data: {
          invitationId: inv.id,
          eventId: inv.event.id,
          eventName: inv.event.name,
          eventLogo: inv.event.logo,
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

  const challenges = await getPendingChallengesWithDetailsForUser(userId);
  for (const challenge of challenges) {
    notifications.push({
      type: NotificationType.CHALLENGE,
      id: `challenge_${challenge.id}`,
      createdAt: challenge.challengedAt ?? challenge.createdAt,
      data: {
        matchId: challenge.id,
        leagueId: challenge.leagueId,
        leagueName: challenge.league.name,
        challengerName: challenge.challenger.name,
        gameTypeName: challenge.gameType.name,
        challengedAt: challenge.challengedAt ?? challenge.createdAt,
      },
    });
  }

  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { data: notifications };
}

export async function getNotificationCount(userId: string): Promise<number> {
  const result = await getNotifications(userId);
  return result.data?.length ?? 0;
}
