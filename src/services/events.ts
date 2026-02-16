import {
  EventWithRole,
  addEventParticipant as dbAddEventParticipant,
  checkEventNameExists as dbCheckEventNameExists,
  countEventGameTypes as dbCountEventGameTypes,
  countEventOrganizers as dbCountEventOrganizers,
  countEventTeams as dbCountEventTeams,
  countEventsByUser as dbCountEventsByUser,
  createEvent as dbCreateEvent,
  deleteEvent as dbDeleteEvent,
  getEventById as dbGetEventById,
  getEventParticipant as dbGetEventParticipant,
  getUserEvents as dbGetUserEvents,
  removeEventParticipant as dbRemoveEventParticipant,
  updateEvent as dbUpdateEvent,
} from "@/db/events";
import { withTransaction } from "@/db/index";
import { Event } from "@/db/schema";
import {
  EventParticipantRole,
  EventScoringType,
  EventStatus,
  EventVisibility,
} from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { MAX_EVENTS_PER_USER } from "@/services/constants";
import {
  createEventSchema,
  eventIdSchema,
  updateEventSchema,
} from "@/validators/events";
import { z } from "zod";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Event>> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const eventCount = await dbCountEventsByUser(userId);
  if (eventCount >= MAX_EVENTS_PER_USER) {
    return {
      error: `You can create at most ${MAX_EVENTS_PER_USER} events`,
    };
  }

  const nameExists = await dbCheckEventNameExists(userId, parsed.data.name);
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "You already have an event with this name" },
    };
  }

  const result = await withTransaction(async (tx) => {
    const newEvent = await dbCreateEvent(
      {
        name: parsed.data.name,
        description: parsed.data.description || null,
        logo: parsed.data.logo || null,
        visibility: EventVisibility.PRIVATE,
        scoringType: EventScoringType.TEAM,
        status: EventStatus.DRAFT,
        createdById: userId,
      },
      tx,
    );

    await dbAddEventParticipant(
      {
        eventId: newEvent.id,
        userId,
        role: EventParticipantRole.ORGANIZER,
      },
      tx,
    );

    return newEvent;
  });

  return { data: result };
}

export async function getEvent(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventWithRole>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const eventData = await dbGetEventById(eventId);
  if (!eventData) {
    return { error: "Event not found" };
  }

  return {
    data: {
      ...eventData,
      role: participation.role,
    },
  };
}

export async function getUserEvents(
  userId: string,
): Promise<ServiceResult<EventWithRole[]>> {
  const events = await dbGetUserEvents(userId);
  return { data: events };
}

const updateEventInputSchema = z.object({
  eventId: z.string(),
});

export async function updateEvent(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<Event>> {
  const idParsed = updateEventInputSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateEventSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const { eventId } = idParsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to edit this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  if (dataParsed.data.name) {
    const nameExists = await dbCheckEventNameExists(
      existingEvent.createdById,
      dataParsed.data.name,
      eventId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "You already have an event with this name" },
      };
    }
  }

  const updated = await dbUpdateEvent(eventId, {
    name: dataParsed.data.name,
    description: dataParsed.data.description,
    logo: dataParsed.data.logo,
  });
  if (!updated) {
    return { error: "Failed to update event" };
  }

  return { data: updated };
}

export async function deleteEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to delete this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  const deleted = await dbDeleteEvent(eventId);
  if (!deleted) {
    return { error: "Failed to delete event" };
  }

  return { data: { deleted: true, eventId } };
}

export async function startEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ started: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to start this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  if (existingEvent.status !== EventStatus.DRAFT) {
    return { error: "Only draft events can be started" };
  }

  const [gameTypeCount, teamCount] = await Promise.all([
    dbCountEventGameTypes(eventId),
    dbCountEventTeams(eventId),
  ]);

  if (gameTypeCount < 1) {
    return { error: "Event must have at least 1 game type to start" };
  }

  if (teamCount < 2) {
    return { error: "Event must have at least 2 teams to start" };
  }

  const updated = await dbUpdateEvent(eventId, {
    status: EventStatus.ACTIVE,
    startDate: existingEvent.startDate ?? new Date(),
  });
  if (!updated) {
    return { error: "Failed to start event" };
  }

  return { data: { started: true, eventId } };
}

export async function completeEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ completed: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to complete this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  if (existingEvent.status !== EventStatus.ACTIVE) {
    return { error: "Only active events can be completed" };
  }

  const updated = await dbUpdateEvent(eventId, {
    status: EventStatus.COMPLETED,
    completedAt: new Date(),
  });
  if (!updated) {
    return { error: "Failed to complete event" };
  }

  return { data: { completed: true, eventId } };
}

export async function reopenEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ reopened: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to reopen this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  if (existingEvent.status !== EventStatus.COMPLETED) {
    return { error: "Only completed events can be reopened" };
  }

  const updated = await dbUpdateEvent(eventId, {
    status: EventStatus.ACTIVE,
    completedAt: null,
  });
  if (!updated) {
    return { error: "Failed to reopen event" };
  }

  return { data: { reopened: true, eventId } };
}

export async function archiveEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ archived: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to archive this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  if (existingEvent.isArchived) {
    return { error: "Event is already archived" };
  }

  await dbUpdateEvent(eventId, { isArchived: true });

  return { data: { archived: true, eventId } };
}

export async function unarchiveEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ unarchived: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_EVENT)) {
    return { error: "You don't have permission to unarchive this event" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent) {
    return { error: "Event not found" };
  }

  if (!existingEvent.isArchived) {
    return { error: "Event is not archived" };
  }

  await dbUpdateEvent(eventId, { isArchived: false });

  return { data: { unarchived: true, eventId } };
}

export async function leaveEvent(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ left: boolean; eventId: string }>> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (participation.role === EventParticipantRole.ORGANIZER) {
    const organizerCount = await dbCountEventOrganizers(eventId);
    if (organizerCount <= 1) {
      return {
        error:
          "You cannot leave as the only organizer. Promote another participant first.",
      };
    }
  }

  await dbRemoveEventParticipant(eventId, userId);

  return { data: { left: true, eventId } };
}

export async function getOrganizerCount(
  userId: string,
  eventId: string,
): Promise<number> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return 0;
  }
  return dbCountEventOrganizers(eventId);
}
