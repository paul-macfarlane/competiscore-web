import {
  countEventPlaceholders as dbCountEventPlaceholders,
  createEventPlaceholder as dbCreateEventPlaceholder,
  deleteEventPlaceholder as dbDeleteEventPlaceholder,
  getEventParticipant as dbGetEventParticipant,
  getEventPlaceholderById as dbGetEventPlaceholderById,
  getEventPlaceholders as dbGetEventPlaceholders,
  getRetiredEventPlaceholders as dbGetRetiredEventPlaceholders,
  hasEventPlaceholderActivity as dbHasEventPlaceholderActivity,
  restoreEventPlaceholder as dbRestoreEventPlaceholder,
  retireEventPlaceholder as dbRetireEventPlaceholder,
  updateEventPlaceholder as dbUpdateEventPlaceholder,
} from "@/db/events";
import { EventPlaceholderParticipant } from "@/db/schema";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { MAX_EVENT_PLACEHOLDER_PARTICIPANTS } from "@/services/constants";
import {
  createEventPlaceholderSchema,
  eventPlaceholderIdSchema,
  updateEventPlaceholderSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createEventPlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventPlaceholderParticipant>> {
  const parsed = createEventPlaceholderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, displayName } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PLACEHOLDERS)
  ) {
    return { error: "You don't have permission to manage placeholders" };
  }

  const placeholderCount = await dbCountEventPlaceholders(eventId);
  if (placeholderCount >= MAX_EVENT_PLACEHOLDER_PARTICIPANTS) {
    return {
      error: `Event can have at most ${MAX_EVENT_PLACEHOLDER_PARTICIPANTS} placeholder participants`,
    };
  }

  const placeholder = await dbCreateEventPlaceholder({
    eventId,
    displayName,
  });

  return { data: placeholder };
}

export async function getEventPlaceholders(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventPlaceholderParticipant[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const placeholders = await dbGetEventPlaceholders(eventId);
  return { data: placeholders };
}

export async function getRetiredEventPlaceholders(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventPlaceholderParticipant[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const placeholders = await dbGetRetiredEventPlaceholders(eventId);
  return { data: placeholders };
}

export async function updateEventPlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventPlaceholderParticipant>> {
  const parsed = updateEventPlaceholderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, displayName } = parsed.data;

  const placeholder = await dbGetEventPlaceholderById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder participant not found" };
  }

  const participation = await dbGetEventParticipant(
    placeholder.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PLACEHOLDERS)
  ) {
    return {
      error: "You don't have permission to manage placeholder participants",
    };
  }

  const updated = await dbUpdateEventPlaceholder(placeholderId, {
    displayName,
  });
  if (!updated) {
    return { error: "Failed to update placeholder participant" };
  }

  return { data: updated };
}

export async function retireEventPlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ retired: boolean; eventId: string }>> {
  const parsed = eventPlaceholderIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, eventId } = parsed.data;

  const placeholder = await dbGetEventPlaceholderById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder participant not found" };
  }

  if (placeholder.eventId !== eventId) {
    return { error: "Placeholder does not belong to this event" };
  }

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PLACEHOLDERS)
  ) {
    return {
      error: "You don't have permission to retire placeholder participants",
    };
  }

  const retired = await dbRetireEventPlaceholder(placeholderId);
  if (!retired) {
    return { error: "Failed to retire placeholder participant" };
  }

  return { data: { retired: true, eventId } };
}

export async function restoreEventPlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ restored: boolean; eventId: string }>> {
  const parsed = eventPlaceholderIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, eventId } = parsed.data;

  const placeholder = await dbGetEventPlaceholderById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder participant not found" };
  }

  if (placeholder.eventId !== eventId) {
    return { error: "Placeholder does not belong to this event" };
  }

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PLACEHOLDERS)
  ) {
    return {
      error: "You don't have permission to restore placeholder participants",
    };
  }

  const restored = await dbRestoreEventPlaceholder(placeholderId);
  if (!restored) {
    return { error: "Failed to restore placeholder participant" };
  }

  return { data: { restored: true, eventId } };
}

export async function checkEventPlaceholderActivity(
  userId: string,
  placeholderId: string,
  eventId: string,
): Promise<ServiceResult<{ hasActivity: boolean }>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const hasActivity = await dbHasEventPlaceholderActivity(placeholderId);
  return { data: { hasActivity } };
}

export async function deleteEventPlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const parsed = eventPlaceholderIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, eventId } = parsed.data;

  const placeholder = await dbGetEventPlaceholderById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder participant not found" };
  }

  if (placeholder.eventId !== eventId) {
    return { error: "Placeholder does not belong to this event" };
  }

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_PLACEHOLDERS)
  ) {
    return {
      error: "You don't have permission to delete placeholder participants",
    };
  }

  const hasActivity = await dbHasEventPlaceholderActivity(placeholderId);
  if (hasActivity) {
    return {
      error:
        "Cannot delete placeholder with activity history. Use retire instead.",
    };
  }

  const deleted = await dbDeleteEventPlaceholder(placeholderId);
  if (!deleted) {
    return { error: "Failed to delete placeholder participant" };
  }

  return { data: { deleted: true, eventId } };
}
