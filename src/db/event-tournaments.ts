import { TournamentStatus } from "@/lib/shared/constants";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  EventPlaceholderParticipant,
  EventTournament,
  EventTournamentParticipant,
  EventTournamentRoundMatch,
  NewEventTournament,
  NewEventTournamentParticipant,
  NewEventTournamentParticipantMember,
  NewEventTournamentRoundMatch,
  User,
  eventGameType,
  eventPlaceholderParticipant,
  eventTeam,
  eventTournament,
  eventTournamentColumns,
  eventTournamentParticipant,
  eventTournamentParticipantColumns,
  eventTournamentParticipantMember,
  eventTournamentRoundMatch,
  user,
} from "./schema";

export async function createEventTournament(
  data: Omit<NewEventTournament, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventTournament> {
  const result = await dbOrTx.insert(eventTournament).values(data).returning();
  return result[0];
}

export async function getEventTournamentById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTournament | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventTournament)
    .where(eq(eventTournament.id, id))
    .limit(1);
  return result[0];
}

export type EventTournamentWithDetails = EventTournament & {
  gameType: {
    id: string;
    name: string;
    category: string;
    config: string;
    logo: string | null;
  };
  createdBy: { id: string; name: string; username: string };
  participantCount: number;
};

export async function getEventTournamentWithDetails(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentWithDetails | undefined> {
  const participantCountSq = dbOrTx
    .select({
      eventTournamentId: eventTournamentParticipant.eventTournamentId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(eventTournamentParticipant)
    .groupBy(eventTournamentParticipant.eventTournamentId)
    .as("participant_count");

  const result = await dbOrTx
    .select({
      ...eventTournamentColumns,
      gameType: {
        id: eventGameType.id,
        name: eventGameType.name,
        category: eventGameType.category,
        config: eventGameType.config,
        logo: eventGameType.logo,
      },
      createdBy: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      participantCount: sql<number>`coalesce(${participantCountSq.count}, 0)`,
    })
    .from(eventTournament)
    .innerJoin(
      eventGameType,
      eq(eventTournament.eventGameTypeId, eventGameType.id),
    )
    .innerJoin(user, eq(eventTournament.createdById, user.id))
    .leftJoin(
      participantCountSq,
      eq(eventTournament.id, participantCountSq.eventTournamentId),
    )
    .where(eq(eventTournament.id, id))
    .limit(1);

  return result[0] as EventTournamentWithDetails | undefined;
}

export async function getEventTournamentsByEventId(
  eventId: string,
  options?: {
    statuses?: TournamentStatus[];
    limit?: number;
    offset?: number;
  },
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentWithDetails[]> {
  const participantCountSq = dbOrTx
    .select({
      eventTournamentId: eventTournamentParticipant.eventTournamentId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(eventTournamentParticipant)
    .groupBy(eventTournamentParticipant.eventTournamentId)
    .as("participant_count");

  const conditions = [eq(eventTournament.eventId, eventId)];
  if (options?.statuses && options.statuses.length > 0) {
    conditions.push(inArray(eventTournament.status, options.statuses));
  }

  let query = dbOrTx
    .select({
      ...eventTournamentColumns,
      gameType: {
        id: eventGameType.id,
        name: eventGameType.name,
        category: eventGameType.category,
        config: eventGameType.config,
        logo: eventGameType.logo,
      },
      createdBy: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      participantCount: sql<number>`coalesce(${participantCountSq.count}, 0)`,
    })
    .from(eventTournament)
    .innerJoin(
      eventGameType,
      eq(eventTournament.eventGameTypeId, eventGameType.id),
    )
    .innerJoin(user, eq(eventTournament.createdById, user.id))
    .leftJoin(
      participantCountSq,
      eq(eventTournament.id, participantCountSq.eventTournamentId),
    )
    .where(and(...conditions))
    .orderBy(desc(eventTournament.createdAt))
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  const result = await query;
  return result as EventTournamentWithDetails[];
}

export async function updateEventTournament(
  id: string,
  data: Partial<
    Pick<
      EventTournament,
      | "name"
      | "description"
      | "logo"
      | "seedingType"
      | "startDate"
      | "status"
      | "totalRounds"
      | "completedAt"
      | "bestOf"
      | "placementPointConfig"
      | "roundBestOf"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<EventTournament | undefined> {
  const result = await dbOrTx
    .update(eventTournament)
    .set(data)
    .where(eq(eventTournament.id, id))
    .returning();
  return result[0];
}

export async function deleteEventTournament(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventTournament)
    .where(eq(eventTournament.id, id))
    .returning({ id: eventTournament.id });
  return result.length > 0;
}

export async function checkEventTournamentNameExists(
  eventId: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(eventTournament.eventId, eventId),
    sql`lower(${eventTournament.name}) = lower(${name})`,
  ];
  if (excludeId) {
    conditions.push(sql`${eventTournament.id} != ${excludeId}`);
  }
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTournament)
    .where(and(...conditions));
  return result[0].count > 0;
}

export async function countEventTournamentsByEventId(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTournament)
    .where(eq(eventTournament.eventId, eventId));
  return result[0].count;
}

// Participants

export async function addEventTournamentParticipant(
  data: Omit<NewEventTournamentParticipant, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentParticipant> {
  const result = await dbOrTx
    .insert(eventTournamentParticipant)
    .values(data)
    .returning();
  return result[0];
}

export async function removeEventTournamentParticipant(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventTournamentParticipant)
    .where(eq(eventTournamentParticipant.id, id))
    .returning({ id: eventTournamentParticipant.id });
  return result.length > 0;
}

export type PartnershipMemberDetail = {
  id: string;
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderParticipant: Pick<
    EventPlaceholderParticipant,
    "id" | "displayName"
  > | null;
};

export type EventTournamentParticipantWithDetails =
  EventTournamentParticipant & {
    team: {
      id: string;
      name: string;
      logo: string | null;
      color: string | null;
    };
    user: Pick<User, "id" | "name" | "username" | "image"> | null;
    placeholderParticipant: Pick<
      EventPlaceholderParticipant,
      "id" | "displayName"
    > | null;
    members?: PartnershipMemberDetail[];
  };

export async function getEventTournamentParticipants(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentParticipantWithDetails[]> {
  const result = await dbOrTx
    .select({
      ...eventTournamentParticipantColumns,
      team: {
        id: eventTeam.id,
        name: eventTeam.name,
        logo: eventTeam.logo,
        color: eventTeam.color,
      },
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      placeholderParticipant: {
        id: eventPlaceholderParticipant.id,
        displayName: eventPlaceholderParticipant.displayName,
      },
    })
    .from(eventTournamentParticipant)
    .innerJoin(
      eventTeam,
      eq(eventTournamentParticipant.eventTeamId, eventTeam.id),
    )
    .leftJoin(user, eq(eventTournamentParticipant.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventTournamentParticipant.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(eq(eventTournamentParticipant.eventTournamentId, tournamentId))
    .orderBy(
      eventTournamentParticipant.seed,
      eventTournamentParticipant.createdAt,
    );

  // Fetch partnership members for all participants
  const participantIds = result.map((p) => p.id);
  if (participantIds.length === 0) return result;

  const memberRows = await dbOrTx
    .select({
      id: eventTournamentParticipantMember.id,
      eventTournamentParticipantId:
        eventTournamentParticipantMember.eventTournamentParticipantId,
      memberUser: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      memberPlaceholder: {
        id: eventPlaceholderParticipant.id,
        displayName: eventPlaceholderParticipant.displayName,
      },
    })
    .from(eventTournamentParticipantMember)
    .leftJoin(user, eq(eventTournamentParticipantMember.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventTournamentParticipantMember.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(
      inArray(
        eventTournamentParticipantMember.eventTournamentParticipantId,
        participantIds,
      ),
    );

  const membersByParticipant = new Map<string, PartnershipMemberDetail[]>();
  for (const row of memberRows) {
    const members =
      membersByParticipant.get(row.eventTournamentParticipantId) ?? [];
    members.push({
      id: row.id,
      user: row.memberUser?.id ? row.memberUser : null,
      placeholderParticipant: row.memberPlaceholder?.id
        ? row.memberPlaceholder
        : null,
    });
    membersByParticipant.set(row.eventTournamentParticipantId, members);
  }

  return result.map((p) => ({
    ...p,
    members: membersByParticipant.get(p.id),
  }));
}

export async function getEventTournamentParticipantById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentParticipant | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventTournamentParticipant)
    .where(eq(eventTournamentParticipant.id, id))
    .limit(1);
  return result[0];
}

export async function bulkUpdateEventParticipantSeeds(
  updates: { id: string; seed: number }[],
  dbOrTx: DBOrTx = db,
): Promise<void> {
  for (const update of updates) {
    await dbOrTx
      .update(eventTournamentParticipant)
      .set({ seed: update.seed })
      .where(eq(eventTournamentParticipant.id, update.id));
  }
}

export async function updateEventTournamentParticipant(
  id: string,
  data: Partial<
    Pick<
      EventTournamentParticipant,
      "seed" | "isEliminated" | "eliminatedInRound" | "finalPlacement"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(eventTournamentParticipant)
    .set(data)
    .where(eq(eventTournamentParticipant.id, id));
}

export async function countEventTournamentParticipants(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTournamentParticipant)
    .where(eq(eventTournamentParticipant.eventTournamentId, tournamentId));
  return result[0].count;
}

export async function checkTeamInEventTournament(
  tournamentId: string,
  eventTeamId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTournamentParticipant)
    .where(
      and(
        eq(eventTournamentParticipant.eventTournamentId, tournamentId),
        eq(eventTournamentParticipant.eventTeamId, eventTeamId),
      ),
    );
  return result[0].count > 0;
}

export async function checkIndividualInEventTournament(
  tournamentId: string,
  opts: {
    userId?: string;
    eventPlaceholderParticipantId?: string;
    eventTeamId?: string;
  },
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(eventTournamentParticipant.eventTournamentId, tournamentId),
  ];
  if (opts.eventTeamId) {
    conditions.push(
      eq(eventTournamentParticipant.eventTeamId, opts.eventTeamId),
    );
  } else if (opts.userId) {
    conditions.push(eq(eventTournamentParticipant.userId, opts.userId));
  } else if (opts.eventPlaceholderParticipantId) {
    conditions.push(
      eq(
        eventTournamentParticipant.eventPlaceholderParticipantId,
        opts.eventPlaceholderParticipantId,
      ),
    );
  }
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTournamentParticipant)
    .where(and(...conditions));
  return result[0].count > 0;
}

// Bracket / Round Matches

export async function createEventTournamentRoundMatches(
  matches: Omit<
    NewEventTournamentRoundMatch,
    "id" | "createdAt" | "updatedAt"
  >[],
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentRoundMatch[]> {
  if (matches.length === 0) return [];
  return await dbOrTx
    .insert(eventTournamentRoundMatch)
    .values(matches)
    .returning();
}

export type EventTournamentRoundMatchWithDetails = EventTournamentRoundMatch & {
  participant1: EventTournamentParticipantWithDetails | null;
  participant2: EventTournamentParticipantWithDetails | null;
  winner: EventTournamentParticipantWithDetails | null;
};

export async function getEventTournamentBracket(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentRoundMatchWithDetails[]> {
  const roundMatches = await dbOrTx
    .select()
    .from(eventTournamentRoundMatch)
    .where(eq(eventTournamentRoundMatch.eventTournamentId, tournamentId))
    .orderBy(
      eventTournamentRoundMatch.round,
      eventTournamentRoundMatch.position,
    );

  const participants = await getEventTournamentParticipants(
    tournamentId,
    dbOrTx,
  );
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  return roundMatches.map((rm) => ({
    ...rm,
    participant1: rm.participant1Id
      ? (participantMap.get(rm.participant1Id) ?? null)
      : null,
    participant2: rm.participant2Id
      ? (participantMap.get(rm.participant2Id) ?? null)
      : null,
    winner: rm.winnerId ? (participantMap.get(rm.winnerId) ?? null) : null,
  }));
}

export async function getEventTournamentRoundMatchById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentRoundMatch | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventTournamentRoundMatch)
    .where(eq(eventTournamentRoundMatch.id, id))
    .limit(1);
  return result[0];
}

export async function updateEventTournamentRoundMatch(
  id: string,
  data: Partial<
    Pick<
      EventTournamentRoundMatch,
      | "participant1Id"
      | "participant2Id"
      | "winnerId"
      | "eventMatchId"
      | "isBye"
      | "isForfeit"
      | "participant1Score"
      | "participant2Score"
      | "isDraw"
      | "participant1Wins"
      | "participant2Wins"
      | "nextMatchId"
      | "nextMatchSlot"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentRoundMatch | undefined> {
  const result = await dbOrTx
    .update(eventTournamentRoundMatch)
    .set(data)
    .where(eq(eventTournamentRoundMatch.id, id))
    .returning();
  return result[0];
}

export async function getEventTournamentRoundMatchByPosition(
  tournamentId: string,
  round: number,
  position: number,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentRoundMatch | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventTournamentRoundMatch)
    .where(
      and(
        eq(eventTournamentRoundMatch.eventTournamentId, tournamentId),
        eq(eventTournamentRoundMatch.round, round),
        eq(eventTournamentRoundMatch.position, position),
      ),
    )
    .limit(1);
  return result[0];
}

export async function getEventTournamentRoundMatchesByRound(
  eventTournamentId: string,
  round: number,
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentRoundMatch[]> {
  return dbOrTx
    .select()
    .from(eventTournamentRoundMatch)
    .where(
      and(
        eq(eventTournamentRoundMatch.eventTournamentId, eventTournamentId),
        eq(eventTournamentRoundMatch.round, round),
      ),
    )
    .orderBy(eventTournamentRoundMatch.position);
}

export type EventTournamentMatchInfo = {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentLogo: string | null;
  eventId: string;
  round: number;
  totalRounds: number | null;
};

export async function getTournamentInfoByEventMatchIds(
  matchIds: string[],
  dbOrTx: DBOrTx = db,
): Promise<EventTournamentMatchInfo[]> {
  if (matchIds.length === 0) return [];
  const result = await dbOrTx
    .select({
      matchId: eventTournamentRoundMatch.eventMatchId,
      tournamentId: eventTournament.id,
      tournamentName: eventTournament.name,
      tournamentLogo: eventTournament.logo,
      eventId: eventTournament.eventId,
      round: eventTournamentRoundMatch.round,
      totalRounds: eventTournament.totalRounds,
    })
    .from(eventTournamentRoundMatch)
    .innerJoin(
      eventTournament,
      eq(eventTournamentRoundMatch.eventTournamentId, eventTournament.id),
    )
    .where(inArray(eventTournamentRoundMatch.eventMatchId, matchIds));
  return result as EventTournamentMatchInfo[];
}

// Partnership member functions

export async function addEventTournamentParticipantMembers(
  members: Omit<NewEventTournamentParticipantMember, "id" | "createdAt">[],
  dbOrTx: DBOrTx = db,
): Promise<void> {
  if (members.length === 0) return;
  await dbOrTx.insert(eventTournamentParticipantMember).values(members);
}

export async function getEventTournamentParticipantMembers(
  participantId: string,
  dbOrTx: DBOrTx = db,
): Promise<PartnershipMemberDetail[]> {
  const rows = await dbOrTx
    .select({
      id: eventTournamentParticipantMember.id,
      memberUser: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      memberPlaceholder: {
        id: eventPlaceholderParticipant.id,
        displayName: eventPlaceholderParticipant.displayName,
      },
    })
    .from(eventTournamentParticipantMember)
    .leftJoin(user, eq(eventTournamentParticipantMember.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventTournamentParticipantMember.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(
      eq(
        eventTournamentParticipantMember.eventTournamentParticipantId,
        participantId,
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    user: row.memberUser?.id ? row.memberUser : null,
    placeholderParticipant: row.memberPlaceholder?.id
      ? row.memberPlaceholder
      : null,
  }));
}

export async function checkIndividualInEventTournamentPartnership(
  tournamentId: string,
  opts: { userId?: string; eventPlaceholderParticipantId?: string },
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(eventTournamentParticipant.eventTournamentId, tournamentId),
  ];

  const memberConditions: ReturnType<typeof eq>[] = [];
  if (opts.userId) {
    memberConditions.push(
      eq(eventTournamentParticipantMember.userId, opts.userId),
    );
  } else if (opts.eventPlaceholderParticipantId) {
    memberConditions.push(
      eq(
        eventTournamentParticipantMember.eventPlaceholderParticipantId,
        opts.eventPlaceholderParticipantId,
      ),
    );
  }

  if (memberConditions.length === 0) return false;

  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTournamentParticipantMember)
    .innerJoin(
      eventTournamentParticipant,
      eq(
        eventTournamentParticipantMember.eventTournamentParticipantId,
        eventTournamentParticipant.id,
      ),
    )
    .where(and(...conditions, ...memberConditions));

  return result[0].count > 0;
}
