import { ModerationActionType } from "@/lib/constants";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  League,
  ModerationAction,
  NewModerationAction,
  User,
  league,
  moderationAction,
  moderationActionColumns,
  user,
} from "./schema";

export async function createModerationAction(
  data: Omit<NewModerationAction, "id" | "createdAt">,
  dbOrTx: DBOrTx = db,
): Promise<ModerationAction> {
  const result = await dbOrTx.insert(moderationAction).values(data).returning();
  return result[0];
}

export async function createStandaloneModerationAction(
  data: Omit<NewModerationAction, "id" | "createdAt" | "reportId">,
  dbOrTx: DBOrTx = db,
): Promise<ModerationAction> {
  const result = await dbOrTx
    .insert(moderationAction)
    .values({
      ...data,
      reportId: null,
    })
    .returning();
  return result[0];
}

export type ModerationActionWithModerator = ModerationAction & {
  moderator: Pick<User, "id" | "name" | "username" | "image">;
};

export async function getModerationActionsByReport(
  reportId: string,
  dbOrTx: DBOrTx = db,
): Promise<ModerationActionWithModerator[]> {
  const results = await dbOrTx
    .select({
      ...moderationActionColumns,
      moderator: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(moderationAction)
    .innerJoin(user, eq(moderationAction.moderatorId, user.id))
    .where(eq(moderationAction.reportId, reportId))
    .orderBy(moderationAction.createdAt);

  return results;
}

export type ModerationHistoryItem = ModerationAction & {
  moderator: Pick<User, "id" | "name" | "username" | "image">;
};

export async function getModerationHistoryByUser(
  targetUserId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<ModerationHistoryItem[]> {
  const results = await dbOrTx
    .select({
      ...moderationActionColumns,
      moderator: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(moderationAction)
    .innerJoin(user, eq(moderationAction.moderatorId, user.id))
    .where(
      and(
        eq(moderationAction.targetUserId, targetUserId),
        eq(moderationAction.leagueId, leagueId),
      ),
    )
    .orderBy(moderationAction.createdAt);

  return results;
}

export async function getWarningsByUser(
  targetUserId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<ModerationHistoryItem[]> {
  const results = await dbOrTx
    .select({
      ...moderationActionColumns,
      moderator: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(moderationAction)
    .innerJoin(user, eq(moderationAction.moderatorId, user.id))
    .where(
      and(
        eq(moderationAction.targetUserId, targetUserId),
        eq(moderationAction.leagueId, leagueId),
        eq(moderationAction.action, ModerationActionType.WARNED),
      ),
    )
    .orderBy(moderationAction.createdAt);

  return results;
}

export type UnacknowledgedModerationAction = ModerationAction & {
  league: Pick<League, "id" | "name" | "logo">;
};

export async function getUnacknowledgedModerationActions(
  targetUserId: string,
  dbOrTx: DBOrTx = db,
): Promise<UnacknowledgedModerationAction[]> {
  const results = await dbOrTx
    .select({
      ...moderationActionColumns,
      league: {
        id: league.id,
        name: league.name,
        logo: league.logo,
      },
    })
    .from(moderationAction)
    .innerJoin(league, eq(moderationAction.leagueId, league.id))
    .where(
      and(
        eq(moderationAction.targetUserId, targetUserId),
        isNull(moderationAction.acknowledgedAt),
        inArray(moderationAction.action, [
          ModerationActionType.WARNED,
          ModerationActionType.SUSPENDED,
          ModerationActionType.REMOVED,
          ModerationActionType.SUSPENSION_LIFTED,
        ]),
      ),
    )
    .orderBy(moderationAction.createdAt);

  return results;
}

export async function acknowledgeModerationAction(
  actionId: string,
  targetUserId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .update(moderationAction)
    .set({ acknowledgedAt: new Date() })
    .where(
      and(
        eq(moderationAction.id, actionId),
        eq(moderationAction.targetUserId, targetUserId),
      ),
    )
    .returning();

  return result.length > 0;
}
