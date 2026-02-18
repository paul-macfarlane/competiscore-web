import {
  EventTournamentMatchInfo,
  getTournamentInfoByEventMatchIds as dbGetTournamentInfoByEventMatchIds,
} from "@/db/event-tournaments";
import {
  EventActivityItem,
  EventIndividualHighScoreEntry,
  EventLeaderboardEntry,
  EventMatchWithParticipantsAndPoints,
  EventTeamMemberForParticipant,
  getEventActivity as dbGetEventActivity,
  getEventGameTypeById as dbGetEventGameTypeById,
  getEventGameTypeLeaderboard as dbGetEventGameTypeLeaderboard,
  getEventHighScoreIndividualLeaderboard as dbGetEventHighScoreIndividualLeaderboard,
  getEventLeaderboard as dbGetEventLeaderboard,
  getEventMatchWithParticipants as dbGetEventMatchWithParticipants,
  getEventMatchesPaginated as dbGetEventMatchesPaginated,
  getEventParticipant as dbGetEventParticipant,
  getEventParticipants as dbGetEventParticipants,
  getEventTeamMembersWithTeamNames as dbGetEventTeamMembersWithTeamNames,
  getPointEntriesForMatch as dbGetPointEntriesForMatch,
  getPointEntriesForMatches as dbGetPointEntriesForMatches,
} from "@/db/events";
import { UserSearchResult, searchUsersByQuery } from "@/db/users";
import {
  EventParticipantRole,
  GameCategory,
  ScoreOrder,
} from "@/lib/shared/constants";
import { parseHighScoreConfig } from "@/lib/shared/game-config-parser";
import { uuidSchema } from "@/validators/common";
import { z } from "zod";

import { ServiceResult, formatZodErrors } from "./shared";

export async function getEventLeaderboard(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventLeaderboardEntry[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const leaderboard = await dbGetEventLeaderboard(eventId);
  return { data: leaderboard };
}

export async function getEventActivity(
  userId: string,
  eventId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ServiceResult<{ items: EventActivityItem[]; totalCount: number }>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const { limit = 20, offset = 0 } = options;

  const result = await dbGetEventActivity(eventId, { limit, offset });
  return { data: result };
}

const searchUsersForEventInviteSchema = z.object({
  eventId: uuidSchema,
  query: z.string().min(1).max(100),
});

export async function searchUsersForEventInvite(
  userId: string,
  input: unknown,
): Promise<ServiceResult<UserSearchResult[]>> {
  const parsed = searchUsersForEventInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, query } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (participation.role !== EventParticipantRole.ORGANIZER) {
    return { error: "You don't have permission to invite participants" };
  }

  const participants = await dbGetEventParticipants(eventId);
  const participantUserIds = participants.map((m) => m.userId);

  const users = await searchUsersByQuery(query, participantUserIds);
  return { data: users };
}

export async function getEventTeamMembersForParticipants(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventTeamMemberForParticipant[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const members = await dbGetEventTeamMembersWithTeamNames(eventId);
  return { data: members };
}

export type EventMatchWithTournament = EventMatchWithParticipantsAndPoints & {
  tournament: EventTournamentMatchInfo | null;
};

export async function getEventMatches(
  userId: string,
  eventId: string,
  options: { limit?: number; offset?: number; gameTypeId?: string } = {},
): Promise<
  ServiceResult<{
    matches: EventMatchWithTournament[];
    total: number;
  }>
> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const { limit = 50, offset = 0, gameTypeId } = options;
  const result = await dbGetEventMatchesPaginated(eventId, {
    limit,
    offset,
    gameTypeId,
  });

  const matchIds = result.matches.map((m) => m.id);
  const [pointEntries, tournamentInfos] = await Promise.all([
    dbGetPointEntriesForMatches(matchIds),
    dbGetTournamentInfoByEventMatchIds(matchIds),
  ]);

  const pointsByMatch = new Map<string, typeof pointEntries>();
  for (const entry of pointEntries) {
    if (!entry.eventMatchId) continue;
    const existing = pointsByMatch.get(entry.eventMatchId) ?? [];
    existing.push(entry);
    pointsByMatch.set(entry.eventMatchId, existing);
  }

  const tournamentByMatch = new Map(tournamentInfos.map((t) => [t.matchId, t]));

  const matchesWithPoints: EventMatchWithTournament[] = result.matches.map(
    (m) => ({
      ...m,
      pointEntries: pointsByMatch.get(m.id) ?? [],
      tournament: tournamentByMatch.get(m.id) ?? null,
    }),
  );

  return { data: { matches: matchesWithPoints, total: result.total } };
}

export async function getEventMatch(
  userId: string,
  matchId: string,
): Promise<ServiceResult<EventMatchWithTournament>> {
  const match = await dbGetEventMatchWithParticipants(matchId);
  if (!match) {
    return { error: "Match not found" };
  }

  const participation = await dbGetEventParticipant(match.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const [pointEntries, tournamentInfos] = await Promise.all([
    dbGetPointEntriesForMatch(matchId),
    dbGetTournamentInfoByEventMatchIds([matchId]),
  ]);

  return {
    data: { ...match, pointEntries, tournament: tournamentInfos[0] ?? null },
  };
}

export async function getEventGameTypeLeaderboard(
  userId: string,
  eventId: string,
  gameTypeId: string,
): Promise<ServiceResult<EventLeaderboardEntry[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const leaderboard = await dbGetEventGameTypeLeaderboard(eventId, gameTypeId);
  return { data: leaderboard };
}

export async function getEventHighScoreLeaderboard(
  userId: string,
  eventId: string,
  gameTypeId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<
  ServiceResult<{ entries: EventIndividualHighScoreEntry[]; total: number }>
> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const gameType = await dbGetEventGameTypeById(gameTypeId);
  if (!gameType || gameType.eventId !== eventId) {
    return { error: "Game type not found in this event" };
  }

  if (gameType.category !== GameCategory.HIGH_SCORE) {
    return { error: "This game type is not a high score game type" };
  }

  const hsConfig = parseHighScoreConfig(gameType.config);
  const scoreOrder =
    hsConfig.scoreOrder === ScoreOrder.LOWEST_WINS
      ? ("lowest_wins" as const)
      : ("highest_wins" as const);

  const { limit = 10, offset = 0 } = options;

  const result = await dbGetEventHighScoreIndividualLeaderboard(
    eventId,
    gameTypeId,
    { limit, offset, scoreOrder },
  );
  return { data: result };
}
