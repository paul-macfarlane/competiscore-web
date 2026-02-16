import {
  EventParticipantWithUser,
  addEventParticipant as dbAddEventParticipant,
  countEventOrganizers as dbCountEventOrganizers,
  countEventParticipants as dbCountEventParticipants,
  getEventParticipant as dbGetEventParticipant,
  getEventParticipants as dbGetEventParticipants,
  removeEventParticipant as dbRemoveEventParticipant,
  updateEventParticipantRole as dbUpdateEventParticipantRole,
} from "@/db/events";
import { EventParticipantRole } from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { MAX_EVENT_PARTICIPANTS } from "@/services/constants";
import {
  addEventParticipantSchema,
  promoteToOrganizerSchema,
  removeEventParticipantSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

export async function addEventParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ added: boolean; eventId: string }>> {
  const parsed = addEventParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, userId: targetUserId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PARTICIPANTS)
  ) {
    return { error: "You don't have permission to manage participants" };
  }

  const existingParticipant = await dbGetEventParticipant(
    eventId,
    targetUserId,
  );
  if (existingParticipant) {
    return { error: "User is already a participant in this event" };
  }

  const participantCount = await dbCountEventParticipants(eventId);
  if (participantCount >= MAX_EVENT_PARTICIPANTS) {
    return {
      error: `Event can have at most ${MAX_EVENT_PARTICIPANTS} participants`,
    };
  }

  await dbAddEventParticipant({
    eventId,
    userId: targetUserId,
    role: EventParticipantRole.PARTICIPANT,
  });

  return { data: { added: true, eventId } };
}

export async function removeEventParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ removed: boolean; eventId: string }>> {
  const parsed = removeEventParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, userId: targetUserId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PARTICIPANTS)
  ) {
    return { error: "You don't have permission to manage participants" };
  }

  if (userId === targetUserId) {
    return { error: "You cannot remove yourself" };
  }

  const targetParticipation = await dbGetEventParticipant(
    eventId,
    targetUserId,
  );
  if (!targetParticipation) {
    return { error: "User is not a participant in this event" };
  }

  if (targetParticipation.role === EventParticipantRole.ORGANIZER) {
    return { error: "You cannot remove another organizer" };
  }

  const removed = await dbRemoveEventParticipant(eventId, targetUserId);
  if (!removed) {
    return { error: "Failed to remove participant" };
  }

  return { data: { removed: true, eventId } };
}

export async function getEventParticipants(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventParticipantWithUser[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const participants = await dbGetEventParticipants(eventId);
  return { data: participants };
}

export async function promoteToOrganizer(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ promoted: boolean; eventId: string }>> {
  const parsed = promoteToOrganizerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, userId: targetUserId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.PROMOTE_TO_ORGANIZER)
  ) {
    return { error: "You don't have permission to promote participants" };
  }

  const targetParticipation = await dbGetEventParticipant(
    eventId,
    targetUserId,
  );
  if (!targetParticipation) {
    return { error: "User is not a participant in this event" };
  }

  if (targetParticipation.role === EventParticipantRole.ORGANIZER) {
    return { error: "User is already an organizer" };
  }

  await dbUpdateEventParticipantRole(
    eventId,
    targetUserId,
    EventParticipantRole.ORGANIZER,
  );

  return { data: { promoted: true, eventId } };
}

export async function demoteToParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ demoted: boolean; eventId: string }>> {
  const parsed = promoteToOrganizerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, userId: targetUserId } = parsed.data;

  if (userId === targetUserId) {
    return { error: "You cannot demote yourself" };
  }

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.PROMOTE_TO_ORGANIZER)
  ) {
    return { error: "You don't have permission to change participant roles" };
  }

  const targetParticipation = await dbGetEventParticipant(
    eventId,
    targetUserId,
  );
  if (!targetParticipation) {
    return { error: "User is not a participant in this event" };
  }

  if (targetParticipation.role === EventParticipantRole.PARTICIPANT) {
    return { error: "User is already a participant" };
  }

  const organizerCount = await dbCountEventOrganizers(eventId);
  if (organizerCount <= 1) {
    return {
      error:
        "Cannot demote the only organizer. Promote another participant first.",
    };
  }

  await dbUpdateEventParticipantRole(
    eventId,
    targetUserId,
    EventParticipantRole.PARTICIPANT,
  );

  return { data: { demoted: true, eventId } };
}
