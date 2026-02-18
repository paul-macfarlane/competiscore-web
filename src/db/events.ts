import { HighScoreSessionStatus } from "@/lib/shared/constants";
import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  Event,
  EventDiscretionaryAward,
  EventGameType,
  EventHighScoreEntry,
  EventHighScoreSession,
  EventMatch,
  EventMatchParticipant,
  EventParticipant,
  EventPlaceholderParticipant,
  EventPointEntry,
  EventTeam,
  EventTeamMember,
  NewEvent,
  NewEventDiscretionaryAward,
  NewEventGameType,
  NewEventHighScoreEntry,
  NewEventHighScoreSession,
  NewEventMatch,
  NewEventMatchParticipant,
  NewEventParticipant,
  NewEventPlaceholderParticipant,
  NewEventPointEntry,
  NewEventPointEntryParticipant,
  NewEventTeam,
  NewEventTeamMember,
  User,
  event,
  eventColumns,
  eventDiscretionaryAward,
  eventGameType,
  eventHighScoreEntry,
  eventHighScoreEntryColumns,
  eventHighScoreSession,
  eventMatch,
  eventMatchColumns,
  eventMatchParticipant,
  eventMatchParticipantColumns,
  eventParticipant,
  eventParticipantColumns,
  eventPlaceholderParticipant,
  eventPointEntry,
  eventPointEntryParticipant,
  eventTeam,
  eventTeamColumns,
  eventTeamMember,
  eventTeamMemberColumns,
  eventTournament,
  eventTournamentRoundMatch,
  user,
} from "./schema";

// ============================================================
// Type exports
// ============================================================

export type EventWithRole = Event & { role: EventParticipant["role"] };

export type EventParticipantWithUser = EventParticipant & {
  user: Pick<User, "id" | "name" | "username" | "image">;
};

export type EventTeamWithMembers = EventTeam & { memberCount: number };

export type EventTeamMemberWithDetails = EventTeamMember & {
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderParticipant: Pick<
    EventPlaceholderParticipant,
    "id" | "displayName"
  > | null;
};

export type EventTeamMemberForParticipant = {
  userId: string | null;
  eventPlaceholderParticipantId: string | null;
  teamId: string;
  teamName: string;
  teamColor: string | null;
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderParticipant: Pick<
    EventPlaceholderParticipant,
    "id" | "displayName"
  > | null;
};

export type EventMatchParticipantWithDetails = EventMatchParticipant & {
  team: {
    id: string;
    name: string;
    logo: string | null;
    color: string | null;
  } | null;
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderParticipant: Pick<
    EventPlaceholderParticipant,
    "id" | "displayName"
  > | null;
};

export type EventMatchWithParticipants = EventMatch & {
  participants: EventMatchParticipantWithDetails[];
  gameType: {
    id: string;
    name: string;
    category: string;
    config: string;
  } | null;
};

export type EventMatchWithParticipantsAndPoints = EventMatchWithParticipants & {
  pointEntries: EventPointEntry[];
};

export type EventHighScoreEntryWithDetails = EventHighScoreEntry & {
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderParticipant: Pick<
    EventPlaceholderParticipant,
    "id" | "displayName"
  > | null;
  team: Pick<EventTeam, "id" | "name" | "logo" | "color"> | null;
};

export type EventLeaderboardEntry = {
  eventTeamId: string;
  teamName: string;
  teamLogo: string | null;
  teamColor: string | null;
  totalPoints: number;
  rank: number;
};

export type EventIndividualHighScoreEntry = {
  rank: number;
  user: Pick<User, "id" | "name" | "username" | "image"> | null;
  placeholderParticipant: Pick<
    EventPlaceholderParticipant,
    "id" | "displayName"
  > | null;
  teamName: string | null;
  teamColor: string | null;
  bestScore: number;
};

export type EventActivityItem = {
  id: string;
  type: "match" | "high_score_session";
  date: Date;
  gameTypeName: string;
};

export type DiscretionaryAwardWithDetails = EventDiscretionaryAward & {
  createdBy: Pick<User, "id" | "name" | "username" | "image">;
  recipientTeams: Pick<EventTeam, "id" | "name" | "color">[];
};

// ============================================================
// Event CRUD
// ============================================================

export async function createEvent(
  data: Omit<NewEvent, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<Event> {
  const result = await dbOrTx.insert(event).values(data).returning();
  return result[0];
}

export async function getEventById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Event | undefined> {
  const result = await dbOrTx
    .select()
    .from(event)
    .where(eq(event.id, id))
    .limit(1);
  return result[0];
}

export async function updateEvent(
  id: string,
  data: Partial<
    Pick<
      Event,
      | "name"
      | "description"
      | "logo"
      | "visibility"
      | "scoringType"
      | "status"
      | "startDate"
      | "completedAt"
      | "isArchived"
    >
  >,
  dbOrTx: DBOrTx = db,
): Promise<Event | undefined> {
  const result = await dbOrTx
    .update(event)
    .set(data)
    .where(eq(event.id, id))
    .returning();
  return result[0];
}

export async function deleteEvent(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx.delete(event).where(eq(event.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getUserEvents(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventWithRole[]> {
  const results = await dbOrTx
    .select({
      ...eventColumns,
      role: eventParticipant.role,
    })
    .from(eventParticipant)
    .innerJoin(event, eq(eventParticipant.eventId, event.id))
    .where(eq(eventParticipant.userId, userId))
    .orderBy(desc(event.createdAt));

  return results;
}

export async function checkEventNameExists(
  createdById: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(event.createdById, createdById),
    sql`LOWER(${event.name}) = LOWER(${name})`,
  ];

  if (excludeId) {
    conditions.push(sql`${event.id} != ${excludeId}`);
  }

  const result = await dbOrTx
    .select({ count: count() })
    .from(event)
    .where(and(...conditions));

  return result[0].count > 0;
}

export async function countEventsByUser(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(event)
    .where(eq(event.createdById, userId));
  return result[0].count;
}

// ============================================================
// Participants
// ============================================================

export async function addEventParticipant(
  data: Omit<NewEventParticipant, "id" | "joinedAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventParticipant> {
  const result = await dbOrTx.insert(eventParticipant).values(data).returning();
  return result[0];
}

export async function removeEventParticipant(
  eventId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventParticipant)
    .where(
      and(
        eq(eventParticipant.eventId, eventId),
        eq(eventParticipant.userId, userId),
      ),
    );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getEventParticipants(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventParticipantWithUser[]> {
  const results = await dbOrTx
    .select({
      ...eventParticipantColumns,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(eventParticipant)
    .innerJoin(user, eq(eventParticipant.userId, user.id))
    .where(eq(eventParticipant.eventId, eventId))
    .orderBy(eventParticipant.joinedAt);

  return results;
}

export async function getEventParticipant(
  eventId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventParticipant | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventParticipant)
    .where(
      and(
        eq(eventParticipant.eventId, eventId),
        eq(eventParticipant.userId, userId),
      ),
    )
    .limit(1);
  return result[0];
}

export async function updateEventParticipantRole(
  eventId: string,
  userId: string,
  role: EventParticipant["role"],
  dbOrTx: DBOrTx = db,
): Promise<EventParticipant | undefined> {
  const result = await dbOrTx
    .update(eventParticipant)
    .set({ role })
    .where(
      and(
        eq(eventParticipant.eventId, eventId),
        eq(eventParticipant.userId, userId),
      ),
    )
    .returning();
  return result[0];
}

export async function countEventParticipants(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventParticipant)
    .where(eq(eventParticipant.eventId, eventId));
  return result[0].count;
}

export async function countEventOrganizers(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventParticipant)
    .where(
      and(
        eq(eventParticipant.eventId, eventId),
        eq(eventParticipant.role, "organizer"),
      ),
    );
  return result[0].count;
}

// ============================================================
// Placeholders
// ============================================================

export async function createEventPlaceholder(
  data: Omit<NewEventPlaceholderParticipant, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant> {
  const result = await dbOrTx
    .insert(eventPlaceholderParticipant)
    .values(data)
    .returning();
  return result[0];
}

export async function getEventPlaceholders(
  eventId: string,
  dbOrTx: DBOrTx = db,
  options?: { includeRetired?: boolean },
): Promise<EventPlaceholderParticipant[]> {
  const conditions = [eq(eventPlaceholderParticipant.eventId, eventId)];
  if (!options?.includeRetired) {
    conditions.push(isNull(eventPlaceholderParticipant.retiredAt));
  }

  return await dbOrTx
    .select()
    .from(eventPlaceholderParticipant)
    .where(and(...conditions))
    .orderBy(eventPlaceholderParticipant.createdAt);
}

export async function getRetiredEventPlaceholders(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant[]> {
  return await dbOrTx
    .select()
    .from(eventPlaceholderParticipant)
    .where(
      and(
        eq(eventPlaceholderParticipant.eventId, eventId),
        sql`${eventPlaceholderParticipant.retiredAt} IS NOT NULL`,
      ),
    )
    .orderBy(eventPlaceholderParticipant.createdAt);
}

export async function getEventPlaceholderById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventPlaceholderParticipant)
    .where(eq(eventPlaceholderParticipant.id, id))
    .limit(1);
  return result[0];
}

export async function linkEventPlaceholder(
  id: string,
  linkedUserId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant | undefined> {
  const result = await dbOrTx
    .update(eventPlaceholderParticipant)
    .set({ linkedUserId })
    .where(eq(eventPlaceholderParticipant.id, id))
    .returning();
  return result[0];
}

export async function retireEventPlaceholder(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant | undefined> {
  const result = await dbOrTx
    .update(eventPlaceholderParticipant)
    .set({ retiredAt: new Date() })
    .where(eq(eventPlaceholderParticipant.id, id))
    .returning();
  return result[0];
}

export async function countEventPlaceholders(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventPlaceholderParticipant)
    .where(eq(eventPlaceholderParticipant.eventId, eventId));
  return result[0].count;
}

export async function updateEventPlaceholder(
  id: string,
  data: { displayName: string },
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant | undefined> {
  const result = await dbOrTx
    .update(eventPlaceholderParticipant)
    .set(data)
    .where(eq(eventPlaceholderParticipant.id, id))
    .returning();
  return result[0];
}

export async function restoreEventPlaceholder(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPlaceholderParticipant | undefined> {
  const result = await dbOrTx
    .update(eventPlaceholderParticipant)
    .set({ retiredAt: null })
    .where(eq(eventPlaceholderParticipant.id, id))
    .returning();
  return result[0];
}

export async function deleteEventPlaceholder(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventPlaceholderParticipant)
    .where(eq(eventPlaceholderParticipant.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function hasEventPlaceholderActivity(
  placeholderId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const matchParticipation = await dbOrTx
    .select({ count: count() })
    .from(eventMatchParticipant)
    .where(
      eq(eventMatchParticipant.eventPlaceholderParticipantId, placeholderId),
    );

  if (matchParticipation[0].count > 0) return true;

  const highScoreEntries = await dbOrTx
    .select({ count: count() })
    .from(eventHighScoreEntry)
    .where(
      eq(eventHighScoreEntry.eventPlaceholderParticipantId, placeholderId),
    );

  return highScoreEntries[0].count > 0;
}

// ============================================================
// Game types
// ============================================================

export async function createEventGameType(
  data: Omit<NewEventGameType, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventGameType> {
  const result = await dbOrTx.insert(eventGameType).values(data).returning();
  return result[0];
}

export async function getEventGameTypes(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventGameType[]> {
  return await dbOrTx
    .select()
    .from(eventGameType)
    .where(eq(eventGameType.eventId, eventId))
    .orderBy(eventGameType.createdAt);
}

export async function getEventGameTypeById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventGameType | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventGameType)
    .where(eq(eventGameType.id, id))
    .limit(1);
  return result[0];
}

export async function updateEventGameType(
  id: string,
  data: Partial<
    Pick<EventGameType, "name" | "description" | "logo" | "config">
  >,
  dbOrTx: DBOrTx = db,
): Promise<EventGameType | undefined> {
  const result = await dbOrTx
    .update(eventGameType)
    .set(data)
    .where(eq(eventGameType.id, id))
    .returning();
  return result[0];
}

export async function archiveEventGameType(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventGameType | undefined> {
  const result = await dbOrTx
    .update(eventGameType)
    .set({ isArchived: true })
    .where(eq(eventGameType.id, id))
    .returning();
  return result[0];
}

export async function checkEventGameTypeNameExists(
  eventId: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(eventGameType.eventId, eventId),
    sql`LOWER(${eventGameType.name}) = LOWER(${name})`,
  ];

  if (excludeId) {
    conditions.push(sql`${eventGameType.id} != ${excludeId}`);
  }

  const result = await dbOrTx
    .select({ count: count() })
    .from(eventGameType)
    .where(and(...conditions));

  return result[0].count > 0;
}

export async function unarchiveEventGameType(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventGameType | undefined> {
  const result = await dbOrTx
    .update(eventGameType)
    .set({ isArchived: false })
    .where(eq(eventGameType.id, id))
    .returning();
  return result[0];
}

export async function deleteEventGameType(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventGameType)
    .where(eq(eventGameType.id, id))
    .returning();
  return result.length > 0;
}

export async function countEventGameTypes(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventGameType)
    .where(
      and(
        eq(eventGameType.eventId, eventId),
        eq(eventGameType.isArchived, false),
      ),
    );
  return result[0].count;
}

// ============================================================
// Teams
// ============================================================

export async function createEventTeam(
  data: Omit<NewEventTeam, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventTeam> {
  const result = await dbOrTx.insert(eventTeam).values(data).returning();
  return result[0];
}

export async function getEventTeams(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeamWithMembers[]> {
  const teams = await dbOrTx
    .select()
    .from(eventTeam)
    .where(eq(eventTeam.eventId, eventId))
    .orderBy(eventTeam.createdAt);

  if (teams.length === 0) return [];

  const memberCounts = await Promise.all(
    teams.map(async (t) => {
      const countResult = await dbOrTx
        .select({ count: count() })
        .from(eventTeamMember)
        .where(eq(eventTeamMember.eventTeamId, t.id));
      return { teamId: t.id, count: countResult[0]?.count ?? 0 };
    }),
  );

  const countMap = new Map(memberCounts.map((c) => [c.teamId, c.count]));

  return teams.map((t) => ({
    ...t,
    memberCount: countMap.get(t.id) ?? 0,
  }));
}

export async function getEventTeamById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeam | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventTeam)
    .where(eq(eventTeam.id, id))
    .limit(1);
  return result[0];
}

export async function updateEventTeam(
  id: string,
  data: Partial<Pick<EventTeam, "name" | "logo" | "color">>,
  dbOrTx: DBOrTx = db,
): Promise<EventTeam | undefined> {
  const result = await dbOrTx
    .update(eventTeam)
    .set(data)
    .where(eq(eventTeam.id, id))
    .returning();
  return result[0];
}

export async function deleteEventTeam(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx.delete(eventTeam).where(eq(eventTeam.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function countEventTeams(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTeam)
    .where(eq(eventTeam.eventId, eventId));
  return result[0].count;
}

export async function checkEventTeamNameExists(
  eventId: string,
  name: string,
  excludeId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [
    eq(eventTeam.eventId, eventId),
    sql`LOWER(${eventTeam.name}) = LOWER(${name})`,
  ];

  if (excludeId) {
    conditions.push(sql`${eventTeam.id} != ${excludeId}`);
  }

  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTeam)
    .where(and(...conditions));

  return result[0].count > 0;
}

// ============================================================
// Team members
// ============================================================

export async function addEventTeamMember(
  data: Omit<NewEventTeamMember, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventTeamMember> {
  const result = await dbOrTx.insert(eventTeamMember).values(data).returning();
  return result[0];
}

export async function getEventTeamMemberById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeamMember | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventTeamMember)
    .where(eq(eventTeamMember.id, id))
    .limit(1);
  return result[0];
}

export async function removeEventTeamMember(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventTeamMember)
    .where(eq(eventTeamMember.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getEventTeamMembers(
  teamId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeamMemberWithDetails[]> {
  const results = await dbOrTx
    .select({
      ...eventTeamMemberColumns,
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
    .from(eventTeamMember)
    .leftJoin(user, eq(eventTeamMember.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventTeamMember.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(eq(eventTeamMember.eventTeamId, teamId))
    .orderBy(eventTeamMember.createdAt);

  return results;
}

export async function getTeamForUser(
  eventId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeam | undefined> {
  const result = await dbOrTx
    .select({ ...eventTeamColumns })
    .from(eventTeam)
    .innerJoin(eventTeamMember, eq(eventTeam.id, eventTeamMember.eventTeamId))
    .where(
      and(eq(eventTeam.eventId, eventId), eq(eventTeamMember.userId, userId)),
    )
    .limit(1);
  return result[0];
}

export async function getTeamForPlaceholder(
  eventId: string,
  placeholderId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeam | undefined> {
  const result = await dbOrTx
    .select({ ...eventTeamColumns })
    .from(eventTeam)
    .innerJoin(eventTeamMember, eq(eventTeam.id, eventTeamMember.eventTeamId))
    .where(
      and(
        eq(eventTeam.eventId, eventId),
        eq(eventTeamMember.eventPlaceholderParticipantId, placeholderId),
      ),
    )
    .limit(1);
  return result[0];
}

export async function countEventTeamMembers(
  teamId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(eventTeamMember)
    .where(eq(eventTeamMember.eventTeamId, teamId));
  return result[0].count;
}

export async function getEventTeamMembersWithTeamNames(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventTeamMemberForParticipant[]> {
  const results = await dbOrTx
    .select({
      userId: eventTeamMember.userId,
      eventPlaceholderParticipantId:
        eventTeamMember.eventPlaceholderParticipantId,
      teamId: eventTeam.id,
      teamName: eventTeam.name,
      teamColor: eventTeam.color,
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
    .from(eventTeamMember)
    .innerJoin(eventTeam, eq(eventTeamMember.eventTeamId, eventTeam.id))
    .leftJoin(user, eq(eventTeamMember.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventTeamMember.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(eq(eventTeam.eventId, eventId))
    .orderBy(eventTeam.name, eventTeamMember.createdAt);

  return results;
}

// ============================================================
// Matches
// ============================================================

export async function createEventMatch(
  data: Omit<NewEventMatch, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventMatch> {
  const result = await dbOrTx.insert(eventMatch).values(data).returning();
  return result[0];
}

export async function createEventMatchParticipants(
  data: Omit<NewEventMatchParticipant, "id" | "createdAt">[],
  dbOrTx: DBOrTx = db,
): Promise<EventMatchParticipant[]> {
  if (data.length === 0) return [];
  return await dbOrTx.insert(eventMatchParticipant).values(data).returning();
}

export async function getEventMatchById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventMatch | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventMatch)
    .where(eq(eventMatch.id, id))
    .limit(1);
  return result[0];
}

export async function getEventMatchesByRoundMatchId(
  roundMatchId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventMatch[]> {
  return await dbOrTx
    .select()
    .from(eventMatch)
    .where(eq(eventMatch.eventTournamentRoundMatchId, roundMatchId))
    .orderBy(desc(eventMatch.createdAt));
}

export async function deleteEventMatch(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventMatch)
    .where(eq(eventMatch.id, id))
    .returning({ id: eventMatch.id });
  return result.length > 0;
}

export async function deleteEventMatchParticipants(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .delete(eventMatchParticipant)
    .where(eq(eventMatchParticipant.eventMatchId, matchId));
}

export async function deleteEventPointEntriesForMatch(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .delete(eventPointEntry)
    .where(eq(eventPointEntry.eventMatchId, matchId));
}

export async function deleteEventPointEntriesForTournament(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .delete(eventPointEntry)
    .where(eq(eventPointEntry.eventTournamentId, tournamentId));
}

export async function deleteEventMatchesForTournament(
  tournamentId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  const roundMatchIds = dbOrTx
    .select({ id: eventTournamentRoundMatch.id })
    .from(eventTournamentRoundMatch)
    .where(eq(eventTournamentRoundMatch.eventTournamentId, tournamentId));

  await dbOrTx
    .delete(eventMatch)
    .where(inArray(eventMatch.eventTournamentRoundMatchId, roundMatchIds));
}

async function getEventMatchParticipants(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventMatchParticipantWithDetails[]> {
  const result = await dbOrTx
    .select({
      ...eventMatchParticipantColumns,
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
    .from(eventMatchParticipant)
    .leftJoin(eventTeam, eq(eventMatchParticipant.eventTeamId, eventTeam.id))
    .leftJoin(user, eq(eventMatchParticipant.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventMatchParticipant.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(eq(eventMatchParticipant.eventMatchId, matchId))
    .orderBy(eventMatchParticipant.side, eventMatchParticipant.rank);

  return result;
}

export async function getEventMatchWithParticipants(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventMatchWithParticipants | undefined> {
  const matchData = await dbOrTx
    .select({
      ...eventMatchColumns,
      gameType: {
        id: eventGameType.id,
        name: eventGameType.name,
        category: eventGameType.category,
        config: eventGameType.config,
      },
    })
    .from(eventMatch)
    .leftJoin(eventGameType, eq(eventMatch.eventGameTypeId, eventGameType.id))
    .where(eq(eventMatch.id, id))
    .limit(1);

  if (!matchData[0]) return undefined;

  const participants = await getEventMatchParticipants(id, dbOrTx);

  return {
    ...matchData[0],
    participants,
  };
}

export async function getEventMatchesPaginated(
  eventId: string,
  options: { limit: number; offset: number; gameTypeId?: string },
  dbOrTx: DBOrTx = db,
): Promise<{ matches: EventMatchWithParticipants[]; total: number }> {
  const { limit, offset, gameTypeId } = options;

  const whereConditions = gameTypeId
    ? and(
        eq(eventMatch.eventId, eventId),
        eq(eventMatch.eventGameTypeId, gameTypeId),
      )
    : eq(eventMatch.eventId, eventId);

  const [countResult, matches] = await Promise.all([
    dbOrTx.select({ count: count() }).from(eventMatch).where(whereConditions),
    dbOrTx
      .select({
        ...eventMatchColumns,
        gameType: {
          id: eventGameType.id,
          name: eventGameType.name,
          category: eventGameType.category,
          config: eventGameType.config,
        },
      })
      .from(eventMatch)
      .leftJoin(eventGameType, eq(eventMatch.eventGameTypeId, eventGameType.id))
      .where(whereConditions)
      .orderBy(desc(eventMatch.playedAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.count ?? 0;

  if (matches.length === 0) return { matches: [], total };

  const matchesWithParticipants = await Promise.all(
    matches.map(async (m) => {
      const participants = await getEventMatchParticipants(m.id, dbOrTx);
      return { ...m, participants };
    }),
  );

  return { matches: matchesWithParticipants, total };
}

// ============================================================
// High score sessions
// ============================================================

export async function createHighScoreSession(
  data: Omit<NewEventHighScoreSession, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession> {
  const result = await dbOrTx
    .insert(eventHighScoreSession)
    .values(data)
    .returning();
  return result[0];
}

export async function getHighScoreSessionById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventHighScoreSession)
    .where(eq(eventHighScoreSession.id, id))
    .limit(1);
  return result[0];
}

export async function getOpenHighScoreSessions(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession[]> {
  return await dbOrTx
    .select()
    .from(eventHighScoreSession)
    .where(
      and(
        eq(eventHighScoreSession.eventId, eventId),
        eq(eventHighScoreSession.status, HighScoreSessionStatus.OPEN),
      ),
    )
    .orderBy(desc(eventHighScoreSession.openedAt));
}

export async function closeHighScoreSession(
  id: string,
  closedById: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession | undefined> {
  const result = await dbOrTx
    .update(eventHighScoreSession)
    .set({
      status: HighScoreSessionStatus.CLOSED,
      closedById,
      closedAt: new Date(),
    })
    .where(eq(eventHighScoreSession.id, id))
    .returning();
  return result[0];
}

export async function updateHighScoreSession(
  sessionId: string,
  data: {
    name?: string | null;
    description?: string | null;
    placementPointConfig?: string | null;
  },
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession | undefined> {
  const [updated] = await dbOrTx
    .update(eventHighScoreSession)
    .set(data)
    .where(eq(eventHighScoreSession.id, sessionId))
    .returning();
  return updated;
}

export async function reopenHighScoreSession(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession | undefined> {
  const result = await dbOrTx
    .update(eventHighScoreSession)
    .set({
      status: HighScoreSessionStatus.OPEN,
      closedById: null,
      closedAt: null,
    })
    .where(eq(eventHighScoreSession.id, id))
    .returning();
  return result[0];
}

export async function deleteEventPointEntriesForHighScoreSession(
  sessionId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .delete(eventPointEntry)
    .where(eq(eventPointEntry.eventHighScoreSessionId, sessionId));
}

export async function deleteHighScoreSession(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventHighScoreSession)
    .where(eq(eventHighScoreSession.id, id))
    .returning({ id: eventHighScoreSession.id });
  return result.length > 0;
}

export async function getClosedHighScoreSessions(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreSession[]> {
  return await dbOrTx
    .select()
    .from(eventHighScoreSession)
    .where(
      and(
        eq(eventHighScoreSession.eventId, eventId),
        eq(eventHighScoreSession.status, HighScoreSessionStatus.CLOSED),
      ),
    )
    .orderBy(desc(eventHighScoreSession.closedAt));
}

// ============================================================
// High score entries
// ============================================================

export async function createEventHighScoreEntry(
  data: Omit<NewEventHighScoreEntry, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreEntry> {
  const result = await dbOrTx
    .insert(eventHighScoreEntry)
    .values(data)
    .returning();
  return result[0];
}

export async function getHighScoreEntryById(
  entryId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreEntry | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventHighScoreEntry)
    .where(eq(eventHighScoreEntry.id, entryId));
  return result[0];
}

export async function deleteHighScoreEntry(
  entryId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventHighScoreEntry)
    .where(eq(eventHighScoreEntry.id, entryId))
    .returning();
  return result.length > 0;
}

export async function getSessionHighScoreEntries(
  sessionId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventHighScoreEntryWithDetails[]> {
  const result = await dbOrTx
    .select({
      ...eventHighScoreEntryColumns,
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
      team: {
        id: eventTeam.id,
        name: eventTeam.name,
        logo: eventTeam.logo,
        color: eventTeam.color,
      },
    })
    .from(eventHighScoreEntry)
    .leftJoin(user, eq(eventHighScoreEntry.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventHighScoreEntry.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .leftJoin(eventTeam, eq(eventHighScoreEntry.eventTeamId, eventTeam.id))
    .where(eq(eventHighScoreEntry.sessionId, sessionId))
    .orderBy(desc(eventHighScoreEntry.score));

  return result;
}

// ============================================================
// Point entries
// ============================================================

export async function createEventPointEntries(
  data: Omit<NewEventPointEntry, "id" | "createdAt">[],
  dbOrTx: DBOrTx = db,
): Promise<EventPointEntry[]> {
  if (data.length === 0) return [];
  return await dbOrTx.insert(eventPointEntry).values(data).returning();
}

export async function getEventPointEntries(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPointEntry[]> {
  return await dbOrTx
    .select()
    .from(eventPointEntry)
    .where(eq(eventPointEntry.eventId, eventId))
    .orderBy(desc(eventPointEntry.createdAt));
}

export async function getPointEntriesForMatches(
  matchIds: string[],
  dbOrTx: DBOrTx = db,
): Promise<EventPointEntry[]> {
  if (matchIds.length === 0) return [];
  return await dbOrTx
    .select()
    .from(eventPointEntry)
    .where(inArray(eventPointEntry.eventMatchId, matchIds));
}

export async function getPointEntriesForMatch(
  matchId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventPointEntry[]> {
  return await dbOrTx
    .select()
    .from(eventPointEntry)
    .where(eq(eventPointEntry.eventMatchId, matchId));
}

export type PointEntryWithTeam = EventPointEntry & {
  teamName: string | null;
  teamColor: string | null;
};

export async function getPointEntriesForHighScoreSessions(
  sessionIds: string[],
  dbOrTx: DBOrTx = db,
): Promise<PointEntryWithTeam[]> {
  if (sessionIds.length === 0) return [];
  return await dbOrTx
    .select({
      id: eventPointEntry.id,
      eventId: eventPointEntry.eventId,
      category: eventPointEntry.category,
      outcome: eventPointEntry.outcome,
      eventTeamId: eventPointEntry.eventTeamId,
      eventMatchId: eventPointEntry.eventMatchId,
      eventHighScoreSessionId: eventPointEntry.eventHighScoreSessionId,
      eventTournamentId: eventPointEntry.eventTournamentId,
      eventDiscretionaryAwardId: eventPointEntry.eventDiscretionaryAwardId,
      points: eventPointEntry.points,
      createdAt: eventPointEntry.createdAt,
      teamName: eventTeam.name,
      teamColor: eventTeam.color,
    })
    .from(eventPointEntry)
    .leftJoin(eventTeam, eq(eventPointEntry.eventTeamId, eventTeam.id))
    .where(inArray(eventPointEntry.eventHighScoreSessionId, sessionIds))
    .orderBy(desc(eventPointEntry.points));
}

export async function getPointEntriesForGameType(
  gameTypeId: string,
  dbOrTx: DBOrTx = db,
): Promise<PointEntryWithTeam[]> {
  return await dbOrTx
    .select({
      id: eventPointEntry.id,
      eventId: eventPointEntry.eventId,
      category: eventPointEntry.category,
      outcome: eventPointEntry.outcome,
      eventTeamId: eventPointEntry.eventTeamId,
      eventMatchId: eventPointEntry.eventMatchId,
      eventHighScoreSessionId: eventPointEntry.eventHighScoreSessionId,
      eventTournamentId: eventPointEntry.eventTournamentId,
      eventDiscretionaryAwardId: eventPointEntry.eventDiscretionaryAwardId,
      points: eventPointEntry.points,
      createdAt: eventPointEntry.createdAt,
      teamName: eventTeam.name,
      teamColor: eventTeam.color,
    })
    .from(eventPointEntry)
    .leftJoin(eventTeam, eq(eventPointEntry.eventTeamId, eventTeam.id))
    .innerJoin(
      eventHighScoreSession,
      eq(eventPointEntry.eventHighScoreSessionId, eventHighScoreSession.id),
    )
    .where(eq(eventHighScoreSession.eventGameTypeId, gameTypeId))
    .orderBy(desc(eventPointEntry.points));
}

// ============================================================
// Leaderboard
// ============================================================

export async function getEventLeaderboard(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventLeaderboardEntry[]> {
  const results = await dbOrTx
    .select({
      eventTeamId: eventTeam.id,
      teamName: eventTeam.name,
      teamLogo: eventTeam.logo,
      teamColor: eventTeam.color,
      totalPoints: sql<number>`COALESCE(SUM(${eventPointEntry.points}), 0)`,
    })
    .from(eventTeam)
    .leftJoin(
      eventPointEntry,
      and(
        eq(eventPointEntry.eventTeamId, eventTeam.id),
        eq(eventPointEntry.eventId, eventId),
      ),
    )
    .where(eq(eventTeam.eventId, eventId))
    .groupBy(eventTeam.id, eventTeam.name, eventTeam.logo, eventTeam.color)
    .orderBy(desc(sql`COALESCE(SUM(${eventPointEntry.points}), 0)`));

  return results.map((row, index) => ({
    ...row,
    totalPoints: Number(row.totalPoints),
    rank: index + 1,
  }));
}

export async function getEventGameTypeLeaderboard(
  eventId: string,
  gameTypeId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventLeaderboardEntry[]> {
  const results = await dbOrTx
    .select({
      eventTeamId: eventTeam.id,
      teamName: eventTeam.name,
      teamLogo: eventTeam.logo,
      teamColor: eventTeam.color,
      totalPoints: sql<number>`COALESCE(SUM(${eventPointEntry.points}), 0)`,
    })
    .from(eventTeam)
    .leftJoin(
      eventPointEntry,
      and(
        eq(eventPointEntry.eventTeamId, eventTeam.id),
        eq(eventPointEntry.eventId, eventId),
      ),
    )
    .leftJoin(eventMatch, eq(eventPointEntry.eventMatchId, eventMatch.id))
    .leftJoin(
      eventHighScoreSession,
      eq(eventPointEntry.eventHighScoreSessionId, eventHighScoreSession.id),
    )
    .leftJoin(
      eventTournament,
      eq(eventPointEntry.eventTournamentId, eventTournament.id),
    )
    .where(
      and(
        eq(eventTeam.eventId, eventId),
        or(
          isNull(eventPointEntry.id),
          eq(eventMatch.eventGameTypeId, gameTypeId),
          eq(eventHighScoreSession.eventGameTypeId, gameTypeId),
          eq(eventTournament.eventGameTypeId, gameTypeId),
        ),
      ),
    )
    .groupBy(eventTeam.id, eventTeam.name, eventTeam.logo, eventTeam.color)
    .orderBy(desc(sql`COALESCE(SUM(${eventPointEntry.points}), 0)`));

  return results.map((row, index) => ({
    ...row,
    totalPoints: Number(row.totalPoints),
    rank: index + 1,
  }));
}

export async function getEventHighScoreIndividualLeaderboard(
  eventId: string,
  gameTypeId: string,
  options: {
    limit: number;
    offset: number;
    scoreOrder?: "highest_wins" | "lowest_wins";
  },
  dbOrTx: DBOrTx = db,
): Promise<{ entries: EventIndividualHighScoreEntry[]; total: number }> {
  const { limit, offset, scoreOrder = "highest_wins" } = options;

  const orderFn =
    scoreOrder === "lowest_wins"
      ? sql`MIN(${eventHighScoreEntry.score})`
      : sql`MAX(${eventHighScoreEntry.score})`;
  const orderDirection =
    scoreOrder === "lowest_wins"
      ? sql`MIN(${eventHighScoreEntry.score}) ASC`
      : sql`MAX(${eventHighScoreEntry.score}) DESC`;

  const baseConditions = and(
    eq(eventHighScoreEntry.eventGameTypeId, gameTypeId),
    sql`${eventHighScoreEntry.eventId} = ${eventId}`,
  );

  const countResult = await dbOrTx
    .select({
      total: sql<number>`count(distinct coalesce(${eventHighScoreEntry.userId}, ${eventHighScoreEntry.eventPlaceholderParticipantId}))`,
    })
    .from(eventHighScoreEntry)
    .where(baseConditions);

  const total = Number(countResult[0]?.total ?? 0);

  if (total === 0) return { entries: [], total: 0 };

  const results = await dbOrTx
    .select({
      bestScore: orderFn.as("best_score"),
      userId: eventHighScoreEntry.userId,
      eventPlaceholderParticipantId:
        eventHighScoreEntry.eventPlaceholderParticipantId,
      userName: user.name,
      userUsername: user.username,
      userImage: user.image,
      placeholderDisplayName: eventPlaceholderParticipant.displayName,
      placeholderParticipantId: eventPlaceholderParticipant.id,
      teamName: eventTeam.name,
      teamColor: eventTeam.color,
    })
    .from(eventHighScoreEntry)
    .leftJoin(user, eq(eventHighScoreEntry.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventHighScoreEntry.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .leftJoin(
      eventTeamMember,
      or(
        and(
          eq(eventTeamMember.userId, eventHighScoreEntry.userId),
          sql`${eventHighScoreEntry.userId} IS NOT NULL`,
        ),
        and(
          eq(
            eventTeamMember.eventPlaceholderParticipantId,
            eventHighScoreEntry.eventPlaceholderParticipantId,
          ),
          sql`${eventHighScoreEntry.eventPlaceholderParticipantId} IS NOT NULL`,
        ),
      ),
    )
    .leftJoin(
      eventTeam,
      and(
        eq(eventTeamMember.eventTeamId, eventTeam.id),
        eq(eventTeam.eventId, eventId),
      ),
    )
    .where(baseConditions)
    .groupBy(
      eventHighScoreEntry.userId,
      eventHighScoreEntry.eventPlaceholderParticipantId,
      user.id,
      user.name,
      user.username,
      user.image,
      eventPlaceholderParticipant.id,
      eventPlaceholderParticipant.displayName,
      eventTeam.name,
      eventTeam.color,
    )
    .orderBy(orderDirection)
    .limit(limit)
    .offset(offset);

  const entries: EventIndividualHighScoreEntry[] = results.map(
    (row, index) => ({
      rank: offset + index + 1,
      user: row.userId
        ? {
            id: row.userId,
            name: row.userName!,
            username: row.userUsername!,
            image: row.userImage ?? null,
          }
        : null,
      placeholderParticipant: row.placeholderParticipantId
        ? {
            id: row.placeholderParticipantId,
            displayName: row.placeholderDisplayName!,
          }
        : null,
      teamName: row.teamName ?? null,
      teamColor: row.teamColor ?? null,
      bestScore: Number(row.bestScore),
    }),
  );

  return { entries, total };
}

// ============================================================
// Activity
// ============================================================

export async function getEventActivity(
  eventId: string,
  options: { limit: number; offset: number },
  dbOrTx: DBOrTx = db,
): Promise<{ items: EventActivityItem[]; totalCount: number }> {
  const { limit, offset } = options;

  const [matches, sessions, matchCountResult, sessionCountResult] =
    await Promise.all([
      dbOrTx
        .select({
          id: eventMatch.id,
          date: eventMatch.playedAt,
          gameTypeName: eventGameType.name,
        })
        .from(eventMatch)
        .innerJoin(
          eventGameType,
          eq(eventMatch.eventGameTypeId, eventGameType.id),
        )
        .where(eq(eventMatch.eventId, eventId)),
      dbOrTx
        .select({
          id: eventHighScoreSession.id,
          date: eventHighScoreSession.openedAt,
          gameTypeName: eventGameType.name,
        })
        .from(eventHighScoreSession)
        .innerJoin(
          eventGameType,
          eq(eventHighScoreSession.eventGameTypeId, eventGameType.id),
        )
        .where(eq(eventHighScoreSession.eventId, eventId)),
      dbOrTx
        .select({ count: count() })
        .from(eventMatch)
        .where(eq(eventMatch.eventId, eventId)),
      dbOrTx
        .select({ count: count() })
        .from(eventHighScoreSession)
        .where(eq(eventHighScoreSession.eventId, eventId)),
    ]);

  const totalCount = matchCountResult[0].count + sessionCountResult[0].count;

  const combined: EventActivityItem[] = [
    ...matches.map((m) => ({
      id: m.id,
      type: "match" as const,
      date: m.date,
      gameTypeName: m.gameTypeName,
    })),
    ...sessions.map((s) => ({
      id: s.id,
      type: "high_score_session" as const,
      date: s.date,
      gameTypeName: s.gameTypeName,
    })),
  ];

  combined.sort((a, b) => b.date.getTime() - a.date.getTime());

  const items = combined.slice(offset, offset + limit);

  return { items, totalCount };
}

// ============================================================
// Discretionary Awards
// ============================================================

export async function createDiscretionaryAward(
  data: Omit<NewEventDiscretionaryAward, "id" | "createdAt" | "updatedAt">,
  dbOrTx: DBOrTx = db,
): Promise<EventDiscretionaryAward> {
  const result = await dbOrTx
    .insert(eventDiscretionaryAward)
    .values(data)
    .returning();
  return result[0];
}

export async function getDiscretionaryAwardById(
  awardId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventDiscretionaryAward | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventDiscretionaryAward)
    .where(eq(eventDiscretionaryAward.id, awardId))
    .limit(1);
  return result[0];
}

export async function getEventDiscretionaryAwards(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<DiscretionaryAwardWithDetails[]> {
  const awards = await dbOrTx
    .select({
      id: eventDiscretionaryAward.id,
      eventId: eventDiscretionaryAward.eventId,
      name: eventDiscretionaryAward.name,
      description: eventDiscretionaryAward.description,
      points: eventDiscretionaryAward.points,
      createdByUserId: eventDiscretionaryAward.createdByUserId,
      createdAt: eventDiscretionaryAward.createdAt,
      updatedAt: eventDiscretionaryAward.updatedAt,
      creatorName: user.name,
      creatorUsername: user.username,
      creatorImage: user.image,
    })
    .from(eventDiscretionaryAward)
    .innerJoin(user, eq(eventDiscretionaryAward.createdByUserId, user.id))
    .where(eq(eventDiscretionaryAward.eventId, eventId))
    .orderBy(desc(eventDiscretionaryAward.createdAt));

  if (awards.length === 0) return [];

  const awardIds = awards.map((a) => a.id);
  const pointEntries = await dbOrTx
    .select({
      awardId: eventPointEntry.eventDiscretionaryAwardId,
      teamId: eventTeam.id,
      teamName: eventTeam.name,
      teamColor: eventTeam.color,
    })
    .from(eventPointEntry)
    .innerJoin(eventTeam, eq(eventPointEntry.eventTeamId, eventTeam.id))
    .where(inArray(eventPointEntry.eventDiscretionaryAwardId, awardIds));

  const teamsByAward = new Map<
    string,
    Pick<EventTeam, "id" | "name" | "color">[]
  >();
  for (const entry of pointEntries) {
    if (!entry.awardId) continue;
    const teams = teamsByAward.get(entry.awardId) ?? [];
    if (!teams.some((t) => t.id === entry.teamId)) {
      teams.push({
        id: entry.teamId,
        name: entry.teamName,
        color: entry.teamColor,
      });
    }
    teamsByAward.set(entry.awardId, teams);
  }

  return awards.map((award) => ({
    id: award.id,
    eventId: award.eventId,
    name: award.name,
    description: award.description,
    points: award.points,
    createdByUserId: award.createdByUserId,
    createdAt: award.createdAt,
    updatedAt: award.updatedAt,
    createdBy: {
      id: award.createdByUserId,
      name: award.creatorName,
      username: award.creatorUsername,
      image: award.creatorImage,
    },
    recipientTeams: teamsByAward.get(award.id) ?? [],
  }));
}

export async function updateDiscretionaryAward(
  awardId: string,
  data: Partial<
    Pick<EventDiscretionaryAward, "name" | "description" | "points">
  >,
  dbOrTx: DBOrTx = db,
): Promise<EventDiscretionaryAward> {
  const result = await dbOrTx
    .update(eventDiscretionaryAward)
    .set(data)
    .where(eq(eventDiscretionaryAward.id, awardId))
    .returning();
  return result[0];
}

export async function deleteDiscretionaryAward(
  awardId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .delete(eventDiscretionaryAward)
    .where(eq(eventDiscretionaryAward.id, awardId));
}

export type EnrichedPointEntry = {
  id: string;
  eventId: string;
  category: string;
  outcome: string;
  points: number;
  createdAt: Date;
  eventTeamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  eventMatchId: string | null;
  eventHighScoreSessionId: string | null;
  eventTournamentId: string | null;
  eventDiscretionaryAwardId: string | null;
  participants: Array<{
    userId: string | null;
    userName: string | null;
    userUsername: string | null;
    userImage: string | null;
    eventPlaceholderParticipantId: string | null;
    placeholderDisplayName: string | null;
  }>;
};

export async function createEventPointEntryParticipants(
  data: Omit<NewEventPointEntryParticipant, "id" | "createdAt">[],
  dbOrTx: DBOrTx = db,
): Promise<void> {
  if (data.length === 0) return;
  await dbOrTx.insert(eventPointEntryParticipant).values(data);
}

export async function getEnrichedEventPointEntries(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EnrichedPointEntry[]> {
  const entries = await dbOrTx
    .select({
      id: eventPointEntry.id,
      eventId: eventPointEntry.eventId,
      category: eventPointEntry.category,
      outcome: eventPointEntry.outcome,
      points: eventPointEntry.points,
      createdAt: eventPointEntry.createdAt,
      eventTeamId: eventPointEntry.eventTeamId,
      teamName: eventTeam.name,
      teamColor: eventTeam.color,
      eventMatchId: eventPointEntry.eventMatchId,
      eventHighScoreSessionId: eventPointEntry.eventHighScoreSessionId,
      eventTournamentId: eventPointEntry.eventTournamentId,
      eventDiscretionaryAwardId: eventPointEntry.eventDiscretionaryAwardId,
    })
    .from(eventPointEntry)
    .leftJoin(eventTeam, eq(eventPointEntry.eventTeamId, eventTeam.id))
    .where(eq(eventPointEntry.eventId, eventId))
    .orderBy(eventPointEntry.createdAt);

  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id);
  const participants = await dbOrTx
    .select({
      eventPointEntryId: eventPointEntryParticipant.eventPointEntryId,
      userId: eventPointEntryParticipant.userId,
      userName: user.name,
      userUsername: user.username,
      userImage: user.image,
      eventPlaceholderParticipantId:
        eventPointEntryParticipant.eventPlaceholderParticipantId,
      placeholderDisplayName: eventPlaceholderParticipant.displayName,
    })
    .from(eventPointEntryParticipant)
    .leftJoin(user, eq(eventPointEntryParticipant.userId, user.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventPointEntryParticipant.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(inArray(eventPointEntryParticipant.eventPointEntryId, entryIds));

  const participantsByEntry = new Map<
    string,
    EnrichedPointEntry["participants"]
  >();
  for (const p of participants) {
    const list = participantsByEntry.get(p.eventPointEntryId) ?? [];
    list.push({
      userId: p.userId,
      userName: p.userName,
      userUsername: p.userUsername,
      userImage: p.userImage,
      eventPlaceholderParticipantId: p.eventPlaceholderParticipantId,
      placeholderDisplayName: p.placeholderDisplayName,
    });
    participantsByEntry.set(p.eventPointEntryId, list);
  }

  return entries.map((e) => ({
    ...e,
    participants: participantsByEntry.get(e.id) ?? [],
  }));
}

export async function deleteEventPointEntriesForDiscretionaryAward(
  awardId: string,
  dbOrTx: DBOrTx = db,
): Promise<void> {
  await dbOrTx
    .delete(eventPointEntry)
    .where(eq(eventPointEntry.eventDiscretionaryAwardId, awardId));
}
