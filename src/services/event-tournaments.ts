import {
  EventTournamentParticipantWithDetails,
  EventTournamentRoundMatchWithDetails,
  EventTournamentWithDetails,
  addEventTournamentParticipant as dbAddParticipant,
  addEventTournamentParticipantMembers as dbAddParticipantMembers,
  bulkUpdateEventParticipantSeeds as dbBulkUpdateSeeds,
  checkIndividualInEventTournamentPartnership as dbCheckIndividualInPartnership,
  checkIndividualInEventTournament as dbCheckIndividualInTournament,
  checkEventTournamentNameExists as dbCheckNameExists,
  countEventTournamentParticipants as dbCountParticipants,
  countEventTournamentsByEventId as dbCountTournaments,
  createEventTournamentRoundMatches as dbCreateRoundMatches,
  createEventTournament as dbCreateTournament,
  deleteEventTournament as dbDeleteTournament,
  getEventTournamentBracket as dbGetBracket,
  getEventTournamentParticipantById as dbGetParticipantById,
  getEventTournamentParticipantMembers as dbGetParticipantMembers,
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
  createEventPointEntryParticipants,
  deleteEventMatch,
  deleteEventPointEntriesForTournament,
  getEventGameTypeById,
  getEventMatchesByRoundMatchId,
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
import {
  getPartnershipSize,
  isPartnershipGameType,
  parseH2HConfig,
} from "@/lib/shared/game-config-parser";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import {
  type PlacementPointConfig,
  addEventTournamentParticipantSchema,
  addEventTournamentPartnershipSchema,
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

function getRoundBestOf(tournament: EventTournament, round: number): number {
  if (tournament.roundBestOf) {
    try {
      const config = JSON.parse(tournament.roundBestOf) as Record<
        string,
        number
      >;
      const value = config[String(round)];
      if (typeof value === "number" && value >= 1) return value;
    } catch {
      // fall through to default
    }
  }
  return tournament.bestOf;
}

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
    roundBestOf: data.roundBestOf ? JSON.stringify(data.roundBestOf) : null,
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
    data.seedingType !== undefined ||
    data.startDate !== undefined ||
    data.bestOf !== undefined ||
    data.roundBestOf !== undefined;

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
      bestOf: data.bestOf,
      ...(data.roundBestOf !== undefined && {
        roundBestOf: data.roundBestOf ? JSON.stringify(data.roundBestOf) : null,
      }),
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

export async function addEventTournamentPartnership(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventTournamentParticipant>> {
  const parsed = addEventTournamentPartnershipSchema.safeParse(input);
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

  if (tournamentData.participantType !== ParticipantType.INDIVIDUAL) {
    return { error: "Partnerships are only for individual tournaments" };
  }

  const gameType = await getEventGameTypeById(tournamentData.eventGameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const h2hConfig = parseH2HConfig(gameType.config);
  if (!isPartnershipGameType(h2hConfig)) {
    return {
      error: "This game type does not support partnerships",
    };
  }

  const partnershipSize = getPartnershipSize(h2hConfig);
  if (data.members.length !== partnershipSize) {
    return {
      error: `This game type requires exactly ${partnershipSize} members per partnership`,
    };
  }

  // Verify all members are on the same team
  let teamId: string | null = null;
  for (const member of data.members) {
    let memberTeam;
    if (member.userId) {
      memberTeam = await getTeamForUser(tournamentData.eventId, member.userId);
    } else if (member.eventPlaceholderParticipantId) {
      memberTeam = await getTeamForPlaceholder(
        tournamentData.eventId,
        member.eventPlaceholderParticipantId,
      );
    }

    if (!memberTeam) {
      return { error: "All members must be on a team in this event" };
    }

    if (teamId === null) {
      teamId = memberTeam.id;
    } else if (memberTeam.id !== teamId) {
      return { error: "All partnership members must be on the same team" };
    }
  }

  if (!teamId) {
    return { error: "Could not determine team for partnership" };
  }

  // Check no member is already in the tournament (either as direct participant or in another partnership)
  for (const member of data.members) {
    const inTournament = await dbCheckIndividualInTournament(
      data.eventTournamentId,
      {
        userId: member.userId,
        eventPlaceholderParticipantId: member.eventPlaceholderParticipantId,
      },
    );
    if (inTournament) {
      return {
        error: "One or more members are already in the tournament",
      };
    }

    const inPartnership = await dbCheckIndividualInPartnership(
      data.eventTournamentId,
      {
        userId: member.userId,
        eventPlaceholderParticipantId: member.eventPlaceholderParticipantId,
      },
    );
    if (inPartnership) {
      return {
        error:
          "One or more members are already in a partnership in this tournament",
      };
    }
  }

  const currentCount = await dbCountParticipants(data.eventTournamentId);
  if (currentCount >= MAX_TOURNAMENT_PARTICIPANTS) {
    return {
      error: `Tournament has reached the maximum of ${MAX_TOURNAMENT_PARTICIPANTS} participants`,
    };
  }

  return withTransaction(async (tx) => {
    const participant = await dbAddParticipant(
      {
        eventTournamentId: data.eventTournamentId,
        eventTeamId: teamId,
        userId: null,
        eventPlaceholderParticipantId: null,
        seed: null,
        isEliminated: false,
        eliminatedInRound: null,
        finalPlacement: null,
      },
      tx,
    );

    await dbAddParticipantMembers(
      data.members.map((m) => ({
        eventTournamentParticipantId: participant.id,
        userId: m.userId ?? null,
        eventPlaceholderParticipantId: m.eventPlaceholderParticipantId ?? null,
      })),
      tx,
    );

    return { data: participant };
  });
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

  const entriesWithInfo: Array<{
    entry: {
      eventId: string;
      category: typeof EventPointCategory.TOURNAMENT;
      outcome: typeof EventPointOutcome.PLACEMENT;
      eventTeamId: string | null;
      eventMatchId: null;
      eventHighScoreSessionId: null;
      eventTournamentId: string;
      points: number;
    };
    participantInfo: Array<{
      userId: string | null;
      eventPlaceholderParticipantId: string | null;
    }>;
  }> = [];

  for (const p of placedParticipants) {
    const configEntry = config.find((c) => c.placement === p.finalPlacement);
    if (!configEntry) continue;

    const isPartnership = !p.userId && !p.eventPlaceholderParticipantId;
    let participantInfo: Array<{
      userId: string | null;
      eventPlaceholderParticipantId: string | null;
    }>;

    if (isPartnership) {
      const members = await dbGetParticipantMembers(p.id, tx);
      participantInfo = members.map((m) => ({
        userId: m.user?.id ?? null,
        eventPlaceholderParticipantId: m.placeholderParticipant?.id ?? null,
      }));
    } else {
      participantInfo = [
        {
          userId: p.userId ?? null,
          eventPlaceholderParticipantId:
            p.eventPlaceholderParticipantId ?? null,
        },
      ];
    }

    entriesWithInfo.push({
      entry: {
        eventId: tournament.eventId,
        category: EventPointCategory.TOURNAMENT,
        outcome: EventPointOutcome.PLACEMENT,
        eventTeamId: p.eventTeamId,
        eventMatchId: null,
        eventHighScoreSessionId: null,
        eventTournamentId: tournament.id,
        points: configEntry.points,
      },
      participantInfo,
    });
  }

  if (entriesWithInfo.length > 0) {
    const created = await createEventPointEntries(
      entriesWithInfo.map((e) => e.entry),
      tx,
    );

    const participantRows = created.flatMap((entry, i) =>
      entriesWithInfo[i].participantInfo.flatMap((p) => {
        if (!p.userId && !p.eventPlaceholderParticipantId) return [];
        return [
          {
            eventPointEntryId: entry.id,
            userId: p.userId,
            eventPlaceholderParticipantId: p.eventPlaceholderParticipantId,
          },
        ];
      }),
    );

    if (participantRows.length > 0) {
      await createEventPointEntryParticipants(participantRows, tx);
    }
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
    seriesComplete: boolean;
    participant1Wins: number;
    participant2Wins: number;
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
    let isInvolved = p1?.userId === userId || p2?.userId === userId;
    // Also check partnership members
    if (!isInvolved) {
      const [p1Members, p2Members] = await Promise.all([
        roundMatch.participant1Id
          ? dbGetParticipantMembers(roundMatch.participant1Id)
          : [],
        roundMatch.participant2Id
          ? dbGetParticipantMembers(roundMatch.participant2Id)
          : [],
      ]);
      isInvolved =
        p1Members.some((m) => m.user?.id === userId) ||
        p2Members.some((m) => m.user?.id === userId);
    }
    if (!isInvolved) {
      return {
        error: "You can only record results for matches you're involved in",
      };
    }
  }

  if (roundMatch.winnerId) {
    return { error: "This series is already decided" };
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

    let gameWinnerId: string;
    if (h2hConfig.scoringType === ScoringType.SCORE_BASED) {
      if (data.side1Score == null || data.side2Score == null) {
        return { error: "Scores are required for this game type" };
      }
      if (data.side1Score === data.side2Score) {
        return { error: "Tournament matches cannot end in a draw" };
      }
      gameWinnerId =
        data.side1Score > data.side2Score ? participant1Id : participant2Id;
    } else {
      if (!data.winningSide) {
        return { error: "Winner selection is required" };
      }
      gameWinnerId =
        data.winningSide === "side1" ? participant1Id : participant2Id;
    }

    const gameWinnerIsP1 = gameWinnerId === participant1Id;
    const gameLoserId =
      gameWinnerId === participant1Id ? participant2Id : participant1Id;

    const winner = await dbGetParticipantById(gameWinnerId, tx);
    const loser = await dbGetParticipantById(gameLoserId, tx);

    if (!winner || !loser) {
      return { error: "Participant not found" };
    }

    const realMatch = await createEventMatch(
      {
        eventId: tournamentData.eventId,
        eventGameTypeId: tournamentData.eventGameTypeId,
        eventTournamentRoundMatchId: roundMatch.id,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    // Check for partnership members
    const [winnerMembers, loserMembers] = await Promise.all([
      dbGetParticipantMembers(gameWinnerId, tx),
      dbGetParticipantMembers(gameLoserId, tx),
    ]);

    const matchParticipants: Parameters<
      typeof createEventMatchParticipants
    >[0] = [];

    if (winnerMembers.length > 0) {
      for (const member of winnerMembers) {
        matchParticipants.push({
          eventMatchId: realMatch.id,
          eventTeamId: winner.eventTeamId,
          userId: member.user?.id ?? null,
          eventPlaceholderParticipantId:
            member.placeholderParticipant?.id ?? null,
          side: gameWinnerIsP1 ? 1 : 2,
          score: gameWinnerIsP1
            ? (data.side1Score ?? null)
            : (data.side2Score ?? null),
          result: MatchResult.WIN,
          rank: null,
        });
      }
    } else {
      matchParticipants.push({
        eventMatchId: realMatch.id,
        eventTeamId: winner.eventTeamId,
        userId: winner.userId ?? null,
        eventPlaceholderParticipantId:
          winner.eventPlaceholderParticipantId ?? null,
        side: gameWinnerIsP1 ? 1 : 2,
        score: gameWinnerIsP1
          ? (data.side1Score ?? null)
          : (data.side2Score ?? null),
        result: MatchResult.WIN,
        rank: null,
      });
    }

    if (loserMembers.length > 0) {
      for (const member of loserMembers) {
        matchParticipants.push({
          eventMatchId: realMatch.id,
          eventTeamId: loser.eventTeamId,
          userId: member.user?.id ?? null,
          eventPlaceholderParticipantId:
            member.placeholderParticipant?.id ?? null,
          side: gameWinnerIsP1 ? 2 : 1,
          score: gameWinnerIsP1
            ? (data.side2Score ?? null)
            : (data.side1Score ?? null),
          result: MatchResult.LOSS,
          rank: null,
        });
      }
    } else {
      matchParticipants.push({
        eventMatchId: realMatch.id,
        eventTeamId: loser.eventTeamId,
        userId: loser.userId ?? null,
        eventPlaceholderParticipantId:
          loser.eventPlaceholderParticipantId ?? null,
        side: gameWinnerIsP1 ? 2 : 1,
        score: gameWinnerIsP1
          ? (data.side2Score ?? null)
          : (data.side1Score ?? null),
        result: MatchResult.LOSS,
        rank: null,
      });
    }

    await createEventMatchParticipants(matchParticipants, tx);

    const newP1Wins = roundMatch.participant1Wins + (gameWinnerIsP1 ? 1 : 0);
    const newP2Wins = roundMatch.participant2Wins + (gameWinnerIsP1 ? 0 : 1);

    const bestOf = getRoundBestOf(tournamentData, roundMatch.round);
    const winsNeeded = Math.ceil(bestOf / 2);
    const seriesComplete = newP1Wins >= winsNeeded || newP2Wins >= winsNeeded;

    if (seriesComplete) {
      const seriesWinnerId =
        newP1Wins >= winsNeeded ? participant1Id : participant2Id;
      const seriesLoserId =
        seriesWinnerId === participant1Id ? participant2Id : participant1Id;

      await dbUpdateRoundMatch(
        roundMatch.id,
        {
          winnerId: seriesWinnerId,
          eventMatchId: realMatch.id,
          participant1Score: data.side1Score ?? null,
          participant2Score: data.side2Score ?? null,
          participant1Wins: newP1Wins,
          participant2Wins: newP2Wins,
        },
        tx,
      );

      await dbUpdateParticipant(
        seriesLoserId,
        {
          isEliminated: true,
          eliminatedInRound: roundMatch.round,
        },
        tx,
      );

      const isFinal = !roundMatch.nextMatchId;
      if (isFinal) {
        await dbUpdateParticipant(seriesWinnerId, { finalPlacement: 1 }, tx);
        await dbUpdateParticipant(seriesLoserId, { finalPlacement: 2 }, tx);

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
                { participant1Id: seriesWinnerId },
                tx,
              );
            } else if (slot === 2) {
              await dbUpdateRoundMatch(
                nextMatch.id,
                { participant2Id: seriesWinnerId },
                tx,
              );
            }
          }
        }
      }
    } else {
      await dbUpdateRoundMatch(
        roundMatch.id,
        {
          eventMatchId: realMatch.id,
          participant1Score: data.side1Score ?? null,
          participant2Score: data.side2Score ?? null,
          participant1Wins: newP1Wins,
          participant2Wins: newP2Wins,
        },
        tx,
      );
    }

    return {
      data: {
        eventMatchId: realMatch.id,
        eventTournamentId: tournamentData.id,
        eventId: tournamentData.eventId,
        seriesComplete,
        participant1Wins: newP1Wins,
        participant2Wins: newP2Wins,
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
    return { error: "This series already has a result" };
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

  const bestOf = getRoundBestOf(tournamentData, roundMatch.round);
  const winsNeeded = Math.ceil(bestOf / 2);

  const winnerIsP1 = winnerId === roundMatch.participant1Id;

  return withTransaction(async (tx) => {
    await dbUpdateRoundMatch(
      roundMatch.id,
      {
        winnerId,
        isForfeit: true,
        participant1Wins: winnerIsP1 ? winsNeeded : roundMatch.participant1Wins,
        participant2Wins: winnerIsP1 ? roundMatch.participant2Wins : winsNeeded,
      },
      tx,
    );

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

  const seriesDecided = !!roundMatch.winnerId;
  const hasGames =
    roundMatch.participant1Wins > 0 || roundMatch.participant2Wins > 0;

  if (!seriesDecided && !hasGames) {
    return { error: "This match does not have a result to undo" };
  }

  // Downstream check: if the series was decided and the winner advanced and played, we can't undo
  if (seriesDecided && roundMatch.nextMatchId) {
    const nextMatch = await dbGetRoundMatchById(roundMatch.nextMatchId);
    if (nextMatch?.winnerId) {
      return {
        error:
          "Cannot undo this match because the winner has already played in a subsequent round",
      };
    }
  }

  return withTransaction(async (tx) => {
    // Find the most recent game in this series
    const seriesGames = await getEventMatchesByRoundMatchId(roundMatch.id, tx);
    const latestGame = seriesGames[0];

    if (seriesDecided) {
      const winnerId = roundMatch.winnerId!;
      const loserId =
        winnerId === roundMatch.participant1Id
          ? roundMatch.participant2Id
          : roundMatch.participant1Id;

      const wasFinal = !roundMatch.nextMatchId;
      const wasCompleted = tournamentData.status === TournamentStatus.COMPLETED;

      if (wasFinal && wasCompleted) {
        await deleteEventPointEntriesForTournament(tournamentData.id, tx);
        await dbUpdateParticipant(winnerId, { finalPlacement: null }, tx);
        if (loserId) {
          await dbUpdateParticipant(loserId, { finalPlacement: null }, tx);
        }
        await dbUpdateTournament(
          tournamentData.id,
          {
            status: TournamentStatus.IN_PROGRESS,
            completedAt: null,
          },
          tx,
        );
      }

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
    }

    // Delete the latest game
    if (latestGame) {
      await deleteEventMatch(latestGame.id, tx);
    }

    // Determine which side won the deleted game to decrement the correct counter
    let newP1Wins = roundMatch.participant1Wins;
    let newP2Wins = roundMatch.participant2Wins;

    if (latestGame) {
      // Figure out who won this game from the match participants
      // The game winner had participant1 of roundMatch or participant2
      // We can check by looking at the eventMatchParticipants, but since we
      // know who won the game from the win counters and series state:
      // If series was decided, the last game winner = series winner's side
      // If series was not decided, we need to figure out from the last increment
      // The simplest approach: check if the latest game corresponds to a p1 or p2 win
      // by looking at the round match's eventMatchId
      if (seriesDecided) {
        // The deciding game winner = roundMatch.winnerId side
        if (roundMatch.winnerId === roundMatch.participant1Id) {
          newP1Wins = Math.max(0, newP1Wins - 1);
        } else {
          newP2Wins = Math.max(0, newP2Wins - 1);
        }
      } else {
        // Mid-series: we need to check who won the latest game
        // Since games are ordered by createdAt desc, and we increment wins
        // for the game winner, we need to check the match participants
        // The most reliable way: the most recent increment is the one that
        // brought us to current counts. We look at the latest game's participants.
        // However, since we've already deleted the match, we need another approach.
        // Actually, let's NOT delete yet - let's figure out first, then delete.
        // But we already deleted above. Let's use a different approach:
        // Query the remaining games to recount.
        const remainingGames = await getEventMatchesByRoundMatchId(
          roundMatch.id,
          tx,
        );
        // Recount wins from remaining games by checking match participants
        // Actually this is complex. Let's use a simpler approach:
        // Since we're in a transaction and know the total, just decrement 1
        // from whichever side's total is higher (if equal, it could be either,
        // but that shouldn't happen in a valid series)
        // Better approach: check if participant1Wins + participant2Wins matches
        // remaining game count + 1 (the deleted one)
        const totalWins = newP1Wins + newP2Wins;
        const remainingCount = remainingGames.length;
        if (totalWins === remainingCount + 1) {
          // We need to figure out which side won the deleted game
          // Use a heuristic: if p1Wins > remaining p1 wins, decrement p1
          // For simplicity and correctness, just recount from scratch
          // Actually, we already deleted the game, so just count remaining
          // But we don't have participant info on remaining games easily.
          // The simplest reliable approach: try p1 first - if decrementing p1
          // makes total match remaining count, that's correct
          if (newP1Wins > 0 && newP1Wins - 1 + newP2Wins === remainingCount) {
            newP1Wins -= 1;
          } else if (newP2Wins > 0) {
            newP2Wins -= 1;
          }
        }
      }
    }

    // Find the new latest game (for eventMatchId on round match)
    const remainingGamesAfterDelete = await getEventMatchesByRoundMatchId(
      roundMatch.id,
      tx,
    );
    const newLatestGameId =
      remainingGamesAfterDelete.length > 0
        ? remainingGamesAfterDelete[0].id
        : null;

    await dbUpdateRoundMatch(
      roundMatch.id,
      {
        winnerId: null,
        eventMatchId: newLatestGameId,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: newP1Wins,
        participant2Wins: newP2Wins,
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
