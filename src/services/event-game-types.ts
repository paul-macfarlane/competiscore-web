import {
  archiveEventGameType as dbArchiveEventGameType,
  checkEventGameTypeNameExists as dbCheckEventGameTypeNameExists,
  countEventGameTypes as dbCountEventGameTypes,
  createEventGameType as dbCreateEventGameType,
  deleteEventGameType as dbDeleteEventGameType,
  getEventById as dbGetEventById,
  getEventGameTypeById as dbGetEventGameTypeById,
  getEventGameTypes as dbGetEventGameTypes,
  getEventParticipant as dbGetEventParticipant,
  unarchiveEventGameType as dbUnarchiveEventGameType,
  updateEventGameType as dbUpdateEventGameType,
} from "@/db/events";
import { EventGameType } from "@/db/schema";
import { EventStatus } from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { MAX_EVENT_GAME_TYPES } from "@/services/constants";
import {
  archiveEventGameTypeSchema,
  createEventGameTypeSchema,
  deleteEventGameTypeSchema,
  eventGameTypeIdSchema,
  unarchiveEventGameTypeSchema,
  updateEventGameTypeSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createEventGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventGameType>> {
  const parsed = createEventGameTypeSchema.safeParse(input);
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

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_GAME_TYPES)
  ) {
    return { error: "You don't have permission to manage game types" };
  }

  const eventData = await dbGetEventById(eventId);
  if (!eventData) {
    return { error: "Event not found" };
  }
  if (eventData.status === EventStatus.COMPLETED) {
    return { error: "Cannot add game types to a completed event" };
  }

  const nameExists = await dbCheckEventGameTypeNameExists(
    eventId,
    parsed.data.name,
  );
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "A game type with this name already exists" },
    };
  }

  const gameTypeCount = await dbCountEventGameTypes(eventId);
  if (gameTypeCount >= MAX_EVENT_GAME_TYPES) {
    return {
      error: `Event can have at most ${MAX_EVENT_GAME_TYPES} game types`,
    };
  }

  const gameType = await dbCreateEventGameType({
    eventId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    logo: parsed.data.logo || null,
    category: parsed.data.category,
    config: JSON.stringify(parsed.data.config),
  });

  return { data: gameType };
}

export async function getEventGameType(
  userId: string,
  gameTypeId: string,
): Promise<ServiceResult<EventGameType>> {
  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const participation = await dbGetEventParticipant(gameType.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  return { data: gameType };
}

export async function getEventGameTypes(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventGameType[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const gameTypes = await dbGetEventGameTypes(eventId);
  return { data: gameTypes };
}

export async function updateEventGameType(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<EventGameType>> {
  const idParsed = eventGameTypeIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateEventGameTypeSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const gameType = await dbGetEventGameTypeById(idParsed.data.gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const participation = await dbGetEventParticipant(gameType.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_GAME_TYPES)
  ) {
    return { error: "You don't have permission to edit game types" };
  }

  if (dataParsed.data.name) {
    const nameExists = await dbCheckEventGameTypeNameExists(
      gameType.eventId,
      dataParsed.data.name,
      idParsed.data.gameTypeId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "A game type with this name already exists" },
      };
    }
  }

  let configToUpdate: string | undefined = undefined;
  if (dataParsed.data.config) {
    const existingConfig = JSON.parse(gameType.config);
    const mergedConfig = {
      ...existingConfig,
      ...dataParsed.data.config,
    };
    configToUpdate = JSON.stringify(mergedConfig);
  }

  const updated = await dbUpdateEventGameType(idParsed.data.gameTypeId, {
    name: dataParsed.data.name,
    description: dataParsed.data.description,
    logo: dataParsed.data.logo,
    config: configToUpdate,
  });
  if (!updated) {
    return { error: "Failed to update game type" };
  }

  return { data: updated };
}

export async function archiveEventGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const parsed = archiveEventGameTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { gameTypeId } = parsed.data;

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const participation = await dbGetEventParticipant(gameType.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_GAME_TYPES)
  ) {
    return { error: "You don't have permission to archive game types" };
  }

  await dbArchiveEventGameType(gameTypeId);
  return { data: { eventId: gameType.eventId } };
}

export async function unarchiveEventGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const parsed = unarchiveEventGameTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { gameTypeId } = parsed.data;

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const participation = await dbGetEventParticipant(gameType.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_GAME_TYPES)
  ) {
    return { error: "You don't have permission to unarchive game types" };
  }

  await dbUnarchiveEventGameType(gameTypeId);
  return { data: { eventId: gameType.eventId } };
}

export async function deleteEventGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const parsed = deleteEventGameTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { gameTypeId } = parsed.data;

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const participation = await dbGetEventParticipant(gameType.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.MANAGE_GAME_TYPES)
  ) {
    return { error: "You don't have permission to delete game types" };
  }

  const deleted = await dbDeleteEventGameType(gameTypeId);
  if (!deleted) {
    return { error: "Failed to delete game type" };
  }

  return { data: { eventId: gameType.eventId } };
}
