import {
  EventHighScoreEntryWithDetails,
  HighScoreEntryMemberDetail,
  PointEntryWithTeam,
  closeHighScoreSession as dbCloseHighScoreSession,
  createEventHighScoreEntry as dbCreateEventHighScoreEntry,
  createEventHighScoreEntryMembers as dbCreateEventHighScoreEntryMembers,
  createEventPointEntries as dbCreateEventPointEntries,
  createEventPointEntryParticipants as dbCreateEventPointEntryParticipants,
  createHighScoreSession as dbCreateHighScoreSession,
  deleteEventPointEntriesForHighScoreSession as dbDeleteEventPointEntriesForHighScoreSession,
  deleteHighScoreEntry as dbDeleteHighScoreEntry,
  deleteHighScoreSession as dbDeleteHighScoreSession,
  getClosedHighScoreSessions as dbGetClosedHighScoreSessions,
  getEventById as dbGetEventById,
  getEventGameTypeById as dbGetEventGameTypeById,
  getEventParticipant as dbGetEventParticipant,
  getEventTeamMembersWithTeamNames as dbGetEventTeamMembersWithTeamNames,
  getHighScoreEntryById as dbGetHighScoreEntryById,
  getHighScoreSessionById as dbGetHighScoreSessionById,
  getOpenHighScoreSessions as dbGetOpenHighScoreSessions,
  getPointEntriesForGameType as dbGetPointEntriesForGameType,
  getPointEntriesForHighScoreSessions as dbGetPointEntriesForHighScoreSessions,
  getSessionHighScoreEntries as dbGetSessionHighScoreEntries,
  getTeamForPlaceholder as dbGetTeamForPlaceholder,
  getTeamForUser as dbGetTeamForUser,
  reopenHighScoreSession as dbReopenHighScoreSession,
  updateHighScoreSession as dbUpdateHighScoreSession,
} from "@/db/events";
import { withTransaction } from "@/db/index";
import { EventHighScoreEntry, EventHighScoreSession } from "@/db/schema";
import {
  EventPointCategory,
  EventPointOutcome,
  EventStatus,
  GameCategory,
  HighScoreSessionStatus,
  ParticipantType,
  ScoreOrder,
} from "@/lib/shared/constants";
import {
  getHighScoreGroupSize,
  isHighScorePartnership,
  parseGameConfig,
} from "@/lib/shared/game-config-parser";
import { HighScoreConfig } from "@/lib/shared/game-templates";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import {
  closeHighScoreSessionSchema,
  deleteEventHighScoreEntrySchema,
  deleteHighScoreSessionSchema,
  openHighScoreSessionSchema,
  reopenHighScoreSessionSchema,
  submitEventHighScorePairSchema,
  submitEventHighScoreSchema,
  updateHighScoreSessionSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

export async function openHighScoreSession(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventHighScoreSession>> {
  const parsed = openHighScoreSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, gameTypeId, placementPointConfig, name, description } =
    parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_SESSIONS)) {
    return { error: "You don't have permission to manage sessions" };
  }

  const existingEvent = await dbGetEventById(eventId);
  if (!existingEvent || existingEvent.status !== EventStatus.ACTIVE) {
    return { error: "Sessions can only be opened for active events" };
  }

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType || gameType.eventId !== eventId) {
    return { error: "Game type not found in this event" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return {
      error: "This game type is not configured for high score sessions",
    };
  }

  const session = await dbCreateHighScoreSession({
    eventId,
    eventGameTypeId: gameTypeId,
    status: HighScoreSessionStatus.OPEN,
    name: name || null,
    description: description || null,
    placementPointConfig: placementPointConfig
      ? JSON.stringify(placementPointConfig)
      : null,
    openedById: userId,
    closedById: null,
    closedAt: null,
  });

  return { data: session };
}

export async function submitEventHighScore(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventHighScoreEntry>> {
  const session_check = await _parseSessionForSubmit(userId, input);
  if ("error" in session_check) return { error: session_check.error };
  const { session, config, participation } = session_check;

  if (isHighScorePartnership(config)) {
    return _submitHighScorePair(userId, input, session, config, participation);
  }
  return _submitHighScoreIndividual(
    userId,
    input,
    session,
    config,
    participation,
  );
}

async function _parseSessionForSubmit(
  userId: string,
  input: unknown,
): Promise<
  | {
      session: Awaited<ReturnType<typeof dbGetHighScoreSessionById>> & object;
      config: HighScoreConfig;
      participation: Awaited<ReturnType<typeof dbGetEventParticipant>> & object;
    }
  | { error: string }
> {
  // Extract sessionId loosely — full validation happens in sub-functions
  const rawInput = input as Record<string, unknown>;
  const sessionId =
    typeof rawInput?.sessionId === "string" ? rawInput.sessionId : null;
  if (!sessionId) {
    return { error: "Session ID is required" };
  }

  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) return { error: "Session not found" };
  if (session.status !== HighScoreSessionStatus.OPEN)
    return { error: "Session is not open for submissions" };

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation)
    return { error: "You are not a participant in this event" };
  if (!canPerformEventAction(participation.role, EventAction.SUBMIT_SCORES))
    return { error: "You don't have permission to submit scores" };

  const gameType = await dbGetEventGameTypeById(session.eventGameTypeId);
  if (!gameType) return { error: "Game type not found" };

  const config = parseGameConfig(
    gameType.config,
    gameType.category as GameCategory,
  ) as HighScoreConfig;

  return { session, config, participation };
}

async function _submitHighScoreIndividual(
  userId: string,
  input: unknown,
  session: NonNullable<Awaited<ReturnType<typeof dbGetHighScoreSessionById>>>,
  config: HighScoreConfig,
  participation: NonNullable<Awaited<ReturnType<typeof dbGetEventParticipant>>>,
): Promise<ServiceResult<EventHighScoreEntry>> {
  const parsed = submitEventHighScoreSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const {
    sessionId,
    userId: targetUserId,
    eventPlaceholderParticipantId,
    eventTeamId,
    score,
    achievedAt,
  } = parsed.data;

  const isTeamHighScore = config.participantType === ParticipantType.TEAM;

  if (isTeamHighScore && !eventTeamId) {
    return { error: "Team ID is required for team high score games" };
  }
  if (!isTeamHighScore && eventTeamId) {
    return { error: "Team ID is not allowed for individual high score games" };
  }

  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    if (isTeamHighScore) {
      return { error: "Only organizers can submit team scores" };
    }
    if (targetUserId && targetUserId !== userId) {
      return { error: "You can only submit scores for yourself" };
    }
    if (eventPlaceholderParticipantId) {
      return { error: "You can only submit scores for yourself" };
    }
  }

  if (!isTeamHighScore) {
    let team;
    if (targetUserId) {
      team = await dbGetTeamForUser(session.eventId, targetUserId);
    } else if (eventPlaceholderParticipantId) {
      team = await dbGetTeamForPlaceholder(
        session.eventId,
        eventPlaceholderParticipantId,
      );
    }
    if (!team) {
      return { error: "Participant is not on a team" };
    }
  }

  const entry = await dbCreateEventHighScoreEntry({
    sessionId,
    eventId: session.eventId,
    eventGameTypeId: session.eventGameTypeId,
    userId: isTeamHighScore ? null : (targetUserId ?? null),
    eventPlaceholderParticipantId: isTeamHighScore
      ? null
      : (eventPlaceholderParticipantId ?? null),
    eventTeamId: eventTeamId ?? null,
    score,
    recorderId: userId,
    achievedAt,
  });

  return { data: entry };
}

async function _submitHighScorePair(
  userId: string,
  input: unknown,
  session: NonNullable<Awaited<ReturnType<typeof dbGetHighScoreSessionById>>>,
  config: HighScoreConfig,
  participation: NonNullable<Awaited<ReturnType<typeof dbGetEventParticipant>>>,
): Promise<ServiceResult<EventHighScoreEntry>> {
  const parsed = submitEventHighScorePairSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { sessionId, members, score, achievedAt } = parsed.data;
  const groupSize = getHighScoreGroupSize(config);

  if (members.length !== groupSize) {
    return {
      error: `This game type requires exactly ${groupSize} members per entry`,
    };
  }

  // Check for duplicate members
  const memberKeys = members.map(
    (m) => m.userId ?? m.eventPlaceholderParticipantId,
  );
  if (new Set(memberKeys).size !== memberKeys.length) {
    return { error: "Duplicate members are not allowed in a group entry" };
  }

  // Verify all members are on the same team
  const teamIds: string[] = [];
  for (const member of members) {
    let team;
    if (member.userId) {
      team = await dbGetTeamForUser(session.eventId, member.userId);
    } else if (member.eventPlaceholderParticipantId) {
      team = await dbGetTeamForPlaceholder(
        session.eventId,
        member.eventPlaceholderParticipantId,
      );
    }
    if (!team) {
      return { error: "All members must be on a team to submit a group entry" };
    }
    teamIds.push(team.id);
  }

  if (new Set(teamIds).size > 1) {
    return { error: "All members must be on the same team" };
  }

  const teamId = teamIds[0];

  // Permission check: participants can only submit if they are one of the members
  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    const isInvolved = members.some((m) => m.userId === userId);
    if (!isInvolved) {
      return {
        error: "You can only submit group entries that include yourself",
      };
    }
  }

  const entry = await withTransaction(async (tx) => {
    const created = await dbCreateEventHighScoreEntry(
      {
        sessionId,
        eventId: session.eventId,
        eventGameTypeId: session.eventGameTypeId,
        userId: null,
        eventPlaceholderParticipantId: null,
        eventTeamId: teamId,
        score,
        recorderId: userId,
        achievedAt,
      },
      tx,
    );

    await dbCreateEventHighScoreEntryMembers(
      members.map((m) => ({
        eventHighScoreEntryId: created.id,
        userId: m.userId ?? null,
        eventPlaceholderParticipantId: m.eventPlaceholderParticipantId ?? null,
      })),
      tx,
    );

    return created;
  });

  return { data: entry };
}

export async function closeHighScoreSession(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ closed: boolean; eventId: string }>> {
  const parsed = closeHighScoreSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { sessionId } = parsed.data;

  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  if (session.status !== HighScoreSessionStatus.OPEN) {
    return { error: "Session is already closed" };
  }

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_SESSIONS)) {
    return { error: "You don't have permission to manage sessions" };
  }

  const placementPointConfig = session.placementPointConfig
    ? (JSON.parse(session.placementPointConfig) as Array<{
        placement: number;
        points: number;
      }>)
    : null;

  if (placementPointConfig && placementPointConfig.length > 0) {
    const gameType = await dbGetEventGameTypeById(session.eventGameTypeId);
    if (!gameType) {
      return { error: "Game type not found" };
    }

    const config = parseGameConfig(
      gameType.config,
      gameType.category as GameCategory,
    ) as HighScoreConfig;

    const entries = await dbGetSessionHighScoreEntries(sessionId);

    // Sort entries by score based on the game type's scoreOrder
    const sortedEntries = [...entries].sort((a, b) => {
      if (config.scoreOrder === ScoreOrder.HIGHEST_WINS) {
        return b.score - a.score;
      }
      return a.score - b.score;
    });

    // Build a map of teamId -> { best placement, individual(s) who achieved it }
    // Each entry's submitter belongs to a team; if same team has multiple entries,
    // only their best placement counts.
    const teamBestPlacement = new Map<
      string,
      {
        placement: number;
        userId: string | null;
        eventPlaceholderParticipantId: string | null;
        pairMembers?: HighScoreEntryMemberDetail[];
      }
    >();

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const placement = i + 1;

      let teamId: string | undefined;

      // For team-based high scores and pair entries, eventTeamId is set directly on the entry
      if (entry.eventTeamId) {
        teamId = entry.eventTeamId;
      } else if (entry.userId) {
        const team = await dbGetTeamForUser(session.eventId, entry.userId);
        teamId = team?.id;
      } else if (entry.eventPlaceholderParticipantId) {
        const team = await dbGetTeamForPlaceholder(
          session.eventId,
          entry.eventPlaceholderParticipantId,
        );
        teamId = team?.id;
      }

      if (teamId) {
        const currentBest = teamBestPlacement.get(teamId);
        if (currentBest === undefined || placement < currentBest.placement) {
          teamBestPlacement.set(teamId, {
            placement,
            userId: entry.userId,
            eventPlaceholderParticipantId: entry.eventPlaceholderParticipantId,
            pairMembers: entry.members,
          });
        }
      }
    }

    // Create point entries for teams based on their best placement
    const configMap = new Map(
      placementPointConfig.map((p) => [p.placement, p.points]),
    );

    await withTransaction(async (tx) => {
      await dbCloseHighScoreSession(sessionId, userId, tx);

      const entriesWithInfo: Array<{
        entry: {
          eventId: string;
          category: typeof EventPointCategory.HIGH_SCORE;
          outcome: typeof EventPointOutcome.PLACEMENT;
          eventTeamId: string;
          eventMatchId: null;
          eventHighScoreSessionId: string;
          eventTournamentId: null;
          points: number;
        };
        participantInfo: {
          userId: string | null;
          eventPlaceholderParticipantId: string | null;
          pairMembers?: HighScoreEntryMemberDetail[];
        };
      }> = [];

      for (const [teamId, best] of teamBestPlacement) {
        const points = configMap.get(best.placement);
        if (points !== undefined) {
          entriesWithInfo.push({
            entry: {
              eventId: session.eventId,
              category: EventPointCategory.HIGH_SCORE,
              outcome: EventPointOutcome.PLACEMENT,
              eventTeamId: teamId,
              eventMatchId: null,
              eventHighScoreSessionId: sessionId,
              eventTournamentId: null,
              points,
            },
            participantInfo: {
              userId: best.userId,
              eventPlaceholderParticipantId: best.eventPlaceholderParticipantId,
              pairMembers: best.pairMembers,
            },
          });
        }
      }

      if (entriesWithInfo.length > 0) {
        const created = await dbCreateEventPointEntries(
          entriesWithInfo.map((e) => e.entry),
          tx,
        );

        const participantRows = created.flatMap((entry, i) => {
          const info = entriesWithInfo[i].participantInfo;
          // For pair entries, create a participant row for each member
          if (info.pairMembers && info.pairMembers.length > 0) {
            return info.pairMembers.map((member) => ({
              eventPointEntryId: entry.id,
              userId: member.user?.id ?? null,
              eventPlaceholderParticipantId:
                member.placeholderParticipant?.id ?? null,
            }));
          }
          if (!info.userId && !info.eventPlaceholderParticipantId) return [];
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
    });
  } else {
    await dbCloseHighScoreSession(sessionId, userId);
  }

  return { data: { closed: true, eventId: session.eventId } };
}

export async function getOpenSessions(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventHighScoreSession[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const sessions = await dbGetOpenHighScoreSessions(eventId);
  return { data: sessions };
}

export type SessionEntryWithTeam = EventHighScoreEntryWithDetails & {
  teamName: string | null;
  teamColor: string | null;
  members?: HighScoreEntryMemberDetail[];
};

export async function getSessionEntries(
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionEntryWithTeam[]>> {
  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const [entries, teamMembers] = await Promise.all([
    dbGetSessionHighScoreEntries(sessionId),
    dbGetEventTeamMembersWithTeamNames(session.eventId),
  ]);

  const teamLookup = new Map<string, { name: string; color: string | null }>();
  for (const tm of teamMembers) {
    const info = { name: tm.teamName, color: tm.teamColor };
    if (tm.userId) {
      teamLookup.set(`user:${tm.userId}`, info);
    }
    if (tm.eventPlaceholderParticipantId) {
      teamLookup.set(`placeholder:${tm.eventPlaceholderParticipantId}`, info);
    }
  }

  const entriesWithTeam: SessionEntryWithTeam[] = entries.map((entry) => {
    let teamName: string | null = null;
    let teamColor: string | null = null;
    if (entry.team) {
      // Team-based or pair entries have eventTeamId set directly
      teamName = entry.team.name;
      teamColor = entry.team.color;
    } else if (entry.userId) {
      const info = teamLookup.get(`user:${entry.userId}`);
      teamName = info?.name ?? null;
      teamColor = info?.color ?? null;
    } else if (entry.eventPlaceholderParticipantId) {
      const info = teamLookup.get(
        `placeholder:${entry.eventPlaceholderParticipantId}`,
      );
      teamName = info?.name ?? null;
      teamColor = info?.color ?? null;
    }
    return { ...entry, teamName, teamColor, members: entry.members };
  });

  return { data: entriesWithTeam };
}

export async function getHighScoreSession(
  userId: string,
  sessionId: string,
): Promise<ServiceResult<EventHighScoreSession>> {
  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  return { data: session };
}

export async function updateHighScoreSession(
  userId: string,
  input: unknown,
): Promise<ServiceResult<EventHighScoreSession>> {
  const parsed = updateHighScoreSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { sessionId, name, description, placementPointConfig } = parsed.data;

  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  if (session.status !== HighScoreSessionStatus.OPEN) {
    return { error: "Can only edit open sessions" };
  }

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_SESSIONS)) {
    return { error: "You don't have permission to manage sessions" };
  }

  const updateData: {
    name?: string | null;
    description?: string | null;
    placementPointConfig?: string | null;
  } = {};

  if (name !== undefined) {
    updateData.name = name || null;
  }
  if (description !== undefined) {
    updateData.description = description || null;
  }
  if (placementPointConfig !== undefined) {
    updateData.placementPointConfig = placementPointConfig
      ? JSON.stringify(placementPointConfig)
      : null;
  }

  const updated = await dbUpdateHighScoreSession(sessionId, updateData);
  if (!updated) {
    return { error: "Failed to update session" };
  }

  return { data: updated };
}

export async function deleteHighScoreEntry(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const parsed = deleteEventHighScoreEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { entryId } = parsed.data;

  const entry = await dbGetHighScoreEntryById(entryId);
  if (!entry) {
    return { error: "Score entry not found" };
  }

  const session = await dbGetHighScoreSessionById(entry.sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  if (session.status !== HighScoreSessionStatus.OPEN) {
    return { error: "Cannot delete scores from a closed session" };
  }

  const participation = await dbGetEventParticipant(entry.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.SUBMIT_SCORES)) {
    return { error: "You don't have permission to delete scores" };
  }

  // Participants can only delete their own scores
  if (
    !canPerformEventAction(
      participation.role,
      EventAction.RECORD_MATCHES_FOR_OTHERS,
    )
  ) {
    if (entry.userId !== userId) {
      return { error: "You can only delete your own scores" };
    }
  }

  const deleted = await dbDeleteHighScoreEntry(entryId);
  if (!deleted) {
    return { error: "Failed to delete score entry" };
  }

  return { data: { deleted: true, eventId: entry.eventId } };
}

export async function reopenHighScoreSession(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ reopened: true; eventId: string }>> {
  const parsed = reopenHighScoreSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { sessionId } = parsed.data;

  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  if (session.status !== HighScoreSessionStatus.CLOSED) {
    return { error: "Session is not closed" };
  }

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_SESSIONS)) {
    return { error: "You don't have permission to manage sessions" };
  }

  await withTransaction(async (tx) => {
    await dbDeleteEventPointEntriesForHighScoreSession(sessionId, tx);
    await dbReopenHighScoreSession(sessionId, tx);
  });

  return { data: { reopened: true, eventId: session.eventId } };
}

export async function deleteHighScoreSession(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: true; eventId: string }>> {
  const parsed = deleteHighScoreSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { sessionId } = parsed.data;

  const session = await dbGetHighScoreSessionById(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }

  const participation = await dbGetEventParticipant(session.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_SESSIONS)) {
    return { error: "You don't have permission to manage sessions" };
  }

  const deleted = await dbDeleteHighScoreSession(sessionId);
  if (!deleted) {
    return { error: "Failed to delete session" };
  }

  return { data: { deleted: true, eventId: session.eventId } };
}

export async function getClosedSessions(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventHighScoreSession[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const sessions = await dbGetClosedHighScoreSessions(eventId);
  return { data: sessions };
}

export async function getSessionPointEntries(
  userId: string,
  eventId: string,
  sessionIds: string[],
): Promise<ServiceResult<PointEntryWithTeam[]>> {
  if (sessionIds.length === 0) return { data: [] };

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const entries = await dbGetPointEntriesForHighScoreSessions(sessionIds);
  return { data: entries };
}

export async function getGameTypePointEntries(
  userId: string,
  eventId: string,
  gameTypeId: string,
): Promise<ServiceResult<PointEntryWithTeam[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const entries = await dbGetPointEntriesForGameType(gameTypeId);
  return { data: entries };
}
