import { and, eq, isNull } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import { LimitOverride, limitOverride, limitType } from "./schema";

export type LimitTypeValue = (typeof limitType.enumValues)[number];

export async function getLimitOverrideForUser(
  userId: string,
  type: LimitTypeValue,
  dbOrTx: DBOrTx = db,
): Promise<LimitOverride | undefined> {
  const result = await dbOrTx
    .select()
    .from(limitOverride)
    .where(
      and(
        eq(limitOverride.userId, userId),
        eq(limitOverride.limitType, type),
        isNull(limitOverride.leagueId),
      ),
    )
    .limit(1);
  return result[0];
}

export async function getLimitOverrideForLeague(
  leagueId: string,
  type: LimitTypeValue,
  dbOrTx: DBOrTx = db,
): Promise<LimitOverride | undefined> {
  const result = await dbOrTx
    .select()
    .from(limitOverride)
    .where(
      and(
        eq(limitOverride.leagueId, leagueId),
        eq(limitOverride.limitType, type),
        isNull(limitOverride.userId),
      ),
    )
    .limit(1);
  return result[0];
}
