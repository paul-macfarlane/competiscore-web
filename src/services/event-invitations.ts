import {
  EventInvitationWithDetails,
  checkExistingPendingEventInvitation,
  checkExistingPendingEventInvitationForPlaceholder,
  createEventInvitation as dbCreateEventInvitation,
  deleteEventInvitation as dbDeleteEventInvitation,
  getPendingEventInvitationsForEvent as dbGetPendingEventInvitationsForEvent,
  getPendingEventInvitationsForUser as dbGetPendingEventInvitationsForUser,
  getEventInvitationById,
  getEventInvitationByToken,
  getEventInvitationByTokenWithDetails,
  incrementEventInvitationUseCount,
  updateEventInvitationStatus,
} from "@/db/event-invitations";
import {
  countEventParticipants,
  getEventParticipant,
  getEventPlaceholderById,
} from "@/db/events";
import { withTransaction } from "@/db/index";
import { Event } from "@/db/schema";
import { getUserById } from "@/db/users";
import { EventParticipantRole, InvitationStatus } from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { MAX_EVENT_PARTICIPANTS } from "@/services/constants";
import {
  acceptEventInvitationSchema,
  cancelEventInvitationSchema,
  generateEventInviteLinkSchema,
  inviteUserToEventSchema,
} from "@/validators/events";
import { invitationIdSchema } from "@/validators/invitations";

import { addUserToEvent } from "./join-event";
import { ServiceResult, formatZodErrors } from "./shared";

export async function inviteUserToEvent(
  inviterId: string,
  input: unknown,
): Promise<
  ServiceResult<{ invited: boolean; invitationId: string; eventId: string }>
> {
  const parsed = inviteUserToEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const {
    eventId,
    inviteeUserId,
    role: inputRole,
    placeholderId,
  } = parsed.data;
  const role = inputRole ?? EventParticipantRole.PARTICIPANT;

  const participation = await getEventParticipant(eventId, inviterId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.INVITE_PARTICIPANTS)
  ) {
    return { error: "You don't have permission to invite participants" };
  }

  const invitee = await getUserById(inviteeUserId);
  if (!invitee) {
    return { error: "User not found" };
  }

  const existingParticipation = await getEventParticipant(
    eventId,
    inviteeUserId,
  );
  if (existingParticipation) {
    return { error: "User is already a participant in this event" };
  }

  const existingInvitation = await checkExistingPendingEventInvitation(
    eventId,
    inviteeUserId,
  );
  if (existingInvitation) {
    return { error: "User already has a pending invitation to this event" };
  }

  const participantCount = await countEventParticipants(eventId);
  if (participantCount >= MAX_EVENT_PARTICIPANTS) {
    return {
      error: `This event has reached the maximum of ${MAX_EVENT_PARTICIPANTS} participants`,
    };
  }

  if (placeholderId) {
    const placeholder = await getEventPlaceholderById(placeholderId);
    if (!placeholder || placeholder.eventId !== eventId) {
      return { error: "Placeholder not found in this event" };
    }
    if (placeholder.linkedUserId) {
      return { error: "This placeholder is already linked to a user" };
    }
    const existingPlaceholderInvitation =
      await checkExistingPendingEventInvitationForPlaceholder(placeholderId);
    if (existingPlaceholderInvitation) {
      return {
        error:
          "This placeholder already has a pending invitation. Cancel the existing invitation first.",
      };
    }
  }

  const invitation = await dbCreateEventInvitation({
    eventId,
    inviterId,
    inviteeUserId,
    role,
    status: InvitationStatus.PENDING,
    eventPlaceholderParticipantId: placeholderId ?? null,
  });

  return {
    data: { invited: true, invitationId: invitation.id, eventId },
  };
}

export async function generateEventInviteLink(
  inviterId: string,
  input: unknown,
): Promise<
  ServiceResult<{ token: string; invitationId: string; eventId: string }>
> {
  const parsed = generateEventInviteLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const {
    eventId,
    role: inputRole,
    expiresInDays,
    maxUses,
    placeholderId,
  } = parsed.data;
  const role = inputRole ?? EventParticipantRole.PARTICIPANT;

  if (placeholderId && maxUses !== 1) {
    return {
      error: "Invite links with a placeholder must have a max use of exactly 1",
    };
  }

  if (placeholderId) {
    const placeholder = await getEventPlaceholderById(placeholderId);
    if (!placeholder || placeholder.eventId !== eventId) {
      return { error: "Placeholder not found in this event" };
    }
    if (placeholder.linkedUserId) {
      return { error: "This placeholder is already linked to a user" };
    }
    const existingPlaceholderInvitation =
      await checkExistingPendingEventInvitationForPlaceholder(placeholderId);
    if (existingPlaceholderInvitation) {
      return {
        error:
          "This placeholder already has a pending invitation. Cancel the existing invitation first.",
      };
    }
  }

  const participation = await getEventParticipant(eventId, inviterId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.INVITE_PARTICIPANTS)
  ) {
    return { error: "You don't have permission to invite participants" };
  }

  const token = crypto.randomUUID();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const invitation = await dbCreateEventInvitation({
    eventId,
    inviterId,
    role,
    status: InvitationStatus.PENDING,
    token,
    expiresAt,
    maxUses: maxUses ?? null,
    eventPlaceholderParticipantId: placeholderId ?? null,
  });

  return { data: { token, invitationId: invitation.id, eventId } };
}

export type EventInviteLinkDetails = {
  event: Pick<Event, "id" | "name" | "description" | "logo">;
  role: EventParticipantRole;
  isValid: boolean;
  reason?: string;
};

export async function getEventInviteLinkDetails(
  token: string,
): Promise<ServiceResult<EventInviteLinkDetails>> {
  const invitation = await getEventInvitationByTokenWithDetails(token);
  if (!invitation) {
    return { error: "Invite link not found or has expired" };
  }

  const now = new Date();
  let isValid = true;
  let reason: string | undefined;

  if (invitation.status !== InvitationStatus.PENDING) {
    isValid = false;
    reason = "This invite link is no longer active";
  } else if (invitation.expiresAt && invitation.expiresAt < now) {
    isValid = false;
    reason = "This invite link has expired";
  } else if (
    invitation.maxUses !== null &&
    invitation.useCount >= invitation.maxUses
  ) {
    isValid = false;
    reason = "This invite link has reached its maximum uses";
  }

  return {
    data: {
      event: invitation.event,
      role: invitation.role,
      isValid,
      reason,
    },
  };
}

export async function acceptEventInvitation(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ joined: boolean; eventId: string }>> {
  const parsed = acceptEventInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { token } = parsed.data;

  return withTransaction(async (tx) => {
    const invitation = await getEventInvitationByToken(token, tx);
    if (!invitation) {
      return { error: "Invite link not found" };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return { error: "This invite link is no longer active" };
    }

    const now = new Date();
    if (invitation.expiresAt && invitation.expiresAt < now) {
      return { error: "This invite link has expired" };
    }

    if (
      invitation.maxUses !== null &&
      invitation.useCount >= invitation.maxUses
    ) {
      return { error: "This invite link has reached its maximum uses" };
    }

    const joinResult = await addUserToEvent(
      userId,
      invitation.eventId,
      invitation.role,
      tx,
    );
    if (joinResult.error) {
      return { error: joinResult.error };
    }

    await incrementEventInvitationUseCount(invitation.id, tx);

    return { data: { joined: true, eventId: invitation.eventId } };
  });
}

export async function getUserPendingEventInvitations(
  userId: string,
): Promise<ServiceResult<EventInvitationWithDetails[]>> {
  const invitations = await dbGetPendingEventInvitationsForUser(userId);
  return { data: invitations };
}

export async function getEventPendingInvitations(
  eventId: string,
  userId: string,
): Promise<ServiceResult<EventInvitationWithDetails[]>> {
  const participation = await getEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.INVITE_PARTICIPANTS)
  ) {
    return { error: "You don't have permission to view invitations" };
  }

  const invitations = await dbGetPendingEventInvitationsForEvent(eventId);
  return { data: invitations };
}

export async function acceptDirectEventInvitation(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ joined: boolean; eventId: string }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { invitationId } = parsed.data;

  const invitation = await getEventInvitationById(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeUserId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  const now = new Date();
  if (invitation.expiresAt && invitation.expiresAt < now) {
    await updateEventInvitationStatus(invitationId, InvitationStatus.EXPIRED);
    return { error: "This invitation has expired" };
  }

  return withTransaction(async (tx) => {
    const joinResult = await addUserToEvent(
      userId,
      invitation.eventId,
      invitation.role,
      tx,
    );
    if (joinResult.error) {
      return { error: joinResult.error };
    }

    await updateEventInvitationStatus(
      invitationId,
      InvitationStatus.ACCEPTED,
      tx,
    );

    return { data: { joined: true, eventId: invitation.eventId } };
  });
}

export async function declineEventInvitation(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ declined: boolean }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { invitationId } = parsed.data;

  const invitation = await getEventInvitationById(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeUserId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  await updateEventInvitationStatus(invitationId, InvitationStatus.DECLINED);

  return { data: { declined: true } };
}

export async function cancelEventInvitation(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ cancelled: boolean; eventId: string }>> {
  const parsed = cancelEventInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { invitationId, eventId } = parsed.data;

  const invitation = await getEventInvitationById(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.eventId !== eventId) {
    return { error: "Invitation does not belong to this event" };
  }

  const participation = await getEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.INVITE_PARTICIPANTS)
  ) {
    return { error: "You don't have permission to cancel invitations" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  const deleted = await dbDeleteEventInvitation(invitationId);
  if (!deleted) {
    return { error: "Failed to cancel invitation" };
  }

  return { data: { cancelled: true, eventId } };
}
