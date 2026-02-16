"use server";

import { auth } from "@/lib/server/auth";
import {
  NotificationAction,
  NotificationType,
} from "@/lib/shared/notifications";
import { acceptChallenge, declineChallenge } from "@/services/challenges";
import {
  acceptDirectEventInvitation,
  declineEventInvitation,
} from "@/services/event-invitations";
import { acceptInvitation, declineInvitation } from "@/services/invitations";
import { acknowledgeModerationAction } from "@/services/moderation";
import { getNotifications } from "@/services/notifications";
import { formatZodErrors } from "@/services/shared";
import {
  acceptTeamInvitation,
  declineTeamInvitation,
} from "@/services/team-invitations";
import { handleNotificationSchema } from "@/validators/notifications";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getNotificationsAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getNotifications(session.user.id);
}

export async function handleNotificationAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const parsed = handleNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { notificationType, notificationId, action } = parsed.data;

  switch (notificationType) {
    case NotificationType.LEAGUE_INVITATION: {
      const invitationId = notificationId.replace("invitation_", "");

      if (action === NotificationAction.ACCEPT) {
        const result = await acceptInvitation(session.user.id, {
          invitationId,
        });
        if (result.data) {
          revalidatePath("/invitations");
          revalidatePath("/leagues");
        }
        return result;
      } else if (action === NotificationAction.DECLINE) {
        const result = await declineInvitation(session.user.id, {
          invitationId,
        });
        if (result.data) {
          revalidatePath("/invitations");
        }
        return result;
      }
      return { error: "Invalid action" };
    }

    case NotificationType.TEAM_INVITATION: {
      const invitationId = notificationId.replace("team_invitation_", "");

      if (action === NotificationAction.ACCEPT) {
        const result = await acceptTeamInvitation(
          invitationId,
          session.user.id,
        );
        if (result.data) {
          revalidatePath("/invitations");
          revalidatePath("/leagues");
        }
        return result;
      } else if (action === NotificationAction.DECLINE) {
        const result = await declineTeamInvitation(
          invitationId,
          session.user.id,
        );
        if (result.data) {
          revalidatePath("/invitations");
        }
        return result;
      }
      return { error: "Invalid action" };
    }

    case NotificationType.EVENT_INVITATION: {
      const invitationId = notificationId.replace("event_invitation_", "");

      if (action === NotificationAction.ACCEPT) {
        const result = await acceptDirectEventInvitation(session.user.id, {
          invitationId,
        });
        if (result.data) {
          revalidatePath("/events");
          revalidatePath(`/events/${result.data.eventId}`);
        }
        return result;
      } else if (action === NotificationAction.DECLINE) {
        const result = await declineEventInvitation(session.user.id, {
          invitationId,
        });
        if (result.data) {
          revalidatePath("/events");
        }
        return result;
      }
      return { error: "Invalid action" };
    }

    case NotificationType.MODERATION_ACTION: {
      const actionId = notificationId.replace("moderation_", "");

      if (action === NotificationAction.DISMISS) {
        const result = await acknowledgeModerationAction(
          session.user.id,
          actionId,
        );
        return result;
      }
      return { error: "Invalid action" };
    }

    case NotificationType.CHALLENGE: {
      const matchId = notificationId.replace("challenge_", "");

      if (action === NotificationAction.ACCEPT) {
        const result = await acceptChallenge(session.user.id, { matchId });
        if (result.data) {
          revalidatePath(`/leagues/${result.data.leagueId}/challenges`);
        }
        return result;
      } else if (action === NotificationAction.DECLINE) {
        const result = await declineChallenge(session.user.id, { matchId });
        if (result.data) {
          revalidatePath(`/leagues/${result.data.leagueId}/challenges`);
        }
        return result;
      }
      return { error: "Invalid action" };
    }

    default:
      return { error: "Unknown notification type" };
  }
}
