import { InvitationStatus } from "@/lib/shared/constants";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { DBOrTx, db } from "./index";
import {
  League,
  NewTeamInvitation,
  Team,
  TeamInvitation,
  User,
  league,
  team,
  teamInvitation,
  teamInvitationColumns,
  user,
} from "./schema";

const inviteeUser = alias(user, "invitee");

export type TeamInvitationWithDetails = TeamInvitation & {
  team: Pick<Team, "id" | "name" | "logo"> & {
    league: Pick<League, "id" | "name" | "logo">;
  };
  inviter: Pick<User, "id" | "name" | "username">;
  invitee: Pick<User, "id" | "name" | "username"> | null;
};

type FlatQueryResult = TeamInvitation & {
  teamId_: string;
  teamName: string;
  teamLogo: string | null;
  leagueId_: string;
  leagueName: string;
  leagueLogo: string | null;
  inviterId_: string;
  inviterName: string;
  inviterUsername: string;
  inviteeId_: string | null;
  inviteeName: string | null;
  inviteeUsername: string | null;
};

function mapToDetails(row: FlatQueryResult): TeamInvitationWithDetails {
  return {
    ...row,
    team: {
      id: row.teamId_,
      name: row.teamName,
      logo: row.teamLogo,
      league: {
        id: row.leagueId_,
        name: row.leagueName,
        logo: row.leagueLogo,
      },
    },
    inviter: {
      id: row.inviterId_,
      name: row.inviterName,
      username: row.inviterUsername,
    },
    invitee: row.inviteeId_
      ? {
          id: row.inviteeId_,
          name: row.inviteeName!,
          username: row.inviteeUsername!,
        }
      : null,
  };
}

const detailsSelect = {
  ...teamInvitationColumns,
  teamId_: team.id,
  teamName: team.name,
  teamLogo: team.logo,
  leagueId_: league.id,
  leagueName: league.name,
  leagueLogo: league.logo,
  inviterId_: user.id,
  inviterName: user.name,
  inviterUsername: user.username,
  inviteeId_: inviteeUser.id,
  inviteeName: inviteeUser.name,
  inviteeUsername: inviteeUser.username,
};

export async function createTeamInvitation(
  data: Omit<NewTeamInvitation, "id" | "createdAt" | "useCount">,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitation> {
  const result = await dbOrTx.insert(teamInvitation).values(data).returning();
  return result[0];
}

export async function getTeamInvitationById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitation | undefined> {
  const result = await dbOrTx
    .select()
    .from(teamInvitation)
    .where(eq(teamInvitation.id, id))
    .limit(1);
  return result[0];
}

export async function getTeamInvitationByIdWithDetails(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitationWithDetails | undefined> {
  const results = await dbOrTx
    .select(detailsSelect)
    .from(teamInvitation)
    .innerJoin(team, eq(teamInvitation.teamId, team.id))
    .innerJoin(league, eq(team.leagueId, league.id))
    .innerJoin(user, eq(teamInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(teamInvitation.inviteeUserId, inviteeUser.id))
    .where(eq(teamInvitation.id, id))
    .limit(1);

  return results[0] ? mapToDetails(results[0]) : undefined;
}

export async function getTeamInvitationByToken(
  token: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitation | undefined> {
  const result = await dbOrTx
    .select()
    .from(teamInvitation)
    .where(eq(teamInvitation.token, token))
    .limit(1);
  return result[0];
}

export async function getTeamInvitationByTokenWithDetails(
  token: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitationWithDetails | undefined> {
  const results = await dbOrTx
    .select(detailsSelect)
    .from(teamInvitation)
    .innerJoin(team, eq(teamInvitation.teamId, team.id))
    .innerJoin(league, eq(team.leagueId, league.id))
    .innerJoin(user, eq(teamInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(teamInvitation.inviteeUserId, inviteeUser.id))
    .where(eq(teamInvitation.token, token))
    .limit(1);

  return results[0] ? mapToDetails(results[0]) : undefined;
}

export async function getPendingTeamInvitationsForUser(
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitationWithDetails[]> {
  const now = new Date();

  const results = await dbOrTx
    .select(detailsSelect)
    .from(teamInvitation)
    .innerJoin(team, eq(teamInvitation.teamId, team.id))
    .innerJoin(league, eq(team.leagueId, league.id))
    .innerJoin(user, eq(teamInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(teamInvitation.inviteeUserId, inviteeUser.id))
    .where(
      and(
        eq(teamInvitation.inviteeUserId, userId),
        eq(teamInvitation.status, InvitationStatus.PENDING),
        or(isNull(teamInvitation.expiresAt), gt(teamInvitation.expiresAt, now)),
      ),
    )
    .orderBy(teamInvitation.createdAt);

  return results.map(mapToDetails);
}

export async function getPendingTeamInvitationsForTeam(
  teamId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitationWithDetails[]> {
  const now = new Date();

  const results = await dbOrTx
    .select(detailsSelect)
    .from(teamInvitation)
    .innerJoin(team, eq(teamInvitation.teamId, team.id))
    .innerJoin(league, eq(team.leagueId, league.id))
    .innerJoin(user, eq(teamInvitation.inviterId, user.id))
    .leftJoin(inviteeUser, eq(teamInvitation.inviteeUserId, inviteeUser.id))
    .where(
      and(
        eq(teamInvitation.teamId, teamId),
        eq(teamInvitation.status, InvitationStatus.PENDING),
        or(isNull(teamInvitation.expiresAt), gt(teamInvitation.expiresAt, now)),
      ),
    )
    .orderBy(teamInvitation.createdAt);

  return results.map(mapToDetails);
}

export async function updateTeamInvitationStatus(
  id: string,
  status: TeamInvitation["status"],
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitation | undefined> {
  const result = await dbOrTx
    .update(teamInvitation)
    .set({ status })
    .where(eq(teamInvitation.id, id))
    .returning();
  return result[0];
}

export async function incrementTeamInvitationUseCount(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitation | undefined> {
  const invitation = await getTeamInvitationById(id, dbOrTx);
  if (!invitation) return undefined;

  const result = await dbOrTx
    .update(teamInvitation)
    .set({ useCount: invitation.useCount + 1 })
    .where(eq(teamInvitation.id, id))
    .returning();
  return result[0];
}

export async function deleteTeamInvitation(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(teamInvitation)
    .where(eq(teamInvitation.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

export async function checkExistingPendingTeamInvitation(
  teamId: string,
  inviteeUserId: string,
  dbOrTx: DBOrTx = db,
): Promise<TeamInvitation | undefined> {
  const now = new Date();

  const result = await dbOrTx
    .select()
    .from(teamInvitation)
    .where(
      and(
        eq(teamInvitation.teamId, teamId),
        eq(teamInvitation.inviteeUserId, inviteeUserId),
        eq(teamInvitation.status, InvitationStatus.PENDING),
        or(isNull(teamInvitation.expiresAt), gt(teamInvitation.expiresAt, now)),
      ),
    )
    .limit(1);

  return result[0];
}

export async function acceptAllPendingTeamInvitationsForTeam(
  teamId: string,
  userId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .update(teamInvitation)
    .set({ status: InvitationStatus.ACCEPTED })
    .where(
      and(
        eq(teamInvitation.teamId, teamId),
        eq(teamInvitation.inviteeUserId, userId),
        eq(teamInvitation.status, InvitationStatus.PENDING),
      ),
    );
  return result.rowCount ?? 0;
}
