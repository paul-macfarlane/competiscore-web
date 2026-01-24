import { InvitationStatus } from "@/lib/shared/constants";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { DBOrTx, db } from "./index";
import {
  League,
  LeagueInvitation,
  NewLeagueInvitation,
  User,
  league,
  leagueInvitation,
  leagueInvitationColumns,
  user,
} from "./schema";

const inviteeUser = alias(user, "invitee");

export type InvitationWithDetails = LeagueInvitation & {
  league: Pick<League, "id" | "name" | "description" | "logo">;
  inviter: Pick<User, "id" | "name" | "username">;
  invitee: Pick<User, "id" | "name" | "username"> | null;
};

export async function createInvitation(
  data: Omit<NewLeagueInvitation, "id" | "createdAt" | "useCount">,
  dbOrTx: DBOrTx = db,
): Promise<LeagueInvitation> {
  const result = await dbOrTx.insert(leagueInvitation).values(data).returning();
  return result[0];
}

export async function getInvitationById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueInvitation | undefined> {
  const result = await dbOrTx
    .select()
    .from(leagueInvitation)
    .where(eq(leagueInvitation.id, id))
    .limit(1);
  return result[0];
}

export async function getInvitationByIdWithDetails(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<InvitationWithDetails | undefined> {
  const results = await dbOrTx
    .select({
      ...leagueInvitationColumns,
      league: {
        id: league.id,
        name: league.name,
        description: league.description,
        logo: league.logo,
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
    })
    .from(leagueInvitation)
    .innerJoin(league, eq(leagueInvitation.leagueId, league.id))
    .innerJoin(user, eq(leagueInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(leagueInvitation.inviteeUserId, inviteeUser.id))
    .where(eq(leagueInvitation.id, id))
    .limit(1);

  return results[0];
}

export async function getInvitationByToken(
  token: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueInvitation | undefined> {
  const result = await dbOrTx
    .select()
    .from(leagueInvitation)
    .where(eq(leagueInvitation.token, token))
    .limit(1);
  return result[0];
}

export async function getInvitationByTokenWithDetails(
  token: string,
  dbOrTx: DBOrTx = db,
): Promise<InvitationWithDetails | undefined> {
  const results = await dbOrTx
    .select({
      ...leagueInvitationColumns,
      league: {
        id: league.id,
        name: league.name,
        description: league.description,
        logo: league.logo,
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
    })
    .from(leagueInvitation)
    .innerJoin(league, eq(leagueInvitation.leagueId, league.id))
    .innerJoin(user, eq(leagueInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(leagueInvitation.inviteeUserId, inviteeUser.id))
    .where(eq(leagueInvitation.token, token))
    .limit(1);

  return results[0];
}

export async function getPendingInvitationsForUser(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<InvitationWithDetails[]> {
  const now = new Date();

  const results = await dbOrTx
    .select({
      ...leagueInvitationColumns,
      league: {
        id: league.id,
        name: league.name,
        description: league.description,
        logo: league.logo,
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
    })
    .from(leagueInvitation)
    .innerJoin(league, eq(leagueInvitation.leagueId, league.id))
    .innerJoin(user, eq(leagueInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(leagueInvitation.inviteeUserId, inviteeUser.id))
    .where(
      and(
        eq(leagueInvitation.inviteeUserId, userId),
        eq(leagueInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(leagueInvitation.expiresAt),
          gt(leagueInvitation.expiresAt, now),
        ),
      ),
    )
    .orderBy(leagueInvitation.createdAt);

  return results;
}

export async function getPendingInvitationsForLeague(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<InvitationWithDetails[]> {
  const now = new Date();

  const results = await dbOrTx
    .select({
      ...leagueInvitationColumns,
      league: {
        id: league.id,
        name: league.name,
        description: league.description,
        logo: league.logo,
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
    })
    .from(leagueInvitation)
    .innerJoin(league, eq(leagueInvitation.leagueId, league.id))
    .innerJoin(user, eq(leagueInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(leagueInvitation.inviteeUserId, inviteeUser.id))
    .where(
      and(
        eq(leagueInvitation.leagueId, leagueId),
        eq(leagueInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(leagueInvitation.expiresAt),
          gt(leagueInvitation.expiresAt, now),
        ),
      ),
    )
    .orderBy(leagueInvitation.createdAt);

  return results;
}

export async function updateInvitationStatus(
  id: string,
  status: LeagueInvitation["status"],
  dbOrTx: DBOrTx = db,
): Promise<LeagueInvitation | undefined> {
  const result = await dbOrTx
    .update(leagueInvitation)
    .set({ status })
    .where(eq(leagueInvitation.id, id))
    .returning();
  return result[0];
}

export async function incrementInvitationUseCount(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueInvitation | undefined> {
  const invitation = await getInvitationById(id, dbOrTx);
  if (!invitation) return undefined;

  const result = await dbOrTx
    .update(leagueInvitation)
    .set({ useCount: invitation.useCount + 1 })
    .where(eq(leagueInvitation.id, id))
    .returning();
  return result[0];
}

export async function deleteInvitation(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(leagueInvitation)
    .where(eq(leagueInvitation.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function checkExistingPendingInvitation(
  leagueId: string,
  inviteeUserId: string,
  dbOrTx: DBOrTx = db,
): Promise<LeagueInvitation | undefined> {
  const now = new Date();

  const result = await dbOrTx
    .select()
    .from(leagueInvitation)
    .where(
      and(
        eq(leagueInvitation.leagueId, leagueId),
        eq(leagueInvitation.inviteeUserId, inviteeUserId),
        eq(leagueInvitation.status, InvitationStatus.PENDING),
        or(
          isNull(leagueInvitation.expiresAt),
          gt(leagueInvitation.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  return result[0];
}

export async function acceptAllPendingInvitationsForLeague(
  leagueId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .update(leagueInvitation)
    .set({ status: InvitationStatus.ACCEPTED })
    .where(
      and(
        eq(leagueInvitation.leagueId, leagueId),
        eq(leagueInvitation.inviteeUserId, userId),
        eq(leagueInvitation.status, InvitationStatus.PENDING),
      ),
    );
  return result.rowCount ?? 0;
}
