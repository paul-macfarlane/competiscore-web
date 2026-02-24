import {
  EventTournamentGroupWithParticipants,
  EventTournamentParticipantWithDetails,
  EventTournamentRoundMatchWithDetails,
  EventTournamentWithDetails,
  addEventTournamentParticipant as dbAddParticipant,
  addEventTournamentParticipantMembers as dbAddParticipantMembers,
  bulkUpdateGroupParticipants as dbBulkUpdateGroupParticipants,
  bulkUpdateEventParticipantSeeds as dbBulkUpdateSeeds,
  checkIndividualInEventTournamentPartnership as dbCheckIndividualInPartnership,
  checkIndividualInEventTournament as dbCheckIndividualInTournament,
  checkEventTournamentNameExists as dbCheckNameExists,
  countEventTournamentParticipants as dbCountParticipants,
  countEventTournamentsByEventId as dbCountTournaments,
  createEventTournamentGroupParticipants as dbCreateGroupParticipants,
  createEventTournamentGroups as dbCreateGroups,
  createEventTournamentRoundMatches as dbCreateRoundMatches,
  createEventTournament as dbCreateTournament,
  deleteAllEventTournamentGroups as dbDeleteAllGroups,
  deleteAllEventTournamentRoundMatches as dbDeleteAllRoundMatches,
  deleteGroupParticipantsByGroupIds as dbDeleteGroupParticipantsByGroupIds,
  deleteEventTournamentGroupsByRound as dbDeleteGroupsByRound,
  deleteEventTournamentRoundMatchesByRound as dbDeleteRoundMatchesByRound,
  deleteEventTournament as dbDeleteTournament,
  getEventTournamentBracket as dbGetBracket,
  getEventTournamentGroupById as dbGetGroupById,
  getEventTournamentGroupParticipants as dbGetGroupParticipants,
  getEventTournamentGroupsByRound as dbGetGroupsByRound,
  getEventTournamentGroupsWithParticipants as dbGetGroupsWithParticipants,
  getEventTournamentParticipantById as dbGetParticipantById,
  getEventTournamentParticipantMembers as dbGetParticipantMembers,
  getEventTournamentParticipants as dbGetParticipants,
  getEventTournamentRoundMatchById as dbGetRoundMatchById,
  getEventTournamentRoundMatchesByRound as dbGetRoundMatchesByRound,
  getEventTournamentById as dbGetTournamentById,
  getEventTournamentWithDetails as dbGetTournamentWithDetails,
  getEventTournamentsByEventId as dbGetTournamentsByEventId,
  removeEventTournamentParticipant as dbRemoveParticipant,
  resetAllEventTournamentParticipants as dbResetAllParticipants,
  updateEventTournamentGroup as dbUpdateGroup,
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
  deleteEventMatchesForTournament,
  deleteEventPointEntriesForTournament,
  getEventGameTypeById,
  getEventMatchesByRoundMatchId,
  getEventParticipant,
  getTeamForPlaceholder,
  getTeamForUser,
} from "@/db/events";
import { DBOrTx, withTransaction } from "@/db/index";
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
  type FFARoundConfig,
  distributeIntoGroups,
  validateFFARoundConfig,
} from "@/lib/shared/ffa-group-generator";
import {
  getPartnershipSize,
  isPartnershipGameType,
  parseFFAConfig,
  parseH2HConfig,
} from "@/lib/shared/game-config-parser";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import {
  SwissMatchRecord,
  computeSwissStandings,
  generateSwissNextRound,
  generateSwissRound1,
  getSwissRanking,
} from "@/lib/shared/swiss-pairing";
import {
  type PlacementPointConfig,
  addEventTournamentParticipantSchema,
  addEventTournamentPartnershipSchema,
  createEventTournamentSchema,
  eventTournamentIdSchema,
  forfeitEventTournamentMatchSchema,
  generateEventBracketSchema,
  manualFFAGroupSetupSchema,
  manualSwissRound1SetupSchema,
  recordEventTournamentMatchResultSchema,
  recordFFAGroupResultSchema,
  removeEventTournamentParticipantSchema,
  reseedEventTournamentSchema,
  setEventParticipantSeedsSchema,
  undoEventTournamentMatchResultSchema,
  undoFFAGroupResultSchema,
  updateEventTournamentSchema,
  updateFFAGroupAssignmentsSchema,
  updateSwissRoundPairingsSchema,
} from "@/validators/events";

import {
  MAX_FFA_GROUP_SIZE,
  MAX_TOURNAMENTS_PER_LEAGUE,
  MAX_TOURNAMENT_PARTICIPANTS,
  MIN_FFA_GROUP_SIZE,
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
  groups: EventTournamentGroupWithParticipants[];
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

  const isFFAGroupStage =
    data.tournamentType === TournamentType.FFA_GROUP_STAGE;

  if (isFFAGroupStage) {
    if (gameType.category !== GameCategory.FREE_FOR_ALL) {
      return {
        error: "FFA Group Stage tournaments require a free-for-all game type",
      };
    }
  } else {
    if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
      return {
        error:
          "Single Elimination and Swiss tournaments require a head-to-head game type",
      };
    }
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

  const isSwiss = data.tournamentType === TournamentType.SWISS;

  const newTournament = await dbCreateTournament({
    eventId: data.eventId,
    eventGameTypeId: data.gameTypeId,
    name: data.name,
    description: data.description ?? null,
    logo: data.logo ?? null,
    tournamentType: data.tournamentType,
    status: TournamentStatus.DRAFT,
    participantType: data.participantType,
    seedingType:
      isSwiss || isFFAGroupStage
        ? SeedingType.RANDOM
        : (data.seedingType ?? SeedingType.RANDOM),
    bestOf: isSwiss || isFFAGroupStage ? 1 : (data.bestOf ?? 1),
    roundBestOf:
      isSwiss || isFFAGroupStage
        ? null
        : data.roundBestOf
          ? JSON.stringify(data.roundBestOf)
          : null,
    roundConfig:
      isFFAGroupStage && data.roundConfig
        ? JSON.stringify(data.roundConfig)
        : null,
    placementPointConfig: data.placementPointConfig
      ? JSON.stringify(data.placementPointConfig)
      : null,
    totalRounds: isSwiss ? (data.swissRounds ?? null) : null,
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
  const isInProgress = tournamentData.status === TournamentStatus.IN_PROGRESS;
  const isCompleted = tournamentData.status === TournamentStatus.COMPLETED;
  const isSwissTournament =
    tournamentData.tournamentType === TournamentType.SWISS;
  const hasDraftOnlyFields =
    data.seedingType !== undefined ||
    data.startDate !== undefined ||
    data.roundConfig !== undefined ||
    data.tournamentType !== undefined;

  const hasSwissRoundsUpdate =
    data.swissRounds !== undefined && isInProgress && isSwissTournament;

  if (
    !isDraft &&
    (hasDraftOnlyFields ||
      (data.swissRounds !== undefined && !hasSwissRoundsUpdate))
  ) {
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

  let seedingTypeToApply: EventTournament["seedingType"] | undefined;
  let totalRoundsToApply: number | null | undefined;
  let tournamentTypeToApply: EventTournament["tournamentType"] | undefined;

  if (isDraft) {
    const newTournamentType =
      data.tournamentType ?? tournamentData.tournamentType;
    const isNowSwiss = newTournamentType === TournamentType.SWISS;
    const formatChanged = data.tournamentType !== undefined;

    tournamentTypeToApply = data.tournamentType as
      | EventTournament["tournamentType"]
      | undefined;

    if (isNowSwiss) {
      seedingTypeToApply = SeedingType.RANDOM as EventTournament["seedingType"];
    } else {
      seedingTypeToApply = data.seedingType as
        | EventTournament["seedingType"]
        | undefined;
    }

    if (data.swissRounds !== undefined && isNowSwiss) {
      totalRoundsToApply = data.swissRounds;
    } else if (formatChanged) {
      totalRoundsToApply = null;
    }
  }

  if (hasSwissRoundsUpdate && data.swissRounds !== tournamentData.totalRounds) {
    const bracket = await dbGetBracket(eventTournamentId);
    const currentRound =
      bracket.length > 0 ? Math.max(...bracket.map((m) => m.round)) : 0;
    if (data.swissRounds! <= currentRound) {
      return {
        error: "Validation failed",
        fieldErrors: {
          swissRounds: `Must be greater than the current round (${currentRound})`,
        },
      };
    }
    totalRoundsToApply = data.swissRounds;
  }

  const updatePayload = {
    name: data.name,
    description: data.description,
    logo: data.logo,
    bestOf: data.bestOf,
    ...(data.roundBestOf !== undefined && {
      roundBestOf: data.roundBestOf ? JSON.stringify(data.roundBestOf) : null,
    }),
    ...(totalRoundsToApply !== undefined && {
      totalRounds: totalRoundsToApply,
    }),
    placementPointConfig:
      data.placementPointConfig !== undefined
        ? data.placementPointConfig.length > 0
          ? JSON.stringify(data.placementPointConfig)
          : null
        : undefined,
    ...(isDraft && {
      tournamentType: tournamentTypeToApply,
      seedingType: seedingTypeToApply,
      startDate: data.startDate,
      ...(data.roundConfig !== undefined && {
        roundConfig: data.roundConfig ? JSON.stringify(data.roundConfig) : null,
      }),
    }),
  };

  const needsPointRecalculation =
    isCompleted && data.placementPointConfig !== undefined;

  let updated: EventTournament | undefined;

  if (needsPointRecalculation) {
    updated =
      (await withTransaction(async (tx) => {
        const result = await dbUpdateTournament(
          eventTournamentId,
          updatePayload,
          tx,
        );
        if (!result) return null;
        await deleteEventPointEntriesForTournament(eventTournamentId, tx);
        await awardTournamentPlacementPoints(result, tx);
        return result;
      })) ?? undefined;
  } else {
    updated = await dbUpdateTournament(eventTournamentId, updatePayload);
  }

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

  await withTransaction(async (tx) => {
    await deleteEventMatchesForTournament(eventTournamentId, tx);
    await dbDeleteTournament(eventTournamentId, tx);
  });

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

  const isFFAGroupStage =
    tournamentData.tournamentType === TournamentType.FFA_GROUP_STAGE;

  const [bracket, participants, groups] = await Promise.all([
    isFFAGroupStage ? Promise.resolve([]) : dbGetBracket(tournamentId),
    dbGetParticipants(tournamentId),
    isFFAGroupStage
      ? dbGetGroupsWithParticipants(tournamentId)
      : Promise.resolve([]),
  ]);

  return {
    data: {
      ...tournamentData,
      bracket,
      participants,
      groups,
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

  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;
  const isFFAGroupStage =
    tournamentData.tournamentType === TournamentType.FFA_GROUP_STAGE;

  if (
    !isSwiss &&
    !isFFAGroupStage &&
    tournamentData.seedingType === SeedingType.MANUAL
  ) {
    const allSeeded = participants.every((p) => p.seed !== null);
    if (!allSeeded) {
      return { error: "All participants must have seeds assigned" };
    }
  }

  if (isSwiss) {
    return generateEventSwissBracket(
      eventTournamentId,
      tournamentData,
      participants,
    );
  }

  if (isFFAGroupStage) {
    return generateFFAGroupStage(
      eventTournamentId,
      tournamentData,
      participants,
    );
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

function getEventParticipantName(
  p: EventTournamentParticipantWithDetails,
): string {
  if (p.user) return p.user.name;
  if (p.placeholderParticipant) return p.placeholderParticipant.displayName;
  if (p.members && p.members.length > 0) {
    return p.members
      .map(
        (m) =>
          m.user?.name ?? m.placeholderParticipant?.displayName ?? "Unknown",
      )
      .join(" & ");
  }
  return p.team.name;
}

async function generateEventSwissBracket(
  eventTournamentId: string,
  tournamentData: EventTournament,
  participants: EventTournamentParticipantWithDetails[],
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  return withTransaction(async (tx) => {
    const participantNames = participants.map((p) => ({
      id: p.id,
      name: getEventParticipantName(p),
    }));

    const round1 = generateSwissRound1(participantNames);

    const totalRounds =
      tournamentData.totalRounds ?? Math.ceil(Math.log2(participants.length));

    const roundMatchData = round1.pairings.map((pairing, i) => ({
      eventTournamentId,
      round: 1,
      position: i + 1,
      participant1Id: pairing.participant1Id,
      participant2Id: pairing.participant2Id as string | null,
      winnerId: null as string | null,
      eventMatchId: null as string | null,
      isBye: false,
      isForfeit: false,
      participant1Score: null as number | null,
      participant2Score: null as number | null,
      nextMatchId: null as string | null,
      nextMatchSlot: null as number | null,
    }));

    if (round1.byeParticipantId) {
      roundMatchData.push({
        eventTournamentId,
        round: 1,
        position: roundMatchData.length + 1,
        participant1Id: round1.byeParticipantId,
        participant2Id: null,
        winnerId: round1.byeParticipantId,
        eventMatchId: null as string | null,
        isBye: true,
        isForfeit: false,
        participant1Score: null as number | null,
        participant2Score: null as number | null,
        nextMatchId: null as string | null,
        nextMatchSlot: null as number | null,
      });
    }

    await dbCreateRoundMatches(roundMatchData, tx);

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

async function handleEventSwissRoundCompletion(
  tournamentData: EventTournament,
  currentRound: number,
  tx: DBOrTx,
): Promise<void> {
  const roundMatches = await dbGetRoundMatchesByRound(
    tournamentData.id,
    currentRound,
    tx,
  );

  const allResolved = roundMatches.every(
    (m) => m.winnerId !== null || m.isDraw || m.isBye,
  );

  if (!allResolved) return;

  const isFinalRound =
    tournamentData.totalRounds !== null &&
    currentRound >= tournamentData.totalRounds;

  if (isFinalRound) {
    await completeEventSwissTournament(tournamentData, tx);
  } else {
    await generateNextEventSwissRoundInternal(tournamentData, currentRound, tx);
  }
}

async function completeEventSwissTournament(
  tournamentData: EventTournament,
  tx: DBOrTx,
): Promise<void> {
  const participants = await dbGetParticipants(tournamentData.id, tx);
  const bracket = await dbGetBracket(tournamentData.id, tx);

  const participantNames = participants.map((p) => ({
    id: p.id,
    name: getEventParticipantName(p),
  }));

  const matchRecords: SwissMatchRecord[] = bracket.map((m) => ({
    participant1Id: m.participant1Id,
    participant2Id: m.participant2Id,
    winnerId: m.winnerId,
    isDraw: m.isDraw,
    isBye: m.isBye,
    isForfeit: m.isForfeit,
  }));

  const standings = computeSwissStandings(participantNames, matchRecords);
  const ranking = getSwissRanking(standings);

  for (let i = 0; i < ranking.length; i++) {
    await dbUpdateParticipant(
      ranking[i].participantId,
      { finalPlacement: i + 1 },
      tx,
    );
  }

  await dbUpdateTournament(
    tournamentData.id,
    {
      status: TournamentStatus.COMPLETED,
      completedAt: new Date(),
    },
    tx,
  );

  const completedTournament = await dbGetTournamentById(tournamentData.id, tx);
  if (completedTournament) {
    await awardTournamentPlacementPoints(completedTournament, tx);
  }
}

async function generateNextEventSwissRoundInternal(
  tournamentData: EventTournament,
  currentRound: number,
  tx: DBOrTx,
): Promise<void> {
  const participants = await dbGetParticipants(tournamentData.id, tx);
  const bracket = await dbGetBracket(tournamentData.id, tx);

  const participantNames = participants.map((p) => ({
    id: p.id,
    name: getEventParticipantName(p),
  }));

  const matchRecords: SwissMatchRecord[] = bracket.map((m) => ({
    participant1Id: m.participant1Id,
    participant2Id: m.participant2Id,
    winnerId: m.winnerId,
    isDraw: m.isDraw,
    isBye: m.isBye,
    isForfeit: m.isForfeit,
  }));

  const standings = computeSwissStandings(participantNames, matchRecords);
  const nextRound = generateSwissNextRound(standings);
  const newRoundNumber = currentRound + 1;

  const roundMatchData = nextRound.pairings.map((pairing, i) => ({
    eventTournamentId: tournamentData.id,
    round: newRoundNumber,
    position: i + 1,
    participant1Id: pairing.participant1Id,
    participant2Id: pairing.participant2Id as string | null,
    winnerId: null as string | null,
    eventMatchId: null as string | null,
    isBye: false,
    isForfeit: false,
    participant1Score: null as number | null,
    participant2Score: null as number | null,
    nextMatchId: null as string | null,
    nextMatchSlot: null as number | null,
  }));

  if (nextRound.byeParticipantId) {
    roundMatchData.push({
      eventTournamentId: tournamentData.id,
      round: newRoundNumber,
      position: roundMatchData.length + 1,
      participant1Id: nextRound.byeParticipantId,
      participant2Id: null,
      winnerId: nextRound.byeParticipantId,
      eventMatchId: null as string | null,
      isBye: true,
      isForfeit: false,
      participant1Score: null as number | null,
      participant2Score: null as number | null,
      nextMatchId: null as string | null,
      nextMatchSlot: null as number | null,
    });
  }

  await dbCreateRoundMatches(roundMatchData, tx);
}

async function awardTournamentPlacementPoints(
  tournament: EventTournament,
  tx: DBOrTx,
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

  if (roundMatch.winnerId || roundMatch.isDraw) {
    return { error: "This match already has a result" };
  }

  if (!roundMatch.participant1Id || !roundMatch.participant2Id) {
    return { error: "Both participants must be set before recording a result" };
  }

  const participant1Id = roundMatch.participant1Id;
  const participant2Id = roundMatch.participant2Id;
  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;

  return withTransaction(async (tx) => {
    const gameType = await getEventGameTypeById(
      tournamentData.eventGameTypeId,
      tx,
    );
    if (!gameType) {
      return { error: "Game type not found" };
    }

    const h2hConfig = parseH2HConfig(gameType.config);

    let winnerId: string | null = null;
    let isDraw = false;

    if (h2hConfig.scoringType === ScoringType.SCORE_BASED) {
      if (data.side1Score == null || data.side2Score == null) {
        return { error: "Scores are required for this game type" };
      }
      if (data.side1Score === data.side2Score) {
        if (!isSwiss) {
          return { error: "Tournament matches cannot end in a draw" };
        }
        isDraw = true;
      } else {
        winnerId =
          data.side1Score > data.side2Score ? participant1Id : participant2Id;
      }
    } else {
      if (!data.winningSide) {
        return { error: "Winner selection is required" };
      }
      if (data.winningSide === "draw") {
        if (!isSwiss) {
          return { error: "Draws are not allowed in this tournament type" };
        }
        isDraw = true;
      } else {
        winnerId =
          data.winningSide === "side1" ? participant1Id : participant2Id;
      }
    }

    const p1 = await dbGetParticipantById(participant1Id, tx);
    const p2 = await dbGetParticipantById(participant2Id, tx);

    if (!p1 || !p2) {
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

    const [p1Members, p2Members] = await Promise.all([
      dbGetParticipantMembers(participant1Id, tx),
      dbGetParticipantMembers(participant2Id, tx),
    ]);

    const matchParticipants: Parameters<
      typeof createEventMatchParticipants
    >[0] = [];

    if (isDraw) {
      // Draw: both sides get DRAW result
      const addDrawParticipants = (
        participant: EventTournamentParticipant,
        members: Awaited<ReturnType<typeof dbGetParticipantMembers>>,
        side: number,
        score: number | null,
      ) => {
        if (members.length > 0) {
          for (const member of members) {
            matchParticipants.push({
              eventMatchId: realMatch.id,
              eventTeamId: participant.eventTeamId,
              userId: member.user?.id ?? null,
              eventPlaceholderParticipantId:
                member.placeholderParticipant?.id ?? null,
              side,
              score,
              result: MatchResult.DRAW,
              rank: null,
            });
          }
        } else {
          matchParticipants.push({
            eventMatchId: realMatch.id,
            eventTeamId: participant.eventTeamId,
            userId: participant.userId ?? null,
            eventPlaceholderParticipantId:
              participant.eventPlaceholderParticipantId ?? null,
            side,
            score,
            result: MatchResult.DRAW,
            rank: null,
          });
        }
      };

      addDrawParticipants(p1, p1Members, 1, data.side1Score ?? null);
      addDrawParticipants(p2, p2Members, 2, data.side2Score ?? null);

      await createEventMatchParticipants(matchParticipants, tx);

      await dbUpdateRoundMatch(
        roundMatch.id,
        {
          isDraw: true,
          eventMatchId: realMatch.id,
          participant1Score: data.side1Score ?? null,
          participant2Score: data.side2Score ?? null,
        },
        tx,
      );

      await handleEventSwissRoundCompletion(
        tournamentData,
        roundMatch.round,
        tx,
      );

      return {
        data: {
          eventMatchId: realMatch.id,
          eventTournamentId: tournamentData.id,
          eventId: tournamentData.eventId,
          seriesComplete: true,
          participant1Wins: 0,
          participant2Wins: 0,
        },
      };
    }

    // Non-draw: there is a winner
    const gameWinnerId = winnerId!;
    const gameWinnerIsP1 = gameWinnerId === participant1Id;
    const winner = gameWinnerIsP1 ? p1 : p2;
    const loser = gameWinnerIsP1 ? p2 : p1;
    const winnerMembers = gameWinnerIsP1 ? p1Members : p2Members;
    const loserMembers = gameWinnerIsP1 ? p2Members : p1Members;

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

    if (isSwiss) {
      // Swiss: single game per match, immediately resolves
      await dbUpdateRoundMatch(
        roundMatch.id,
        {
          winnerId: gameWinnerId,
          eventMatchId: realMatch.id,
          participant1Score: data.side1Score ?? null,
          participant2Score: data.side2Score ?? null,
        },
        tx,
      );

      await handleEventSwissRoundCompletion(
        tournamentData,
        roundMatch.round,
        tx,
      );

      return {
        data: {
          eventMatchId: realMatch.id,
          eventTournamentId: tournamentData.id,
          eventId: tournamentData.eventId,
          seriesComplete: true,
          participant1Wins: gameWinnerIsP1 ? 1 : 0,
          participant2Wins: gameWinnerIsP1 ? 0 : 1,
        },
      };
    }

    // Single elimination: best-of series logic
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

  if (roundMatch.winnerId || roundMatch.isDraw) {
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

  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;

  return withTransaction(async (tx) => {
    await dbUpdateRoundMatch(roundMatch.id, { winnerId, isForfeit: true }, tx);

    if (isSwiss) {
      await handleEventSwissRoundCompletion(
        tournamentData,
        roundMatch.round,
        tx,
      );
    } else {
      const bestOf = getRoundBestOf(tournamentData, roundMatch.round);
      const winsNeeded = Math.ceil(bestOf / 2);
      const winnerIsP1 = winnerId === roundMatch.participant1Id;

      await dbUpdateRoundMatch(
        roundMatch.id,
        {
          participant1Wins: winnerIsP1
            ? winsNeeded
            : roundMatch.participant1Wins,
          participant2Wins: winnerIsP1
            ? roundMatch.participant2Wins
            : winsNeeded,
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

  if (!canPerformEventAction(participation.role, EventAction.RECORD_MATCHES)) {
    return {
      error: "You do not have permission to manage tournament matches",
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
        error: "Only organizers can undo team tournament match results",
      };
    }
    const p1 = roundMatch.participant1Id
      ? await dbGetParticipantById(roundMatch.participant1Id)
      : null;
    const p2 = roundMatch.participant2Id
      ? await dbGetParticipantById(roundMatch.participant2Id)
      : null;
    let isInvolved = p1?.userId === userId || p2?.userId === userId;
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
        error: "You can only undo results for matches you're involved in",
      };
    }
  }

  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;
  const hasResult = !!roundMatch.winnerId || roundMatch.isDraw;
  const hasGames =
    roundMatch.participant1Wins > 0 || roundMatch.participant2Wins > 0;

  if (!hasResult && !hasGames) {
    return { error: "This match does not have a result to undo" };
  }

  if (isSwiss && hasResult) {
    // For Swiss, block undo if a later round has already been generated
    const bracket = await dbGetBracket(roundMatch.eventTournamentId);
    const maxRound = Math.max(...bracket.map((m) => m.round), 0);
    if (maxRound > roundMatch.round) {
      return {
        error:
          "Cannot undo this match because a later round has already been generated",
      };
    }
  }

  // Downstream check for SE: if the series was decided and the winner advanced and played, we can't undo
  if (!isSwiss && hasResult && roundMatch.nextMatchId) {
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

    if (isSwiss) {
      // Swiss undo: simpler — just reset the round match
      const wasCompleted = tournamentData.status === TournamentStatus.COMPLETED;
      if (wasCompleted) {
        // Un-complete the tournament, clear all placements
        await deleteEventPointEntriesForTournament(tournamentData.id, tx);
        const participants = await dbGetParticipants(tournamentData.id, tx);
        for (const p of participants) {
          if (p.finalPlacement !== null) {
            await dbUpdateParticipant(p.id, { finalPlacement: null }, tx);
          }
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

      if (latestGame) {
        await deleteEventMatch(latestGame.id, tx);
      }

      await dbUpdateRoundMatch(
        roundMatch.id,
        {
          winnerId: null,
          isDraw: false,
          eventMatchId: null,
          participant1Score: null,
          participant2Score: null,
          isForfeit: false,
        },
        tx,
      );
    } else {
      // Single elimination undo
      if (hasResult) {
        const winnerId = roundMatch.winnerId!;
        const loserId =
          winnerId === roundMatch.participant1Id
            ? roundMatch.participant2Id
            : roundMatch.participant1Id;

        const wasFinal = !roundMatch.nextMatchId;
        const wasCompleted =
          tournamentData.status === TournamentStatus.COMPLETED;

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
        if (hasResult) {
          if (roundMatch.winnerId === roundMatch.participant1Id) {
            newP1Wins = Math.max(0, newP1Wins - 1);
          } else {
            newP2Wins = Math.max(0, newP2Wins - 1);
          }
        } else {
          const remainingGames = await getEventMatchesByRoundMatchId(
            roundMatch.id,
            tx,
          );
          const totalWins = newP1Wins + newP2Wins;
          const remainingCount = remainingGames.length;
          if (totalWins === remainingCount + 1) {
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
    }

    return {
      data: {
        eventTournamentId: tournamentData.id,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function updateSwissRoundPairings(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = updateSwissRoundPairingsSchema.safeParse(input);
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

  if (tournamentData.tournamentType !== TournamentType.SWISS) {
    return { error: "This action is only for Swiss tournaments" };
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
    return { error: "You do not have permission to manage tournaments" };
  }

  const bracket = await dbGetBracket(data.eventTournamentId);
  if (bracket.length === 0) {
    return { error: "No rounds exist yet" };
  }

  const currentRound = Math.max(...bracket.map((m) => m.round));
  if (data.round !== currentRound) {
    return { error: "Can only edit pairings for the current round" };
  }

  const roundMatches = bracket.filter((m) => m.round === data.round);

  // Verify no matches have been recorded in this round (excluding byes)
  const hasRecordedMatches = roundMatches.some(
    (m) =>
      !m.isBye && (m.winnerId !== null || m.isDraw || m.eventMatchId !== null),
  );
  if (hasRecordedMatches) {
    return {
      error: "Cannot edit pairings after matches have been recorded",
    };
  }

  // Validate participant IDs: collect all from existing round
  const participants = await dbGetParticipants(data.eventTournamentId);
  const validParticipantIds = new Set(participants.map((p) => p.id));

  // Collect all participant IDs from new pairings
  const newParticipantIds: string[] = [];
  let byeCount = 0;
  for (const pairing of data.pairings) {
    if (!validParticipantIds.has(pairing.participant1Id)) {
      return { error: "Invalid participant ID in pairings" };
    }
    newParticipantIds.push(pairing.participant1Id);

    if (pairing.isBye) {
      byeCount++;
      if (pairing.participant2Id !== null) {
        return { error: "Bye matches must not have a second participant" };
      }
    } else {
      if (pairing.participant2Id === null) {
        return { error: "Non-bye matches must have two participants" };
      }
      if (!validParticipantIds.has(pairing.participant2Id)) {
        return { error: "Invalid participant ID in pairings" };
      }
      newParticipantIds.push(pairing.participant2Id);
    }
  }

  // Each participant must appear exactly once
  if (newParticipantIds.length !== new Set(newParticipantIds).size) {
    return { error: "Each participant must appear exactly once in pairings" };
  }

  if (newParticipantIds.length !== participants.length) {
    return { error: "Pairings must include all tournament participants" };
  }

  // Validate bye count: should be 0 or 1 (1 if odd number of participants)
  const expectedByeCount = participants.length % 2 === 1 ? 1 : 0;
  if (byeCount !== expectedByeCount) {
    return {
      error:
        expectedByeCount === 0
          ? "No byes should exist with an even number of participants"
          : "Exactly one bye is required with an odd number of participants",
    };
  }

  return withTransaction(async (tx) => {
    await dbDeleteRoundMatchesByRound(data.eventTournamentId, data.round, tx);

    const roundMatchData = data.pairings.map((pairing, i) => ({
      eventTournamentId: data.eventTournamentId,
      round: data.round,
      position: i + 1,
      participant1Id: pairing.participant1Id,
      participant2Id: pairing.participant2Id,
      winnerId: pairing.isBye
        ? pairing.participant1Id
        : (null as string | null),
      eventMatchId: null as string | null,
      isBye: pairing.isBye,
      isForfeit: false,
      participant1Score: null as number | null,
      participant2Score: null as number | null,
      nextMatchId: null as string | null,
      nextMatchSlot: null as number | null,
    }));

    await dbCreateRoundMatches(roundMatchData, tx);

    return {
      data: {
        eventTournamentId: data.eventTournamentId,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function generateNextEventSwissRound(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
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

  if (tournamentData.tournamentType !== TournamentType.SWISS) {
    return { error: "This action is only for Swiss tournaments" };
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
    return { error: "You do not have permission to manage tournaments" };
  }

  const bracket = await dbGetBracket(eventTournamentId);
  if (bracket.length === 0) {
    return { error: "No rounds exist yet" };
  }

  const currentRound = Math.max(...bracket.map((m) => m.round));

  const roundMatches = bracket.filter((m) => m.round === currentRound);
  const allResolved = roundMatches.every(
    (m) => m.winnerId !== null || m.isDraw || m.isBye,
  );

  if (!allResolved) {
    return {
      error: "All matches in the current round must be completed first",
    };
  }

  if (
    tournamentData.totalRounds !== null &&
    currentRound >= tournamentData.totalRounds
  ) {
    return { error: "All rounds have been completed" };
  }

  return withTransaction(async (tx) => {
    await generateNextEventSwissRoundInternal(tournamentData, currentRound, tx);

    return {
      data: {
        eventTournamentId: tournamentData.id,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function deleteSwissCurrentRound(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
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

  if (tournamentData.tournamentType !== TournamentType.SWISS) {
    return { error: "This action is only for Swiss tournaments" };
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
    return { error: "You do not have permission to manage tournaments" };
  }

  const bracket = await dbGetBracket(eventTournamentId);
  if (bracket.length === 0) {
    return { error: "No rounds exist yet" };
  }

  const currentRound = Math.max(...bracket.map((m) => m.round));
  if (currentRound <= 1) {
    return { error: "Cannot delete the first round" };
  }

  const roundMatches = bracket.filter((m) => m.round === currentRound);
  const hasRecordedMatches = roundMatches.some(
    (m) =>
      !m.isBye && (m.winnerId !== null || m.isDraw || m.eventMatchId !== null),
  );
  if (hasRecordedMatches) {
    return {
      error: "Cannot delete round with recorded matches",
    };
  }

  await dbDeleteRoundMatchesByRound(eventTournamentId, currentRound);

  return {
    data: {
      eventTournamentId,
      eventId: tournamentData.eventId,
    },
  };
}

export async function reseedEventTournament(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = reseedEventTournamentSchema.safeParse(input);
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

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament must be in progress to re-seed" };
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

  const bracket = await dbGetBracket(eventTournamentId);
  const hasMatchesPlayed = bracket.some(
    (m) =>
      !m.isBye && (m.winnerId !== null || m.isDraw || m.eventMatchId !== null),
  );
  if (hasMatchesPlayed) {
    return { error: "Cannot re-seed after matches have been played" };
  }

  const participants = await dbGetParticipants(eventTournamentId);
  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;

  if (isSwiss) {
    return withTransaction(async (tx) => {
      await dbDeleteAllRoundMatches(eventTournamentId, tx);

      const participantNames = participants.map((p) => ({
        id: p.id,
        name: getEventParticipantName(p),
      }));

      const round1 = generateSwissRound1(participantNames);

      const roundMatchData = round1.pairings.map((pairing, i) => ({
        eventTournamentId,
        round: 1,
        position: i + 1,
        participant1Id: pairing.participant1Id,
        participant2Id: pairing.participant2Id as string | null,
        winnerId: null as string | null,
        eventMatchId: null as string | null,
        isBye: false,
        isForfeit: false,
        participant1Score: null as number | null,
        participant2Score: null as number | null,
        nextMatchId: null as string | null,
        nextMatchSlot: null as number | null,
      }));

      if (round1.byeParticipantId) {
        roundMatchData.push({
          eventTournamentId,
          round: 1,
          position: roundMatchData.length + 1,
          participant1Id: round1.byeParticipantId,
          participant2Id: null,
          winnerId: round1.byeParticipantId,
          eventMatchId: null as string | null,
          isBye: true,
          isForfeit: false,
          participant1Score: null as number | null,
          participant2Score: null as number | null,
          nextMatchId: null as string | null,
          nextMatchSlot: null as number | null,
        });
      }

      await dbCreateRoundMatches(roundMatchData, tx);

      return {
        data: {
          eventTournamentId,
          eventId: tournamentData.eventId,
        },
      };
    });
  }

  return withTransaction(async (tx) => {
    await dbDeleteAllRoundMatches(eventTournamentId, tx);

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
    const seededParticipants = shuffled.map((p, i) => ({
      ...p,
      seed: i + 1,
    }));

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

    await dbUpdateTournament(eventTournamentId, { totalRounds }, tx);

    return {
      data: {
        eventTournamentId,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function revertEventTournamentToDraft(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
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

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament must be in progress to revert to draft" };
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

  const isFFAGroupStage =
    tournamentData.tournamentType === TournamentType.FFA_GROUP_STAGE;

  if (isFFAGroupStage) {
    const groups = await dbGetGroupsWithParticipants(eventTournamentId);
    const hasCompletedGroups = groups.some((g) => g.isCompleted);
    if (hasCompletedGroups) {
      return {
        error: "Cannot revert to draft after group results have been recorded",
      };
    }

    return withTransaction(async (tx) => {
      await dbDeleteAllGroups(eventTournamentId, tx);
      await dbResetAllParticipants(eventTournamentId, tx);
      await dbUpdateTournament(
        eventTournamentId,
        { status: TournamentStatus.DRAFT, totalRounds: null },
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

  const bracket = await dbGetBracket(eventTournamentId);
  const hasMatchesPlayed = bracket.some(
    (m) =>
      !m.isBye && (m.winnerId !== null || m.isDraw || m.eventMatchId !== null),
  );
  if (hasMatchesPlayed) {
    return {
      error: "Cannot revert to draft after matches have been played",
    };
  }

  return withTransaction(async (tx) => {
    await dbDeleteAllRoundMatches(eventTournamentId, tx);
    await dbResetAllParticipants(eventTournamentId, tx);
    await dbUpdateTournament(
      eventTournamentId,
      { status: TournamentStatus.DRAFT, totalRounds: null },
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

// FFA Group Stage functions

function parseRoundConfig(tournament: EventTournament): FFARoundConfig | null {
  if (!tournament.roundConfig) return null;
  try {
    return JSON.parse(tournament.roundConfig) as FFARoundConfig;
  } catch {
    return null;
  }
}

async function generateFFAGroupStage(
  eventTournamentId: string,
  tournamentData: EventTournament,
  participants: EventTournamentParticipantWithDetails[],
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const roundConfig = parseRoundConfig(tournamentData);
  if (!roundConfig) {
    return {
      error: "Round configuration is required for FFA Group Stage tournaments",
    };
  }

  const validationError = validateFFARoundConfig(
    participants.length,
    roundConfig,
    MIN_FFA_GROUP_SIZE,
    MAX_FFA_GROUP_SIZE,
  );
  if (validationError) {
    return { error: validationError };
  }

  const round1Config = roundConfig["1"];
  if (!round1Config) {
    return { error: "Round 1 configuration is required" };
  }

  const totalRounds = Object.keys(roundConfig).length;

  return withTransaction(async (tx) => {
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

    const groupCount = Math.floor(shuffled.length / round1Config.groupSize);
    const indices = Array.from({ length: shuffled.length }, (_, i) => i);
    const groupAssignments = distributeIntoGroups(indices, groupCount);

    const groupRows = groupAssignments.map((_, groupIdx) => ({
      eventTournamentId,
      round: 1,
      position: groupIdx + 1,
      advanceCount: round1Config.advanceCount,
      isCompleted: false,
    }));

    const createdGroups = await dbCreateGroups(groupRows, tx);

    const groupParticipantRows: {
      eventTournamentGroupId: string;
      eventTournamentParticipantId: string;
    }[] = [];

    for (let g = 0; g < groupAssignments.length; g++) {
      const group = createdGroups.find(
        (cg) => cg.position === g + 1 && cg.round === 1,
      );
      if (!group) continue;
      for (const pIdx of groupAssignments[g]) {
        groupParticipantRows.push({
          eventTournamentGroupId: group.id,
          eventTournamentParticipantId: shuffled[pIdx].id,
        });
      }
    }

    await dbCreateGroupParticipants(groupParticipantRows, tx);

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

export async function recordFFAGroupResult(
  userId: string,
  input: unknown,
): Promise<
  ServiceResult<{
    eventMatchId: string;
    eventTournamentId: string;
    eventId: string;
  }>
> {
  const parsed = recordFFAGroupResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { groupId, playedAt, results } = parsed.data;

  const group = await dbGetGroupById(groupId);
  if (!group) {
    return { error: "Group not found" };
  }

  const tournamentData = await dbGetTournamentById(group.eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament is not in progress" };
  }

  if (group.isCompleted) {
    return { error: "Group result has already been recorded" };
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
    return { error: "You do not have permission to record tournament results" };
  }

  const groupParticipants = await dbGetGroupParticipants(groupId);
  if (groupParticipants.length !== results.length) {
    return {
      error: `Expected ${groupParticipants.length} results but received ${results.length}`,
    };
  }

  const groupParticipantIds = new Set(
    groupParticipants.map((gp) => gp.eventTournamentParticipantId),
  );
  for (const r of results) {
    if (!groupParticipantIds.has(r.participantId)) {
      return {
        error: `Participant ${r.participantId} is not in this group`,
      };
    }
  }

  const allParticipants = await dbGetParticipants(group.eventTournamentId);
  const participantMap = new Map(allParticipants.map((p) => [p.id, p]));

  const roundConfig = parseRoundConfig(tournamentData);
  const totalRounds = roundConfig ? Object.keys(roundConfig).length : 1;
  const isFinalRound = group.round === totalRounds;

  const gameType = await getEventGameTypeById(tournamentData.eventGameTypeId);
  const ffaConfig = gameType ? parseFFAConfig(gameType.config) : null;

  return withTransaction(async (tx) => {
    const eventMatch = await createEventMatch(
      {
        eventId: tournamentData.eventId,
        eventGameTypeId: tournamentData.eventGameTypeId,
        eventTournamentRoundMatchId: null,
        playedAt,
        recorderId: userId,
      },
      tx,
    );

    const matchParticipantData = results.map((r) => {
      const tp = participantMap.get(r.participantId);
      return {
        eventMatchId: eventMatch.id,
        eventTeamId: tp?.eventTeamId ?? null,
        userId: tp?.userId ?? null,
        eventPlaceholderParticipantId:
          tp?.eventPlaceholderParticipantId ?? null,
        side: null as number | null,
        score: r.score ?? null,
        rank: r.rank ?? null,
        result: null as MatchResult | null,
      };
    });

    await createEventMatchParticipants(matchParticipantData, tx);

    const gpMap = new Map(
      groupParticipants.map((gp) => [gp.eventTournamentParticipantId, gp]),
    );

    const sortedResults = [...results].sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      if (a.score != null && b.score != null) {
        if (ffaConfig?.scoreOrder === "lowest_wins") return a.score - b.score;
        return b.score - a.score;
      }
      return 0;
    });

    const rankedResults = sortedResults.map((r, i) => ({
      ...r,
      computedRank: r.rank ?? i + 1,
    }));

    const updates = rankedResults.map((r) => {
      const gp = gpMap.get(r.participantId);
      return {
        id: gp!.id,
        rank: r.computedRank,
        score: r.score ?? null,
        advanced: r.computedRank <= group.advanceCount,
      };
    });

    await dbBulkUpdateGroupParticipants(updates, tx);

    await dbUpdateGroup(
      groupId,
      { eventMatchId: eventMatch.id, isCompleted: true },
      tx,
    );

    if (!isFinalRound) {
      for (const r of rankedResults) {
        if (r.computedRank > group.advanceCount) {
          await dbUpdateParticipant(
            r.participantId,
            { isEliminated: true, eliminatedInRound: group.round },
            tx,
          );
        }
      }
    }

    const roundGroups = await dbGetGroupsByRound(
      group.eventTournamentId,
      group.round,
      tx,
    );
    const allGroupsComplete = roundGroups.every(
      (g) => g.id === groupId || g.isCompleted,
    );

    if (allGroupsComplete) {
      if (isFinalRound) {
        await completeFFATournament(tournamentData, roundConfig, tx);
      } else {
        await generateNextFFARound(
          tournamentData,
          group.round,
          roundConfig!,
          tx,
        );
      }
    }

    return {
      data: {
        eventMatchId: eventMatch.id,
        eventTournamentId: group.eventTournamentId,
        eventId: tournamentData.eventId,
      },
    };
  });
}

async function generateNextFFARound(
  tournamentData: EventTournament,
  completedRound: number,
  roundConfig: FFARoundConfig,
  tx: DBOrTx,
): Promise<void> {
  const nextRound = completedRound + 1;
  const nextRoundConfig = roundConfig[String(nextRound)];
  if (!nextRoundConfig) return;

  const groups = await dbGetGroupsWithParticipants(tournamentData.id, tx);

  const completedRoundGroups = groups
    .filter((g) => g.round === completedRound)
    .sort((a, b) => a.position - b.position);

  const advancingParticipantIds: string[] = [];
  for (const group of completedRoundGroups) {
    const advanced = group.participants
      .filter((p) => p.advanced)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    for (const p of advanced) {
      advancingParticipantIds.push(p.eventTournamentParticipantId);
    }
  }

  const groupCount = Math.floor(
    advancingParticipantIds.length / nextRoundConfig.groupSize,
  );
  const indices = Array.from(
    { length: advancingParticipantIds.length },
    (_, i) => i,
  );
  const groupAssignments = distributeIntoGroups(indices, groupCount);

  const groupRows = groupAssignments.map((_, groupIdx) => ({
    eventTournamentId: tournamentData.id,
    round: nextRound,
    position: groupIdx + 1,
    advanceCount: nextRoundConfig.advanceCount,
    isCompleted: false,
  }));

  const createdGroups = await dbCreateGroups(groupRows, tx);

  const groupParticipantRows: {
    eventTournamentGroupId: string;
    eventTournamentParticipantId: string;
  }[] = [];

  for (let g = 0; g < groupAssignments.length; g++) {
    const group = createdGroups.find(
      (cg) => cg.position === g + 1 && cg.round === nextRound,
    );
    if (!group) continue;
    for (const pIdx of groupAssignments[g]) {
      groupParticipantRows.push({
        eventTournamentGroupId: group.id,
        eventTournamentParticipantId: advancingParticipantIds[pIdx],
      });
    }
  }

  await dbCreateGroupParticipants(groupParticipantRows, tx);
}

async function completeFFATournament(
  tournamentData: EventTournament,
  roundConfig: FFARoundConfig | null,
  tx: DBOrTx,
): Promise<void> {
  const groups = await dbGetGroupsWithParticipants(tournamentData.id, tx);
  const totalRounds = roundConfig ? Object.keys(roundConfig).length : 1;

  type PlacementEntry = {
    participantId: string;
    eliminatedInRound: number | null;
    rank: number | null;
  };
  const entries: PlacementEntry[] = [];

  for (const group of groups) {
    for (const gp of group.participants) {
      const existing = entries.find(
        (e) => e.participantId === gp.eventTournamentParticipantId,
      );
      if (group.round === totalRounds) {
        if (existing) {
          existing.eliminatedInRound = null;
          existing.rank = gp.rank;
        } else {
          entries.push({
            participantId: gp.eventTournamentParticipantId,
            eliminatedInRound: null,
            rank: gp.rank,
          });
        }
      } else if (!existing) {
        const wasEliminated = !gp.advanced;
        entries.push({
          participantId: gp.eventTournamentParticipantId,
          eliminatedInRound: wasEliminated ? group.round : null,
          rank: gp.rank,
        });
      }
    }
  }

  entries.sort((a, b) => {
    const aFinal = a.eliminatedInRound === null;
    const bFinal = b.eliminatedInRound === null;
    if (aFinal && !bFinal) return -1;
    if (!aFinal && bFinal) return 1;
    if (aFinal && bFinal) {
      return (a.rank ?? 999) - (b.rank ?? 999);
    }
    const aRound = a.eliminatedInRound ?? 0;
    const bRound = b.eliminatedInRound ?? 0;
    if (aRound !== bRound) return bRound - aRound;
    return (a.rank ?? 999) - (b.rank ?? 999);
  });

  for (let i = 0; i < entries.length; i++) {
    await dbUpdateParticipant(
      entries[i].participantId,
      { finalPlacement: i + 1 },
      tx,
    );
  }

  await dbUpdateTournament(
    tournamentData.id,
    {
      status: TournamentStatus.COMPLETED,
      completedAt: new Date(),
    },
    tx,
  );

  const completedTournament = await dbGetTournamentById(tournamentData.id, tx);
  if (completedTournament) {
    await awardTournamentPlacementPoints(completedTournament, tx);
  }
}

export async function undoFFAGroupResult(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = undoFFAGroupResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { groupId } = parsed.data;

  const group = await dbGetGroupById(groupId);
  if (!group) {
    return { error: "Group not found" };
  }

  if (!group.isCompleted) {
    return { error: "Group result has not been recorded yet" };
  }

  const tournamentData = await dbGetTournamentById(group.eventTournamentId);
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
    return { error: "You do not have permission to manage tournament results" };
  }

  const roundConfig = parseRoundConfig(tournamentData);
  const totalRounds = roundConfig ? Object.keys(roundConfig).length : 1;
  const isFinalRound = group.round === totalRounds;

  if (!isFinalRound) {
    const nextRoundGroups = await dbGetGroupsByRound(
      group.eventTournamentId,
      group.round + 1,
    );
    const hasCompletedNextRoundGroups = nextRoundGroups.some(
      (g) => g.isCompleted,
    );
    if (hasCompletedNextRoundGroups) {
      return {
        error:
          "Cannot undo: the next round has completed groups. Undo those first.",
      };
    }

    if (nextRoundGroups.length > 0) {
      return withTransaction(async (tx) => {
        await dbDeleteGroupsByRound(
          group.eventTournamentId,
          group.round + 1,
          tx,
        );
        await resetFFAGroup(group, isFinalRound, tx);
        return {
          data: {
            eventTournamentId: group.eventTournamentId,
            eventId: tournamentData.eventId,
          },
        };
      });
    }
  }

  return withTransaction(async (tx) => {
    if (isFinalRound && tournamentData.status === TournamentStatus.COMPLETED) {
      await deleteEventPointEntriesForTournament(tournamentData.id, tx);
      const participants = await dbGetParticipants(tournamentData.id, tx);
      for (const p of participants) {
        await dbUpdateParticipant(p.id, { finalPlacement: null }, tx);
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
    await resetFFAGroup(group, isFinalRound, tx);
    return {
      data: {
        eventTournamentId: group.eventTournamentId,
        eventId: tournamentData.eventId,
      },
    };
  });
}

async function resetFFAGroup(
  group: NonNullable<Awaited<ReturnType<typeof dbGetGroupById>>>,
  isFinalRound: boolean,
  tx: DBOrTx,
): Promise<void> {
  const groupParticipants = await dbGetGroupParticipants(group.id, tx);

  const clearUpdates = groupParticipants.map((gp) => ({
    id: gp.id,
    rank: null as number | null,
    score: null as number | null,
    advanced: false,
  }));
  await dbBulkUpdateGroupParticipants(clearUpdates, tx);

  if (!isFinalRound) {
    for (const gp of groupParticipants) {
      await dbUpdateParticipant(
        gp.eventTournamentParticipantId,
        { isEliminated: false, eliminatedInRound: null },
        tx,
      );
    }
  }

  if (group.eventMatchId) {
    await deleteEventMatch(group.eventMatchId, tx);
  }

  await dbUpdateGroup(group.id, { eventMatchId: null, isCompleted: false }, tx);
}

export async function updateFFAGroupAssignments(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = updateFFAGroupAssignmentsSchema.safeParse(input);
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

  if (tournamentData.tournamentType !== TournamentType.FFA_GROUP_STAGE) {
    return { error: "This action is only for FFA Group Stage tournaments" };
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
    return { error: "You do not have permission to manage tournaments" };
  }

  const existingGroups = await dbGetGroupsByRound(
    data.eventTournamentId,
    data.round,
  );
  if (existingGroups.length === 0) {
    return { error: "No groups exist for this round" };
  }

  const hasCompletedGroups = existingGroups.some((g) => g.isCompleted);
  if (hasCompletedGroups) {
    return {
      error: "Cannot edit groups after results have been recorded",
    };
  }

  const existingGroupIds = new Set(existingGroups.map((g) => g.id));
  const inputGroupIds = new Set(data.groups.map((g) => g.groupId));

  if (existingGroupIds.size !== inputGroupIds.size) {
    return { error: "Must include all groups for this round" };
  }
  for (const id of inputGroupIds) {
    if (!existingGroupIds.has(id)) {
      return { error: "Invalid group ID" };
    }
  }

  const existingParticipantIds = new Set<string>();
  for (const group of existingGroups) {
    const groupParticipants = await dbGetGroupParticipants(group.id);
    for (const gp of groupParticipants) {
      existingParticipantIds.add(gp.eventTournamentParticipantId);
    }
  }

  const newParticipantIds: string[] = [];
  for (const group of data.groups) {
    for (const pid of group.participantIds) {
      newParticipantIds.push(pid);
    }
  }

  if (newParticipantIds.length !== new Set(newParticipantIds).size) {
    return { error: "Each participant must appear exactly once across groups" };
  }

  if (newParticipantIds.length !== existingParticipantIds.size) {
    return {
      error: "All participants must be included in the new assignments",
    };
  }

  for (const pid of newParticipantIds) {
    if (!existingParticipantIds.has(pid)) {
      return { error: "Invalid participant ID in group assignments" };
    }
  }

  return withTransaction(async (tx) => {
    const groupIds = existingGroups.map((g) => g.id);
    await dbDeleteGroupParticipantsByGroupIds(groupIds, tx);

    for (const group of data.groups) {
      await dbCreateGroupParticipants(
        group.participantIds.map((participantId) => ({
          eventTournamentGroupId: group.groupId,
          eventTournamentParticipantId: participantId,
        })),
        tx,
      );
    }

    return {
      data: {
        eventTournamentId: data.eventTournamentId,
        eventId: tournamentData.eventId,
      },
    };
  });
}

export async function manualFFAGroupSetup(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = manualFFAGroupSetupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const { eventTournamentId } = data;

  const tournamentData = await dbGetTournamentById(eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.tournamentType !== TournamentType.FFA_GROUP_STAGE) {
    return { error: "This action is only for FFA Group Stage tournaments" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Tournament must be in DRAFT status" };
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

  const roundConfig = parseRoundConfig(tournamentData);
  if (!roundConfig) {
    return {
      error: "Round configuration is required for FFA Group Stage tournaments",
    };
  }

  const validationError = validateFFARoundConfig(
    participants.length,
    roundConfig,
    MIN_FFA_GROUP_SIZE,
    MAX_FFA_GROUP_SIZE,
  );
  if (validationError) {
    return { error: validationError };
  }

  const round1Config = roundConfig["1"];
  if (!round1Config) {
    return { error: "Round 1 configuration is required" };
  }

  const expectedGroupCount = Math.floor(
    participants.length / round1Config.groupSize,
  );
  if (data.groups.length !== expectedGroupCount) {
    return {
      error: `Expected ${expectedGroupCount} groups, got ${data.groups.length}`,
    };
  }

  const validParticipantIds = new Set(participants.map((p) => p.id));
  const allAssignedIds: string[] = [];

  for (let i = 0; i < data.groups.length; i++) {
    const group = data.groups[i];
    if (group.participantIds.length < MIN_FFA_GROUP_SIZE) {
      return {
        error: `Group ${i + 1} must have at least ${MIN_FFA_GROUP_SIZE} participants`,
      };
    }
    for (const pid of group.participantIds) {
      if (!validParticipantIds.has(pid)) {
        return { error: "Invalid participant ID in group assignments" };
      }
      allAssignedIds.push(pid);
    }
  }

  if (allAssignedIds.length !== new Set(allAssignedIds).size) {
    return { error: "Each participant must appear in exactly one group" };
  }

  if (allAssignedIds.length !== participants.length) {
    return { error: "All participants must be assigned to a group" };
  }

  const totalRounds = Object.keys(roundConfig).length;

  return withTransaction(async (tx) => {
    let seedIdx = 0;
    const seedUpdates: { id: string; seed: number }[] = [];
    for (const group of data.groups) {
      for (const pid of group.participantIds) {
        seedIdx++;
        seedUpdates.push({ id: pid, seed: seedIdx });
      }
    }
    await dbBulkUpdateSeeds(seedUpdates, tx);

    const groupRows = data.groups.map((_, groupIdx) => ({
      eventTournamentId,
      round: 1,
      position: groupIdx + 1,
      advanceCount: round1Config.advanceCount,
      isCompleted: false,
    }));

    const createdGroups = await dbCreateGroups(groupRows, tx);

    const groupParticipantRows: {
      eventTournamentGroupId: string;
      eventTournamentParticipantId: string;
    }[] = [];

    for (let g = 0; g < data.groups.length; g++) {
      const group = createdGroups.find(
        (cg) => cg.position === g + 1 && cg.round === 1,
      );
      if (!group) continue;
      for (const pid of data.groups[g].participantIds) {
        groupParticipantRows.push({
          eventTournamentGroupId: group.id,
          eventTournamentParticipantId: pid,
        });
      }
    }

    await dbCreateGroupParticipants(groupParticipantRows, tx);

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

export async function manualSwissRound1Setup(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const parsed = manualSwissRound1SetupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const { eventTournamentId } = data;

  const tournamentData = await dbGetTournamentById(eventTournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.tournamentType !== TournamentType.SWISS) {
    return { error: "This action is only for Swiss tournaments" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Tournament must be in DRAFT status" };
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

  const validParticipantIds = new Set(participants.map((p) => p.id));
  const newParticipantIds: string[] = [];
  let byeCount = 0;

  for (const pairing of data.pairings) {
    if (!validParticipantIds.has(pairing.participant1Id)) {
      return { error: "Invalid participant ID in pairings" };
    }
    newParticipantIds.push(pairing.participant1Id);

    if (pairing.isBye) {
      byeCount++;
      if (pairing.participant2Id !== null) {
        return { error: "Bye matches must not have a second participant" };
      }
    } else {
      if (pairing.participant2Id === null) {
        return { error: "Non-bye matches must have two participants" };
      }
      if (!validParticipantIds.has(pairing.participant2Id)) {
        return { error: "Invalid participant ID in pairings" };
      }
      newParticipantIds.push(pairing.participant2Id);
    }
  }

  if (newParticipantIds.length !== new Set(newParticipantIds).size) {
    return { error: "Each participant must appear exactly once in pairings" };
  }

  if (newParticipantIds.length !== participants.length) {
    return { error: "Pairings must include all tournament participants" };
  }

  const expectedByeCount = participants.length % 2 === 1 ? 1 : 0;
  if (byeCount !== expectedByeCount) {
    return {
      error:
        expectedByeCount === 0
          ? "No byes should exist with an even number of participants"
          : "Exactly one bye is required with an odd number of participants",
    };
  }

  const totalRounds =
    tournamentData.totalRounds ?? Math.ceil(Math.log2(participants.length));

  return withTransaction(async (tx) => {
    const roundMatchData = data.pairings
      .filter((p) => !p.isBye)
      .map((pairing, i) => ({
        eventTournamentId,
        round: 1,
        position: i + 1,
        participant1Id: pairing.participant1Id,
        participant2Id: pairing.participant2Id as string | null,
        winnerId: null as string | null,
        eventMatchId: null as string | null,
        isBye: false,
        isForfeit: false,
        participant1Score: null as number | null,
        participant2Score: null as number | null,
        nextMatchId: null as string | null,
        nextMatchSlot: null as number | null,
      }));

    const byePairing = data.pairings.find((p) => p.isBye);
    if (byePairing) {
      roundMatchData.push({
        eventTournamentId,
        round: 1,
        position: roundMatchData.length + 1,
        participant1Id: byePairing.participant1Id,
        participant2Id: null,
        winnerId: byePairing.participant1Id,
        eventMatchId: null as string | null,
        isBye: true,
        isForfeit: false,
        participant1Score: null as number | null,
        participant2Score: null as number | null,
        nextMatchId: null as string | null,
        nextMatchSlot: null as number | null,
      });
    }

    await dbCreateRoundMatches(roundMatchData, tx);

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
