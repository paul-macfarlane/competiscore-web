import {
  EventTournamentParticipantWithDetails,
  EventTournamentRoundMatchWithDetails,
  EventTournamentWithDetails,
  addEventTournamentParticipant as dbAddParticipant,
  bulkUpdateEventParticipantSeeds as dbBulkUpdateSeeds,
  checkIndividualInEventTournament as dbCheckIndividualInTournament,
  checkEventTournamentNameExists as dbCheckNameExists,
  countEventTournamentParticipants as dbCountParticipants,
  countEventTournamentsByEventId as dbCountTournaments,
  createEventTournamentRoundMatches as dbCreateRoundMatches,
  createEventTournament as dbCreateTournament,
  deleteEventTournament as dbDeleteTournament,
  getEventTournamentBracket as dbGetBracket,
  getEventTournamentParticipantById as dbGetParticipantById,
  getEventTournamentParticipants as dbGetParticipants,
  getEventTournamentRoundMatchById as dbGetRoundMatchById,
  getEventTournamentById as dbGetTournamentById,
  getEventTournamentWithDetails as dbGetTournamentWithDetails,
  getEventTournamentsByEventId as dbGetTournamentsByEventId,
  removeEventTournamentParticipant as dbRemoveParticipant,
  updateEventTournamentParticipant as dbUpdateParticipant,
  updateEventTournamentRoundMatch as dbUpdateRoundMatch,
  updateEventTournament as dbUpdateTournament,
} from "@/db/event-tournaments";
import {
  createEventMatch,
  createEventMatchParticipants,
  createEventPointEntries,
  deleteEventMatch,
  deleteEventPointEntriesForTournament,
  getEventGameTypeById,
  getEventParticipant,
  getTeamForPlaceholder,
  getTeamForUser,
} from "@/db/events";
import { withTransaction } from "@/db/index";
import {
  EventTournament,
  EventTournamentParticipant,
  EventTournamentRoundMatch,
} from "@/db/schema";
import { generateSingleEliminationBracket } from "@/lib/shared/bracket-generator";
import {
  EventPointCategory,
  EventPointOutcome,
  GameCategory,
  MatchResult,
  ParticipantType,
  ScoringType,
  SeedingType,
  TournamentStatus,
  TournamentType,
} from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import {
  type PlacementPointConfig,
  addEventTournamentParticipantSchema,
  createEventTournamentSchema,
  eventTournamentIdSchema,
  forfeitEventTournamentMatchSchema,
  generateEventBracketSchema,
  recordEventTournamentMatchResultSchema,
  removeEventTournamentParticipantSchema,
  setEventParticipantSeedsSchema,
  undoEventTournamentMatchResultSchema,
  updateEventTournamentSchema,
} from "@/validators/events";

import {
  MAX_TOURNAMENTS_PER_LEAGUE,
  MAX_TOURNAMENT_PARTICIPANTS,
  MIN_TOURNAMENT_PARTICIPANTS,
} from "./constants";
import { ServiceResult, formatZodErrors } from "./shared";

export type EventTournamentFullDetails = EventTournamentWithDetails & {
  bracket: EventTournamentRoundMatchWithDetails[];
  participants: EventTournamentParticipantWithDetails[];
};

export async function createEventTournament(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventTournament>> {
  const parsed = createEventTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const participation = await getEventParticipant(data.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to create tournaments" };
  }

  const gameType = await getEventGameTypeById(data.gameTypeId);
  if (!gameType || gameType.eventId !== data.eventId) {
    return { error: "Game type not found in this event" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot create a tournament with an archived game type" };
  }

  if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
    return {
      error: "Tournaments are only supported for head-to-head game types",
    };
  }

  const nameExists = await dbCheckNameExists(data.eventId, data.name);
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "A tournament with this name already exists" },
    };
  }

  const tournamentCount = await dbCountTournaments(data.eventId);
  if (tournamentCount >= MAX_TOURNAMENTS_PER_LEAGUE) {
    return {
      error: `This event has reached the maximum of ${MAX_TOURNAMENTS_PER_LEAGUE} tournaments`,
    };
  }

  const newTournament = await dbCreateTournament({
    eventId: data.eventId,
    eventGameTypeId: data.gameTypeId,
    name: data.name,
    description: data.description ?? null,
    logo: data.logo ?? null,
    tournamentType: TournamentType.SINGLE_ELIMINATION,
    status: TournamentStatus.DRAFT,
    participantType: data.participantType,
    seedingType: data.seedingType,
    bestOf: data.bestOf,
    placementPointConfig: data.placementPointConfig
      ? JSON.stringify(data.placementPointConfig)
      : null,
    startDate: null,
    createdById: userId,
  });

  return { data: newTournament };
}

export async function updateEventTournament(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<EventTournament & { eventId: string }>> {
  const idParsed = eventTournamentIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateEventTournamentSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const { eventTournamentId } = idParsed.data;
  const data = dataParsed.data;

  const tournamentData = await dbGetTournamentById(eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to edit tournaments" };
  }

  const isDraft = tournamentData.status === TournamentStatus.DRAFT;
  const hasDraftOnlyFields =
    data.seedingType !== undefined || data.startDate !== undefined;

  if (!isDraft && hasDraftOnlyFields) {
    return {
      error:
        "Only name, description, and icon can be edited after the tournament has started",
    };
  }

  if (data.name) {
    const nameExists = await dbCheckNameExists(
      tournamentData.eventId,
      data.name,
      eventTournamentId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "A tournament with this name already exists" },
      };
    }
  }

  const updated = await dbUpdateTournament(eventTournamentId, {
    name: data.name,
    description: data.description,
    logo: data.logo,
    ...(isDraft && {
      seedingType: data.seedingType as EventTournament["seedingType"],
      startDate: data.startDate,
    }),
  });

  if (!updated) {
    return { error: "Failed to update tournament" };
  }

  return { data: { ...updated, eventId: tournamentData.eventId } };
}

export async function deleteEventTournament(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const parsed = eventTournamentIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventTournamentId } = parsed.data;

  const tournamentData = await dbGetTournamentById(eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Only draft tournaments can be deleted" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to delete tournaments" };
  }

  await dbDeleteTournament(eventTournamentId);

  return { data: { eventId: tournamentData.eventId } };
}

export async function getEventTournament(
  userId: string,
  tournamentId: string,
): Promise<ServiceResult<EventTournamentFullDetails>> {
  const tournamentData = await dbGetTournamentWithDetails(tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const [bracket, participants] = await Promise.all([
    dbGetBracket(tournamentId),
    dbGetParticipants(tournamentId),
  ]);

  return {
    data: {
      ...tournamentData,
      bracket,
      participants,
    },
  };
}

export async function getEventTournaments(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventTournamentWithDetails[]>> {
  const participation = await getEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const tournaments = await dbGetTournamentsByEventId(eventId);
  return { data: tournaments };
}

export async function addEventTournamentParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventTournamentParticipant>> {
  const parsed = addEventTournamentParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const tournamentData = await dbGetTournamentById(data.eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return {
      error: "Can only add participants to tournaments in draft status",
    };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to manage tournaments" };
  }

  const isTeamTournament =
    tournamentData.participantType === ParticipantType.TEAM;

  if (isTeamTournament) {
    // Team tournament: eventTeamId must be provided directly
    if (!data.eventTeamId) {
      return { error: "Team ID is required for team tournaments" };
    }

    const alreadyInTournament = await dbCheckIndividualInTournament(
      data.eventTournamentId,
      { eventTeamId: data.eventTeamId },
    );
    if (alreadyInTournament) {
      return { error: "This team is already in the tournament" };
    }

    const currentCount = await dbCountParticipants(data.eventTournamentId);
    if (currentCount >= MAX_TOURNAMENT_PARTICIPANTS) {
      return {
        error: `Tournament has reached the maximum of ${MAX_TOURNAMENT_PARTICIPANTS} participants`,
      };
    }

    const participant = await dbAddParticipant({
      eventTournamentId: data.eventTournamentId,
      eventTeamId: data.eventTeamId,
      userId: null,
      eventPlaceholderParticipantId: null,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
    });

    return { data: participant };
  }

  // Individual tournament: resolve participant's team
  let team;
  if (data.userId) {
    team = await getTeamForUser(tournamentData.eventId, data.userId);
  } else if (data.eventPlaceholderParticipantId) {
    team = await getTeamForPlaceholder(
      tournamentData.eventId,
      data.eventPlaceholderParticipantId,
    );
  }

  if (!team) {
    return { error: "Participant is not on a team in this event" };
  }

  const alreadyInTournament = await dbCheckIndividualInTournament(
    data.eventTournamentId,
    {
      userId: data.userId,
      eventPlaceholderParticipantId: data.eventPlaceholderParticipantId,
    },
  );
  if (alreadyInTournament) {
    return { error: "This participant is already in the tournament" };
  }

  const currentCount = await dbCountParticipants(data.eventTournamentId);
  if (currentCount >= MAX_TOURNAMENT_PARTICIPANTS) {
    return {
      error: `Tournament has reached the maximum of ${MAX_TOURNAMENT_PARTICIPANTS} participants`,
    };
  }

  const participant = await dbAddParticipant({
    eventTournamentId: data.eventTournamentId,
    eventTeamId: team.id,
    userId: data.userId ?? null,
    eventPlaceholderParticipantId: data.eventPlaceholderParticipantId ?? null,
    seed: null,
    isEliminated: false,
    eliminatedInRound: null,
    finalPlacement: null,
  });

  return { data: participant };
}

export async function removeEventTournamentParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = removeEventTournamentParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const tournamentData = await dbGetTournamentById(data.eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return {
      error: "Can only remove participants from tournaments in draft status",
    };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to manage tournaments" };
  }

  const participant = await dbGetParticipantById(data.participantId);
  if (
    !participant ||
    participant.eventTournamentId !== data.eventTournamentId
  ) {
    return { error: "Participant not found in this tournament" };
  }

  await dbRemoveParticipant(data.participantId);

  return {
    data: {
      eventTournamentId: data.eventTournamentId,
      eventId: tournamentData.eventId,
    },
  };
}

export async function setEventParticipantSeeds(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = setEventParticipantSeedsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const tournamentData = await dbGetTournamentById(data.eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Can only set seeds for tournaments in draft status" };
  }

  if (tournamentData.seedingType !== SeedingType.MANUAL) {
    return { error: "Seeds can only be set for manually seeded tournaments" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to manage tournaments" };
  }

  const participants = await dbGetParticipants(data.eventTournamentId);
  if (data.seeds.length !== participants.length) {
    return {
      error: `Must assign seeds to all ${participants.length} participants`,
    };
  }

  const participantIds = new Set(participants.map((p) => p.id));
  for (const seed of data.seeds) {
    if (!participantIds.has(seed.participantId)) {
      return { error: "Invalid participant ID in seed assignments" };
    }
  }

  const seedValues = data.seeds.map((s) => s.seed).sort((a, b) => a - b);
  const expected = Array.from({ length: participants.length }, (_, i) => i + 1);
  if (JSON.stringify(seedValues) !== JSON.stringify(expected)) {
    return {
      error: `Seeds must be unique values from 1 to ${participants.length}`,
    };
  }

  await dbBulkUpdateSeeds(
    data.seeds.map((s) => ({ id: s.participantId, seed: s.seed })),
  );

  return {
    data: {
      eventTournamentId: data.eventTournamentId,
      eventId: tournamentData.eventId,
    },
  };
}

export async function generateEventBracket(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = generateEventBracketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventTournamentId } = parsed.data;

  const tournamentData = await dbGetTournamentById(eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Bracket can only be generated for draft tournaments" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return { error: "You do not have permission to manage tournaments" };
  }

  const participants = await dbGetParticipants(eventTournamentId);
  if (participants.length < MIN_TOURNAMENT_PARTICIPANTS) {
    return {
      error: `At least ${MIN_TOURNAMENT_PARTICIPANTS} participants are required`,
    };
  }

  if (tournamentData.seedingType === SeedingType.MANUAL) {
    const allSeeded = participants.every((p) => p.seed !== null);
    if (!allSeeded) {
      return { error: "All participants must have seeds assigned" };
    }
  }

  return withTransaction(async (tx) => {
    let seededParticipants: EventTournamentParticipant[];
    if (tournamentData.seedingType === SeedingType.RANDOM) {
      const shuffled = [...participants];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const seedUpdates = shuffled.map((p, i) => ({
        id: p.id,
        seed: i + 1,
      }));
      await dbBulkUpdateSeeds(seedUpdates, tx);
      seededParticipants = shuffled.map((p, i) => ({
        ...p,
        seed: i + 1,
      }));
    } else {
      seededParticipants = [...participants].sort(
        (a, b) => (a.seed ?? 0) - (b.seed ?? 0),
      );
    }

    const bracketSlots = generateSingleEliminationBracket(
      seededParticipants.length,
    );
    const totalRounds = Math.max(...bracketSlots.map((s) => s.round));

    const seedToParticipant = new Map<number, EventTournamentParticipant>();
    for (const p of seededParticipants) {
      if (p.seed !== null) {
        seedToParticipant.set(p.seed, p);
      }
    }

    const roundMatchData = bracketSlots.map((slot) => ({
      eventTournamentId,
      round: slot.round,
      position: slot.position,
      participant1Id: slot.seed1
        ? (seedToParticipant.get(slot.seed1)?.id ?? null)
        : null,
      participant2Id: slot.seed2
        ? (seedToParticipant.get(slot.seed2)?.id ?? null)
        : null,
      winnerId: null as string | null,
      eventMatchId: null as string | null,
      isBye: slot.isBye,
      isForfeit: false,
      participant1Score: null as number | null,
      participant2Score: null as number | null,
      nextMatchId: null as string | null,
      nextMatchSlot: slot.nextPosition?.slot ?? null,
    }));

    const createdMatches = await dbCreateRoundMatches(roundMatchData, tx);

    const positionToMatch = new Map<string, EventTournamentRoundMatch>();
    for (const m of createdMatches) {
      positionToMatch.set(`${m.round}-${m.position}`, m);
    }

    for (const slot of bracketSlots) {
      if (slot.nextPosition) {
        const currentMatch = positionToMatch.get(
          `${slot.round}-${slot.position}`,
        );
        const nextMatch = positionToMatch.get(
          `${slot.nextPosition.round}-${slot.nextPosition.position}`,
        );
        if (currentMatch && nextMatch) {
          await dbUpdateRoundMatch(
            currentMatch.id,
            {
              nextMatchId: nextMatch.id,
              nextMatchSlot: slot.nextPosition.slot,
            },
            tx,
          );
          positionToMatch.set(`${slot.round}-${slot.position}`, {
            ...currentMatch,
            nextMatchId: nextMatch.id,
            nextMatchSlot: slot.nextPosition.slot,
          });
        }
      }
    }

    for (const rm of createdMatches) {
      if (rm.isBye) {
        const winnerId = rm.participant1Id ?? rm.participant2Id;
        if (winnerId) {
          await dbUpdateRoundMatch(rm.id, { winnerId }, tx);
          const updatedMatch = positionToMatch.get(
            `${rm.round}-${rm.position}`,
          );
          if (updatedMatch) {
            await advanceWinner(
              eventTournamentId,
              updatedMatch,
              winnerId,
              positionToMatch,
              tx,
            );
          }
        }
      }
    }

    await dbUpdateTournament(
      eventTournamentId,
      {
        status: TournamentStatus.IN_PROGRESS,
        totalRounds,
      },
      tx,
    );

    return {
      data: {
        eventTournamentId,
        eventId: tournamentData.eventId,
      },
    };
  });
}

async function advanceWinner(
  _eventTournamentId: string,
  currentMatch: EventTournamentRoundMatch,
  winnerId: string,
  positionToMatch: Map<string, EventTournamentRoundMatch>,
  tx: Parameters<Parameters<typeof withTransaction>[0]>[0],
): Promise<void> {
  if (!currentMatch.nextMatchId) return;

  let nextMatch: EventTournamentRoundMatch | undefined;
  for (const m of positionToMatch.values()) {
    if (m.id === currentMatch.nextMatchId) {
      nextMatch = m;
      break;
    }
  }

  if (!nextMatch) {
    nextMatch = await dbGetRoundMatchById(currentMatch.nextMatchId, tx);
  }

  if (!nextMatch) return;

  const slot = currentMatch.nextMatchSlot;
  if (slot === 1) {
    await dbUpdateRoundMatch(nextMatch.id, { participant1Id: winnerId }, tx);
    nextMatch = { ...nextMatch, participant1Id: winnerId };
  } else if (slot === 2) {
    await dbUpdateRoundMatch(nextMatch.id, { participant2Id: winnerId }, tx);
    nextMatch = { ...nextMatch, participant2Id: winnerId };
  }

  positionToMatch.set(`${nextMatch.round}-${nextMatch.position}`, nextMatch);
}

async function awardTournamentPlacementPoints(
  tournament: EventTournament,
  tx: Parameters<Parameters<typeof withTransaction>[0]>[0],
): Promise<void> {
  if (!tournament.placementPointConfig) return;

  let config: PlacementPointConfig;
  try {
    config = JSON.parse(tournament.placementPointConfig);
  } catch {
    return;
  }

  if (!Array.isArray(config) || config.length === 0) return;

  const participants = await dbGetParticipants(tournament.id, tx);
  const placedParticipants = participants.filter(
    (p) => p.finalPlacement !== null,
  );

  const pointEntries = placedParticipants
    .map((p) => {
      const configEntry = config.find((c) => c.placement === p.finalPlacement);
      if (!configEntry) return null;

      return {
        eventId: tournament.eventId,
        category:
          EventPointCategory.TOURNAMENT as typeof EventPointCategory.TOURNAMENT,
        outcome:
          EventPointOutcome.PLACEMENT as typeof EventPointOutcome.PLACEMENT,
        eventTeamId: p.eventTeamId,
        userId: null,
        eventPlaceholderParticipantId: null,
        eventMatchId: null,
        eventHighScoreSessionId: null,
        eventTournamentId: tournament.id,
        points: configEntry.points,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (pointEntries.length > 0) {
    await createEventPointEntries(pointEntries, tx);
  }
}

export async function recordEventTournamentMatchResult(
  userId: string,
  input: unknown,
): Promise<
  ServiceResult<{
    eventMatchId: string;
    eventTournamentId: string;
    eventId: string;
  }>
> {
  const parsed = recordEventTournamentMatchResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const roundMatch = await dbGetRoundMatchById(data.tournamentMatchId);
  if (!roundMatch) {
    return { error: "Tournament match not found" };
  }

  const tournamentData = await dbGetTournamentById(
    roundMatch.eventTournamentId,
  );
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament is not in progress" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.RECORD_MATCHES)) {
    return {
      error: "You do not have permission to record tournament match results",
    };
  }

  const isTeamTournament =
    tournamentData.participantType === ParticipantType.TEAM;

  // Participants can only record results for matches they're involved in
  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    if (isTeamTournament) {
      return {
        error: "Only organizers can record team tournament match results",
      };
    }
    const p1 = roundMatch.participant1Id
      ? await dbGetParticipantById(roundMatch.participant1Id)
      : null;
    const p2 = roundMatch.participant2Id
      ? await dbGetParticipantById(roundMatch.participant2Id)
      : null;
    const isInvolved = p1?.userId === userId || p2?.userId === userId;
    if (!isInvolved) {
      return {
        error: "You can only record results for matches you're involved in",
      };
    }
  }

  if (roundMatch.winnerId) {
    return { error: "This match already has a result" };
  }

  if (!roundMatch.participant1Id || !roundMatch.participant2Id) {
    return { error: "Both participants must be set before recording a result" };
  }

  const participant1Id = roundMatch.participant1Id;
  const participant2Id = roundMatch.participant2Id;

  return withTransaction(async (tx) => {
    const gameType = await getEventGameTypeById(
      tournamentData.eventGameTypeId,
      tx,
    );
    if (!gameType) {
      return { error: "Game type not found" };
    }

    const h2hConfig = parseH2HConfig(gameType.config);

    let winnerId: string;
    if (h2hConfig.scoringType === ScoringType.SCORE_BASED) {
      if (data.side1Score == null || data.side2Score == null) {
        return { error: "Scores are required for this game type" };
      }
      if (data.side1Score === data.side2Score) {
        return { error: "Tournament matches cannot end in a draw" };
      }
      winnerId =
        data.side1Score > data.side2Score ? participant1Id : participant2Id;
    } else {
      if (!data.winningSide) {
        return { error: "Winner selection is required" };
      }
      winnerId = data.winningSide === "side1" ? participant1Id : participant2Id;
    }

    const loserId =
      winnerId === participant1Id ? participant2Id : participant1Id;

    const winner = await dbGetParticipantById(winnerId, tx);
    const loser = await dbGetParticipantById(loserId, tx);

    if (!winner || !loser) {
      return { error: "Participant not found" };
    }

    const winnerIsP1 = winnerId === participant1Id;

    const realMatch = await createEventMatch(
      {
        eventId: tournamentData.eventId,
        eventGameTypeId: tournamentData.eventGameTypeId,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    await createEventMatchParticipants(
      [
        {
          eventMatchId: realMatch.id,
          eventTeamId: winner.eventTeamId,
          userId: winner.userId ?? null,
          eventPlaceholderParticipantId:
            winner.eventPlaceholderParticipantId ?? null,
          side: winnerIsP1 ? 1 : 2,
          score: winnerIsP1
            ? (data.side1Score ?? null)
            : (data.side2Score ?? null),
          result: MatchResult.WIN,
          rank: null,
        },
        {
          eventMatchId: realMatch.id,
          eventTeamId: loser.eventTeamId,
          userId: loser.userId ?? null,
          eventPlaceholderParticipantId:
            loser.eventPlaceholderParticipantId ?? null,
          side: winnerIsP1 ? 2 : 1,
          score: winnerIsP1
            ? (data.side2Score ?? null)
            : (data.side1Score ?? null),
          result: MatchResult.LOSS,
          rank: null,
        },
      ],
      tx,
    );

    await dbUpdateRoundMatch(
      roundMatch.id,
      {
        winnerId,
        eventMatchId: realMatch.id,
        participant1Score: data.side1Score ?? null,
        participant2Score: data.side2Score ?? null,
      },
      tx,
    );

    await dbUpdateParticipant(
      loserId,
      {
        isEliminated: true,
        eliminatedInRound: roundMatch.round,
      },
      tx,
    );

    const isFinal = !roundMatch.nextMatchId;
    if (isFinal) {
      await dbUpdateParticipant(winnerId, { finalPlacement: 1 }, tx);
      await dbUpdateParticipant(loserId, { finalPlacement: 2 }, tx);

      await dbUpdateTournament(
        tournamentData.id,
        {
          status: TournamentStatus.COMPLETED,
          completedAt: new Date(),
        },
        tx,
      );

      const completedTournament = await dbGetTournamentById(
        tournamentData.id,
        tx,
      );
      if (completedTournament) {
        await awardTournamentPlacementPoints(completedTournament, tx);
      }
    } else {
      const updatedRoundMatch = await dbGetRoundMatchById(roundMatch.id, tx);
      if (updatedRoundMatch?.nextMatchId) {
        const nextMatch = await dbGetRoundMatchById(
          updatedRoundMatch.nextMatchId,
          tx,
        );
        if (nextMatch) {
          const slot = updatedRoundMatch.nextMatchSlot;
          if (slot === 1) {
            await dbUpdateRoundMatch(
              nextMatch.id,
              { participant1Id: winnerId },
              tx,
            );
          } else if (slot === 2) {
            await dbUpdateRoundMatch(
              nextMatch.id,
              { participant2Id: winnerId },
              tx,
            );
          }
        }
      }
    }

    return {
      data: {
        eventMatchId: realMatch.id,
        eventTournamentId: tournamentData.id,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function forfeitEventTournamentMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = forfeitEventTournamentMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const roundMatch = await dbGetRoundMatchById(data.tournamentMatchId);
  if (!roundMatch) {
    return { error: "Tournament match not found" };
  }

  const tournamentData = await dbGetTournamentById(
    roundMatch.eventTournamentId,
  );
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament is not in progress" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return {
      error: "You do not have permission to manage tournament matches",
    };
  }

  if (roundMatch.winnerId) {
    return { error: "This match already has a result" };
  }

  if (
    data.forfeitParticipantId !== roundMatch.participant1Id &&
    data.forfeitParticipantId !== roundMatch.participant2Id
  ) {
    return {
      error: "Forfeit participant must be one of the match participants",
    };
  }

  const winnerId =
    data.forfeitParticipantId === roundMatch.participant1Id
      ? roundMatch.participant2Id
      : roundMatch.participant1Id;

  if (!winnerId) {
    return { error: "Cannot forfeit when the other participant slot is empty" };
  }

  return withTransaction(async (tx) => {
    await dbUpdateRoundMatch(roundMatch.id, { winnerId, isForfeit: true }, tx);

    await dbUpdateParticipant(
      data.forfeitParticipantId,
      {
        isEliminated: true,
        eliminatedInRound: roundMatch.round,
      },
      tx,
    );

    const isFinal = !roundMatch.nextMatchId;
    if (isFinal) {
      await dbUpdateParticipant(winnerId, { finalPlacement: 1 }, tx);
      await dbUpdateParticipant(
        data.forfeitParticipantId,
        { finalPlacement: 2 },
        tx,
      );

      await dbUpdateTournament(
        tournamentData.id,
        {
          status: TournamentStatus.COMPLETED,
          completedAt: new Date(),
        },
        tx,
      );

      const completedTournament = await dbGetTournamentById(
        tournamentData.id,
        tx,
      );
      if (completedTournament) {
        await awardTournamentPlacementPoints(completedTournament, tx);
      }
    } else {
      const updatedRoundMatch = await dbGetRoundMatchById(roundMatch.id, tx);
      if (updatedRoundMatch?.nextMatchId) {
        const nextMatch = await dbGetRoundMatchById(
          updatedRoundMatch.nextMatchId,
          tx,
        );
        if (nextMatch) {
          const slot = updatedRoundMatch.nextMatchSlot;
          if (slot === 1) {
            await dbUpdateRoundMatch(
              nextMatch.id,
              { participant1Id: winnerId },
              tx,
            );
          } else if (slot === 2) {
            await dbUpdateRoundMatch(
              nextMatch.id,
              { participant2Id: winnerId },
              tx,
            );
          }
        }
      }
    }

    return {
      data: {
        eventTournamentId: tournamentData.id,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function undoEventTournamentMatchResult(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = undoEventTournamentMatchResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { tournamentMatchId } = parsed.data;

  const roundMatch = await dbGetRoundMatchById(tournamentMatchId);
  if (!roundMatch) {
    return { error: "Tournament match not found" };
  }

  if (!roundMatch.winnerId) {
    return { error: "This match does not have a result to undo" };
  }

  const tournamentData = await dbGetTournamentById(
    roundMatch.eventTournamentId,
  );
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  const participation = await getEventParticipant(
    tournamentData.eventId,
    userId,
  );
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (
    !canPerformEventAction(participation.role, EventAction.CREATE_TOURNAMENTS)
  ) {
    return {
      error: "You do not have permission to manage tournament matches",
    };
  }

  // Downstream check: if the winner has already played in the next match, we can't undo
  if (roundMatch.nextMatchId) {
    const nextMatch = await dbGetRoundMatchById(roundMatch.nextMatchId);
    if (nextMatch?.winnerId) {
      return {
        error:
          "Cannot undo this match because the winner has already played in a subsequent round",
      };
    }
  }

  const winnerId = roundMatch.winnerId;
  const loserId =
    winnerId === roundMatch.participant1Id
      ? roundMatch.participant2Id
      : roundMatch.participant1Id;

  const wasFinal = !roundMatch.nextMatchId;
  const wasCompleted = tournamentData.status === TournamentStatus.COMPLETED;

  return withTransaction(async (tx) => {
    // If this was the final match and tournament was completed, reopen it
    if (wasFinal && wasCompleted) {
      // Remove tournament placement points
      await deleteEventPointEntriesForTournament(tournamentData.id, tx);

      // Clear placements
      await dbUpdateParticipant(winnerId, { finalPlacement: null }, tx);
      if (loserId) {
        await dbUpdateParticipant(loserId, { finalPlacement: null }, tx);
      }

      // Reopen tournament
      await dbUpdateTournament(
        tournamentData.id,
        {
          status: TournamentStatus.IN_PROGRESS,
          completedAt: null,
        },
        tx,
      );
    }

    // Un-eliminate the loser
    if (loserId) {
      await dbUpdateParticipant(
        loserId,
        {
          isEliminated: false,
          eliminatedInRound: null,
        },
        tx,
      );
    }

    // Remove the winner from the next match slot
    if (roundMatch.nextMatchId) {
      const slot = roundMatch.nextMatchSlot;
      if (slot === 1) {
        await dbUpdateRoundMatch(
          roundMatch.nextMatchId,
          { participant1Id: null },
          tx,
        );
      } else if (slot === 2) {
        await dbUpdateRoundMatch(
          roundMatch.nextMatchId,
          { participant2Id: null },
          tx,
        );
      }
    }

    // Delete the associated event match (cascades to participants + point entries)
    if (roundMatch.eventMatchId) {
      await deleteEventMatch(roundMatch.eventMatchId, tx);
    }

    // Clear the round match result
    await dbUpdateRoundMatch(
      roundMatch.id,
      {
        winnerId: null,
        eventMatchId: null,
        participant1Score: null,
        participant2Score: null,
        isForfeit: false,
      },
      tx,
    );

    return {
      data: {
        eventTournamentId: tournamentData.id,
        eventId: tournamentData.eventId,
      },
    };
  });
}
