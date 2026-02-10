import { InvitationStatus } from "@/lib/shared/constants";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { DBOrTx, db } from "./index";
import {
  Event,
  EventInvitation,
  EventPlaceholderParticipant,
  NewEventInvitation,
  User,
  event,
  eventInvitation,
  eventInvitationColumns,
  eventPlaceholderParticipant,
  user,
} from "./schema";

const inviteeUser = alias(user, "invitee");

export type EventInvitationWithDetails = EventInvitation & {
  event: Pick<Event, "id" | "name" | "description" | "logo">;
  inviter: Pick<User, "id" | "name" | "username">;
  invitee: Pick<User, "id" | "name" | "username"> | null;
  placeholder: Pick<EventPlaceholderParticipant, "id" | "displayName"> | null;
};

export async function createEventInvitation(
  data: Omit<NewEventInvitation, "id" | "createdAt" | "useCount">,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation> {
  const result = await dbOrTx.insert(eventInvitation).values(data).returning();
  return result[0];
}

export async function getEventInvitationById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventInvitation)
    .where(eq(eventInvitation.id, id))
    .limit(1);
  return result[0];
}

export async function getEventInvitationByToken(
  token: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation | undefined> {
  const result = await dbOrTx
    .select()
    .from(eventInvitation)
    .where(eq(eventInvitation.token, token))
    .limit(1);
  return result[0];
}

export async function getEventInvitationByTokenWithDetails(
  token: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitationWithDetails | undefined> {
  const results = await dbOrTx
    .select({
      ...eventInvitationColumns,
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        logo: event.logo,
      },
      inviter: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      invitee: {
        id: inviteeUser.id,
        name: inviteeUser.name,
        username: inviteeUser.username,
      },
      placeholder: {
        id: eventPlaceholderParticipant.id,
        displayName: eventPlaceholderParticipant.displayName,
      },
    })
    .from(eventInvitation)
    .innerJoin(event, eq(eventInvitation.eventId, event.id))
    .innerJoin(user, eq(eventInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(eventInvitation.inviteeUserId, inviteeUser.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventInvitation.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(eq(eventInvitation.token, token))
    .limit(1);

  return results[0];
}

export async function getPendingEventInvitationsForUser(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitationWithDetails[]> {
  const now = new Date();

  const results = await dbOrTx
    .select({
      ...eventInvitationColumns,
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        logo: event.logo,
      },
      inviter: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      invitee: {
        id: inviteeUser.id,
        name: inviteeUser.name,
        username: inviteeUser.username,
      },
      placeholder: {
        id: eventPlaceholderParticipant.id,
        displayName: eventPlaceholderParticipant.displayName,
      },
    })
    .from(eventInvitation)
    .innerJoin(event, eq(eventInvitation.eventId, event.id))
    .innerJoin(user, eq(eventInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(eventInvitation.inviteeUserId, inviteeUser.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventInvitation.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(
      and(
        eq(eventInvitation.inviteeUserId, userId),
        eq(eventInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(eventInvitation.expiresAt),
          gt(eventInvitation.expiresAt, now),
        ),
      ),
    )
    .orderBy(eventInvitation.createdAt);

  return results;
}

export async function getPendingEventInvitationsForEvent(
  eventId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitationWithDetails[]> {
  const now = new Date();

  const results = await dbOrTx
    .select({
      ...eventInvitationColumns,
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        logo: event.logo,
      },
      inviter: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      invitee: {
        id: inviteeUser.id,
        name: inviteeUser.name,
        username: inviteeUser.username,
      },
      placeholder: {
        id: eventPlaceholderParticipant.id,
        displayName: eventPlaceholderParticipant.displayName,
      },
    })
    .from(eventInvitation)
    .innerJoin(event, eq(eventInvitation.eventId, event.id))
    .innerJoin(user, eq(eventInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(eventInvitation.inviteeUserId, inviteeUser.id))
    .leftJoin(
      eventPlaceholderParticipant,
      eq(
        eventInvitation.eventPlaceholderParticipantId,
        eventPlaceholderParticipant.id,
      ),
    )
    .where(
      and(
        eq(eventInvitation.eventId, eventId),
        eq(eventInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(eventInvitation.expiresAt),
          gt(eventInvitation.expiresAt, now),
        ),
      ),
    )
    .orderBy(eventInvitation.createdAt);

  return results;
}

export async function updateEventInvitationStatus(
  id: string,
  status: EventInvitation["status"],
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation | undefined> {
  const result = await dbOrTx
    .update(eventInvitation)
    .set({ status })
    .where(eq(eventInvitation.id, id))
    .returning();
  return result[0];
}

export async function incrementEventInvitationUseCount(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation | undefined> {
  const invitation = await getEventInvitationById(id, dbOrTx);
  if (!invitation) return undefined;

  const result = await dbOrTx
    .update(eventInvitation)
    .set({ useCount: invitation.useCount + 1 })
    .where(eq(eventInvitation.id, id))
    .returning();
  return result[0];
}

export async function deleteEventInvitation(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(eventInvitation)
    .where(eq(eventInvitation.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function checkExistingPendingEventInvitation(
  eventId: string,
  inviteeUserId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation | undefined> {
  const now = new Date();

  const result = await dbOrTx
    .select()
    .from(eventInvitation)
    .where(
      and(
        eq(eventInvitation.eventId, eventId),
        eq(eventInvitation.inviteeUserId, inviteeUserId),
        eq(eventInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(eventInvitation.expiresAt),
          gt(eventInvitation.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  return result[0];
}

export async function checkExistingPendingEventInvitationForPlaceholder(
  placeholderId: string,
  dbOrTx: DBOrTx = db,
): Promise<EventInvitation | undefined> {
  const now = new Date();

  const result = await dbOrTx
    .select()
    .from(eventInvitation)
    .where(
      and(
        eq(eventInvitation.eventPlaceholderParticipantId, placeholderId),
        eq(eventInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(eventInvitation.expiresAt),
          gt(eventInvitation.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  return result[0];
}

export async function acceptAllPendingEventInvitationsForEvent(
  eventId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .update(eventInvitation)
    .set({ status: InvitationStatus.ACCEPTED })
    .where(
      and(
        eq(eventInvitation.eventId, eventId),
        eq(eventInvitation.inviteeUserId, userId),
        eq(eventInvitation.status, InvitationStatus.PENDING),
      ),
    );
  return result.rowCount ?? 0;
}
