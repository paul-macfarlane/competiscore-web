"use server";

import { auth } from "@/lib/auth";
import { NotificationAction, NotificationType } from "@/lib/notifications";
import { acceptInvitation, declineInvitation } from "@/services/invitations";
import { acknowledgeModerationAction } from "@/services/moderation";
import { getNotifications } from "@/services/notifications";
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

export async function handleNotificationAction(
  notificationType: string,
  notificationId: string,
  action: NotificationAction,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  switch (notificationType) {
    case NotificationType.LEAGUE_INVITATION: {
      const invitationId = notificationId.replace("invitation_", "");

      if (action === NotificationAction.ACCEPT) {
        const result = await acceptInvitation(invitationId, session.user.id);
        if (result.data) {
          revalidatePath("/invitations");
          revalidatePath("/leagues");
          revalidatePath("/dashboard");
        }
        return result;
      } else if (action === NotificationAction.DECLINE) {
        const result = await declineInvitation(invitationId, session.user.id);
        if (result.data) {
          revalidatePath("/invitations");
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

    // Future: Add handlers for other notification types
    // case NotificationType.CHALLENGE: { ... }

    default:
      return { error: "Unknown notification type" };
  }
}
