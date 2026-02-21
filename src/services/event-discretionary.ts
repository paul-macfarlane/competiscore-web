import {
  DiscretionaryAwardWithDetails,
  createDiscretionaryAward as dbCreateDiscretionaryAward,
  createEventPointEntries as dbCreateEventPointEntries,
  deleteDiscretionaryAward as dbDeleteDiscretionaryAward,
  deleteEventPointEntriesForDiscretionaryAward as dbDeletePointEntries,
  getDiscretionaryAwardById as dbGetDiscretionaryAwardById,
  getEventById as dbGetEventById,
  getEventDiscretionaryAwards as dbGetEventDiscretionaryAwards,
  getEventParticipant as dbGetEventParticipant,
  updateDiscretionaryAward as dbUpdateDiscretionaryAward,
} from "@/db/events";
import { withTransaction } from "@/db/index";
import { EventDiscretionaryAward } from "@/db/schema";
import {
  EventPointCategory,
  EventPointOutcome,
  EventStatus,
} from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import {
  createDiscretionaryAwardSchema,
  discretionaryAwardIdSchema,
  updateDiscretionaryAwardSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createDiscretionaryAward(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventDiscretionaryAward>> {
  const parsed = createDiscretionaryAwardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, name, description, points, awardedAt, recipients } =
    parsed.data;

  const participant = await dbGetEventParticipant(eventId, userId);
  if (!participant) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participant.role, EventAction.MANAGE_DISCRETIONARY)
  ) {
    return {
      error: "You do not have permission to manage discretionary awards",
    };
  }

  const event = await dbGetEventById(eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== EventStatus.ACTIVE) {
    return { error: "Event must be active to create awards" };
  }

  const teamIds = recipients.map((r) => r.eventTeamId);

  const result = await withTransaction(async (tx) => {
    const award = await dbCreateDiscretionaryAward(
      {
        eventId,
        name,
        description,
        points,
        awardedAt: awardedAt ?? new Date(),
        createdByUserId: userId,
      },
      tx,
    );

    if (teamIds.length > 0) {
      await dbCreateEventPointEntries(
        teamIds.map((teamId) => ({
          eventId,
          category: EventPointCategory.DISCRETIONARY,
          outcome: EventPointOutcome.AWARD,
          eventTeamId: teamId,
          points,
          eventDiscretionaryAwardId: award.id,
        })),
        tx,
      );
    }

    return award;
  });

  return { data: result };
}

export async function updateDiscretionaryAward(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<EventDiscretionaryAward>> {
  const idParsed = discretionaryAwardIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateDiscretionaryAwardSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const { awardId } = idParsed.data;
  const updateData = dataParsed.data;

  const award = await dbGetDiscretionaryAwardById(awardId);
  if (!award) {
    return { error: "Award not found" };
  }

  const participant = await dbGetEventParticipant(award.eventId, userId);
  if (!participant) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participant.role, EventAction.MANAGE_DISCRETIONARY)
  ) {
    return {
      error: "You do not have permission to manage discretionary awards",
    };
  }

  const event = await dbGetEventById(award.eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== EventStatus.ACTIVE) {
    return { error: "Event must be active to update awards" };
  }

  const needsPointRecreation =
    updateData.points !== undefined || updateData.recipients !== undefined;

  const resolvedTeamIds = updateData.recipients
    ? updateData.recipients.map((r) => r.eventTeamId)
    : undefined;

  const result = await withTransaction(async (tx) => {
    const updated = await dbUpdateDiscretionaryAward(
      awardId,
      {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.points !== undefined && { points: updateData.points }),
        ...(updateData.awardedAt !== undefined && {
          awardedAt: updateData.awardedAt,
        }),
      },
      tx,
    );

    if (needsPointRecreation) {
      await dbDeletePointEntries(awardId, tx);

      const finalPoints = updateData.points ?? award.points;
      const finalTeamIds = resolvedTeamIds;

      if (finalTeamIds) {
        if (finalTeamIds.length > 0) {
          await dbCreateEventPointEntries(
            finalTeamIds.map((teamId) => ({
              eventId: award.eventId,
              category: EventPointCategory.DISCRETIONARY,
              outcome: EventPointOutcome.AWARD,
              eventTeamId: teamId,
              points: finalPoints,
              eventDiscretionaryAwardId: awardId,
            })),
            tx,
          );
        }
      } else {
        // Points changed but recipients didn't - re-fetch existing teams
        const existingAwards = await dbGetEventDiscretionaryAwards(
          award.eventId,
          tx,
        );
        const existing = existingAwards.find((a) => a.id === awardId);
        const existingTeamIds = existing?.recipientTeams.map((t) => t.id) ?? [];

        if (existingTeamIds.length > 0) {
          await dbCreateEventPointEntries(
            existingTeamIds.map((teamId) => ({
              eventId: award.eventId,
              category: EventPointCategory.DISCRETIONARY,
              outcome: EventPointOutcome.AWARD,
              eventTeamId: teamId,
              points: finalPoints,
              eventDiscretionaryAwardId: awardId,
            })),
            tx,
          );
        }
      }
    }

    return updated;
  });

  return { data: result };
}

export async function deleteDiscretionaryAward(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const parsed = discretionaryAwardIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { awardId } = parsed.data;

  const award = await dbGetDiscretionaryAwardById(awardId);
  if (!award) {
    return { error: "Award not found" };
  }

  const participant = await dbGetEventParticipant(award.eventId, userId);
  if (!participant) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participant.role, EventAction.MANAGE_DISCRETIONARY)
  ) {
    return {
      error: "You do not have permission to manage discretionary awards",
    };
  }

  await dbDeleteDiscretionaryAward(awardId);

  return { data: { deleted: true, eventId: award.eventId } };
}

export async function getDiscretionaryAwards(
  userId: string,
  eventId: string,
): Promise<ServiceResult<DiscretionaryAwardWithDetails[]>> {
  const participant = await dbGetEventParticipant(eventId, userId);
  if (!participant) {
    return { error: "You are not a participant in this event" };
  }

  const awards = await dbGetEventDiscretionaryAwards(eventId);
  return { data: awards };
}
