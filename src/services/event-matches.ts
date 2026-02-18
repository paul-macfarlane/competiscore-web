import {
  createEventMatch as dbCreateEventMatch,
  createEventMatchParticipants as dbCreateEventMatchParticipants,
  createEventPointEntries as dbCreateEventPointEntries,
  createEventPointEntryParticipants as dbCreateEventPointEntryParticipants,
  deleteEventMatch as dbDeleteEventMatch,
  getEventById as dbGetEventById,
  getEventGameTypeById as dbGetEventGameTypeById,
  getEventMatchWithParticipants as dbGetEventMatchWithParticipants,
  getEventParticipant as dbGetEventParticipant,
  getEventTeamById as dbGetEventTeamById,
  getTeamForPlaceholder as dbGetTeamForPlaceholder,
  getTeamForUser as dbGetTeamForUser,
} from "@/db/events";
import { withTransaction } from "@/db/index";
import { EventMatch } from "@/db/schema";
import {
  EventPointCategory,
  EventPointOutcome,
  EventStatus,
  GameCategory,
  MatchResult,
  ParticipantType,
  ScoreOrder,
} from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import { H2HConfig } from "@/lib/shared/game-templates";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import {
  deleteEventMatchSchema,
  recordEventFFAMatchSchema,
  recordEventH2HMatchSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

type ParsedParticipant = {
  userId?: string | null;
  eventPlaceholderParticipantId?: string | null;
  eventTeamId?: string | null;
};

function isUserInvolvedInEventMatch(
  userId: string,
  participants: ParsedParticipant[],
): boolean {
  return participants.some((p) => p.userId === userId);
}

async function resolveParticipantTeam(
  eventId: string,
  participant: ParsedParticipant,
) {
  if (participant.eventTeamId) {
    return dbGetEventTeamById(participant.eventTeamId);
  }
  if (participant.userId) {
    return dbGetTeamForUser(eventId, participant.userId);
  }
  if (participant.eventPlaceholderParticipantId) {
    return dbGetTeamForPlaceholder(
      eventId,
      participant.eventPlaceholderParticipantId,
    );
  }
  return undefined;
}

export async function recordEventH2HMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ match: EventMatch; eventId: string }>> {
  const parsed = recordEventH2HMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const {
    eventId,
    gameTypeId,
    playedAt,
    side1Participants,
    side2Participants,
  } = parsed.data;
  const {
    winningSide,
    side1Score,
    side2Score,
    winPoints,
    lossPoints,
    drawPoints,
  } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.RECORD_MATCHES)) {
    return { error: "You don't have permission to record matches" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent || existingEvent.status !== EventStatus.ACTIVE) {
    return { error: "Matches can only be recorded for active events" };
  }

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType || gameType.eventId !== eventId) {
    return { error: "Game type not found in this event" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot record matches for an archived game type" };
  }

  if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
    return {
      error: "This game type is not configured for head-to-head matches",
    };
  }

  const config = parseGameConfig(gameType.config, gameType.category);
  const h2hConfig = config as H2HConfig;
  const isTeamParticipant =
    "participantType" in config &&
    config.participantType === ParticipantType.TEAM;

  if (
    side1Participants.length < h2hConfig.minPlayersPerSide ||
    side1Participants.length > h2hConfig.maxPlayersPerSide
  ) {
    return {
      error: `Side 1 must have between ${h2hConfig.minPlayersPerSide} and ${h2hConfig.maxPlayersPerSide} participant(s)`,
    };
  }
  if (
    side2Participants.length < h2hConfig.minPlayersPerSide ||
    side2Participants.length > h2hConfig.maxPlayersPerSide
  ) {
    return {
      error: `Side 2 must have between ${h2hConfig.minPlayersPerSide} and ${h2hConfig.maxPlayersPerSide} participant(s)`,
    };
  }

  // For team-participant games, validate all participants use eventTeamId
  if (isTeamParticipant) {
    const allParts = [...side1Participants, ...side2Participants];
    if (allParts.some((p) => !p.eventTeamId)) {
      return {
        error: "All participants must be teams for this game type",
      };
    }
  }

  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    // For team participant games, non-organizers can't record (no individual involvement)
    if (isTeamParticipant) {
      return { error: "Only organizers can record team matches" };
    }
    const allParticipants = [...side1Participants, ...side2Participants];
    if (!isUserInvolvedInEventMatch(userId, allParticipants)) {
      return { error: "You can only record matches you're involved in" };
    }
  }

  // Determine the outcome
  let side1Result:
    | typeof MatchResult.WIN
    | typeof MatchResult.LOSS
    | typeof MatchResult.DRAW;
  let side2Result:
    | typeof MatchResult.WIN
    | typeof MatchResult.LOSS
    | typeof MatchResult.DRAW;

  if (winningSide === "side1") {
    side1Result = MatchResult.WIN;
    side2Result = MatchResult.LOSS;
  } else if (winningSide === "side2") {
    side1Result = MatchResult.LOSS;
    side2Result = MatchResult.WIN;
  } else if (winningSide === "draw") {
    side1Result = MatchResult.DRAW;
    side2Result = MatchResult.DRAW;
  } else if (side1Score !== undefined && side2Score !== undefined) {
    const lowestWins = h2hConfig.scoreOrder === ScoreOrder.LOWEST_WINS;
    const side1Better = lowestWins
      ? side1Score < side2Score
      : side1Score > side2Score;
    const side2Better = lowestWins
      ? side2Score < side1Score
      : side2Score > side1Score;

    if (side1Better) {
      side1Result = MatchResult.WIN;
      side2Result = MatchResult.LOSS;
    } else if (side2Better) {
      side1Result = MatchResult.LOSS;
      side2Result = MatchResult.WIN;
    } else {
      side1Result = MatchResult.DRAW;
      side2Result = MatchResult.DRAW;
    }
  } else {
    return { error: "Must specify either winningSide or both scores" };
  }

  const isDraw = side1Result === MatchResult.DRAW;
  if (
    isDraw &&
    drawPoints === undefined &&
    (winPoints !== undefined || lossPoints !== undefined)
  ) {
    return {
      error:
        "Draw points must be specified when the result is a draw and points are being tracked",
    };
  }

  // Resolve all participants to their teams
  const side1Resolved = await Promise.all(
    side1Participants.map(async (p) => {
      const team = await resolveParticipantTeam(eventId, p);
      return { ...p, team };
    }),
  );

  const side2Resolved = await Promise.all(
    side2Participants.map(async (p) => {
      const team = await resolveParticipantTeam(eventId, p);
      return { ...p, team };
    }),
  );

  for (const p of [...side1Resolved, ...side2Resolved]) {
    if (!p.team) {
      return { error: "Participant is not on a team" };
    }
  }

  return withTransaction(async (tx) => {
    const match = await dbCreateEventMatch(
      {
        eventId,
        eventGameTypeId: gameTypeId,
        playedAt,
        recorderId: userId,
      },
      tx,
    );

    const participants = [
      ...side1Resolved.map((p) => ({
        eventMatchId: match.id,
        eventTeamId: p.team!.id,
        userId: isTeamParticipant ? null : (p.userId ?? null),
        eventPlaceholderParticipantId: isTeamParticipant
          ? null
          : (p.eventPlaceholderParticipantId ?? null),
        side: 1,
        score: side1Score ?? null,
        rank: null,
        result: side1Result,
      })),
      ...side2Resolved.map((p) => ({
        eventMatchId: match.id,
        eventTeamId: p.team!.id,
        userId: isTeamParticipant ? null : (p.userId ?? null),
        eventPlaceholderParticipantId: isTeamParticipant
          ? null
          : (p.eventPlaceholderParticipantId ?? null),
        side: 2,
        score: side2Score ?? null,
        rank: null,
        result: side2Result,
      })),
    ];

    await dbCreateEventMatchParticipants(participants, tx);

    // Create point entries - only if points are being tracked
    const hasPoints = winPoints !== undefined || lossPoints !== undefined;

    if (hasPoints) {
      const buildSideEntries = (
        sideResolved: typeof side1Resolved,
        sideResult: typeof side1Result,
      ) => {
        const teamGroups = new Map<
          string,
          Array<(typeof sideResolved)[number]>
        >();
        for (const p of sideResolved) {
          const teamId = p.team!.id;
          const group = teamGroups.get(teamId) ?? [];
          group.push(p);
          teamGroups.set(teamId, group);
        }

        const result: Array<{
          entry: {
            eventId: string;
            category: typeof EventPointCategory.H2H_MATCH;
            outcome: typeof EventPointOutcome.WIN;
            eventTeamId: string;
            eventMatchId: string;
            eventHighScoreSessionId: null;
            eventTournamentId: null;
            points: number;
          };
          participantInfo: {
            userId: string | null;
            eventPlaceholderParticipantId: string | null;
          } | null;
        }> = [];

        for (const [teamId, group] of teamGroups) {
          const points = isDraw
            ? (drawPoints ?? 0)
            : sideResult === MatchResult.WIN
              ? (winPoints ?? 0)
              : (lossPoints ?? 0);
          const outcome = isDraw
            ? EventPointOutcome.DRAW
            : sideResult === MatchResult.WIN
              ? EventPointOutcome.WIN
              : EventPointOutcome.LOSS;

          const solo =
            !isTeamParticipant && group.length === 1 ? group[0] : null;

          result.push({
            entry: {
              eventId,
              category: EventPointCategory.H2H_MATCH,
              outcome: outcome as typeof EventPointOutcome.WIN,
              eventTeamId: teamId,
              eventMatchId: match.id,
              eventHighScoreSessionId: null,
              eventTournamentId: null,
              points,
            },
            participantInfo: solo
              ? {
                  userId: solo.userId ?? null,
                  eventPlaceholderParticipantId:
                    solo.eventPlaceholderParticipantId ?? null,
                }
              : null,
          });
        }
        return result;
      };

      const allResults = [
        ...buildSideEntries(side1Resolved, side1Result),
        ...buildSideEntries(side2Resolved, side2Result),
      ];

      const created = await dbCreateEventPointEntries(
        allResults.map((r) => r.entry),
        tx,
      );

      const participantRows = created.flatMap((entry, i) => {
        const info = allResults[i].participantInfo;
        if (!info || (!info.userId && !info.eventPlaceholderParticipantId))
          return [];
        return [
          {
            eventPointEntryId: entry.id,
            userId: info.userId,
            eventPlaceholderParticipantId: info.eventPlaceholderParticipantId,
          },
        ];
      });
      await dbCreateEventPointEntryParticipants(participantRows, tx);
    }

    return { data: { match, eventId } };
  });
}

export async function recordEventFFAMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ match: EventMatch; eventId: string }>> {
  const parsed = recordEventFFAMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const {
    eventId,
    gameTypeId,
    playedAt,
    participants: inputParticipants,
  } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.RECORD_MATCHES)) {
    return { error: "You don't have permission to record matches" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent || existingEvent.status !== EventStatus.ACTIVE) {
    return { error: "Matches can only be recorded for active events" };
  }

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType || gameType.eventId !== eventId) {
    return { error: "Game type not found in this event" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot record matches for an archived game type" };
  }

  if (gameType.category !== GameCategory.FREE_FOR_ALL) {
    return {
      error: "This game type is not configured for free-for-all matches",
    };
  }

  const ffaConfig = parseGameConfig(gameType.config, gameType.category);
  const isTeamFFA =
    "participantType" in ffaConfig &&
    ffaConfig.participantType === ParticipantType.TEAM;

  // For team-participant games, validate all participants use eventTeamId
  if (isTeamFFA) {
    if (inputParticipants.some((p) => !p.eventTeamId)) {
      return {
        error: "All participants must be teams for this game type",
      };
    }
  }

  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    if (isTeamFFA) {
      return { error: "Only organizers can record team matches" };
    }
    if (!isUserInvolvedInEventMatch(userId, inputParticipants)) {
      return { error: "You can only record matches you're involved in" };
    }
  }

  // Resolve all participants to their teams
  const resolved = await Promise.all(
    inputParticipants.map(async (p) => {
      const team = await resolveParticipantTeam(eventId, p);
      return { ...p, team };
    }),
  );

  for (const p of resolved) {
    if (!p.team) {
      return { error: "Participant is not on a team" };
    }
  }

  return withTransaction(async (tx) => {
    const match = await dbCreateEventMatch(
      {
        eventId,
        eventGameTypeId: gameTypeId,
        playedAt,
        recorderId: userId,
      },
      tx,
    );

    const participants = resolved.map((p) => ({
      eventMatchId: match.id,
      eventTeamId: p.team!.id,
      userId: isTeamFFA ? null : (p.userId ?? null),
      eventPlaceholderParticipantId: isTeamFFA
        ? null
        : (p.eventPlaceholderParticipantId ?? null),
      side: null,
      score: p.score ?? null,
      rank: p.rank ?? null,
      result: null,
    }));

    await dbCreateEventMatchParticipants(participants, tx);

    const hasPoints = resolved.some((p) => p.points !== undefined);
    if (hasPoints) {
      const entriesWithInfo = resolved.map((p) => ({
        entry: {
          eventId,
          category:
            EventPointCategory.FFA_MATCH as typeof EventPointCategory.FFA_MATCH,
          outcome:
            EventPointOutcome.PLACEMENT as typeof EventPointOutcome.PLACEMENT,
          eventTeamId: p.team!.id,
          eventMatchId: match.id,
          eventHighScoreSessionId: null,
          eventTournamentId: null,
          points: p.points ?? 0,
        },
        participantInfo: isTeamFFA
          ? null
          : {
              userId: p.userId ?? null,
              eventPlaceholderParticipantId:
                p.eventPlaceholderParticipantId ?? null,
            },
      }));

      const created = await dbCreateEventPointEntries(
        entriesWithInfo.map((e) => e.entry),
        tx,
      );

      const participantRows = created.flatMap((entry, i) => {
        const info = entriesWithInfo[i].participantInfo;
        if (!info || (!info.userId && !info.eventPlaceholderParticipantId))
          return [];
        return [
          {
            eventPointEntryId: entry.id,
            userId: info.userId,
            eventPlaceholderParticipantId: info.eventPlaceholderParticipantId,
          },
        ];
      });
      await dbCreateEventPointEntryParticipants(participantRows, tx);
    }

    return { data: { match, eventId } };
  });
}

export async function deleteEventMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const parsed = deleteEventMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { matchId } = parsed.data;

  const match = await dbGetEventMatchWithParticipants(matchId);
  if (!match) {
    return { error: "Match not found" };
  }

  const participation = await dbGetEventParticipant(match.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.RECORD_MATCHES)) {
    return { error: "You don't have permission to delete matches" };
  }

  // Participants can only delete matches they're involved in
  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    if (!isUserInvolvedInEventMatch(userId, match.participants)) {
      return { error: "You can only delete matches you're involved in" };
    }
  }

  // Cascades to match participants and point entries
  const deleted = await dbDeleteEventMatch(matchId);
  if (!deleted) {
    return { error: "Failed to delete match" };
  }

  return { data: { deleted: true, eventId: match.eventId } };
}
