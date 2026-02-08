import { and, count, eq } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import {
  ModerationAction,
  NewReport,
  Report,
  User,
  moderationAction,
  moderationActionColumns,
  report,
  reportColumns,
  user,
} from "./schema";

export async function createReport(
  data: Omit<NewReport, "id" | "createdAt" | "status">,
  dbOrTx: DBOrTx = db,
): Promise<Report> {
  const result = await dbOrTx.insert(report).values(data).returning();
  return result[0];
}

export async function getReportById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<Report | undefined> {
  const result = await dbOrTx
    .select()
    .from(report)
    .where(eq(report.id, id))
    .limit(1);
  return result[0];
}

export type ReportWithUsers = Report & {
  reporter: Pick<User, "id" | "name" | "username" | "image">;
  reportedUser: Pick<User, "id" | "name" | "username" | "image">;
};

export type ReportWithOutcome = ReportWithUsers & {
  moderationAction?: ModerationAction | null;
};

export async function getReportWithUsersById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<ReportWithUsers | undefined> {
  const result = await dbOrTx
    .select({
      ...reportColumns,
      reporter: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(report)
    .innerJoin(user, eq(report.reporterId, user.id))
    .where(eq(report.id, id))
    .limit(1);

  if (!result[0]) return undefined;

  const reportedUserResult = await dbOrTx
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, result[0].reportedUserId))
    .limit(1);

  if (!reportedUserResult[0]) return undefined;

  return {
    ...result[0],
    reportedUser: reportedUserResult[0],
  };
}

export async function getPendingReportsByLeague(
  leagueId: string,
  options?: { limit?: number; offset?: number },
  dbOrTx: DBOrTx = db,
): Promise<ReportWithUsers[]> {
  let query = dbOrTx
    .select({
      ...reportColumns,
      reporter: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
    })
    .from(report)
    .innerJoin(user, eq(report.reporterId, user.id))
    .where(and(eq(report.leagueId, leagueId), eq(report.status, "pending")))
    .orderBy(report.createdAt)
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  const results = await query;

  const reportsWithReportedUsers = await Promise.all(
    results.map(async (r) => {
      const reportedUserResult = await dbOrTx
        .select({
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, r.reportedUserId))
        .limit(1);

      return {
        ...r,
        reportedUser: reportedUserResult[0],
      };
    }),
  );

  return reportsWithReportedUsers;
}

export async function countPendingReportsByLeague(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(report)
    .where(and(eq(report.leagueId, leagueId), eq(report.status, "pending")));
  return result[0].count;
}

export async function getReportsByReportedUser(
  reportedUserId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<Report[]> {
  return dbOrTx
    .select()
    .from(report)
    .where(
      and(
        eq(report.reportedUserId, reportedUserId),
        eq(report.leagueId, leagueId),
      ),
    )
    .orderBy(report.createdAt);
}

export async function getReportsByReporter(
  reporterId: string,
  leagueId: string,
  options?: { limit?: number; offset?: number },
  dbOrTx: DBOrTx = db,
): Promise<ReportWithOutcome[]> {
  let query = dbOrTx
    .select({
      ...reportColumns,
      reporter: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      moderationAction: moderationActionColumns,
    })
    .from(report)
    .innerJoin(user, eq(report.reporterId, user.id))
    .leftJoin(moderationAction, eq(report.id, moderationAction.reportId))
    .where(
      and(eq(report.reporterId, reporterId), eq(report.leagueId, leagueId)),
    )
    .orderBy(report.createdAt)
    .$dynamic();

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  const results = await query;

  const reportsWithReportedUsers = await Promise.all(
    results.map(async (r) => {
      const reportedUserResult = await dbOrTx
        .select({
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, r.reportedUserId))
        .limit(1);

      return {
        ...r,
        reportedUser: reportedUserResult[0],
      };
    }),
  );

  return reportsWithReportedUsers;
}

export async function countReportsByReporter(
  reporterId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(report)
    .where(
      and(eq(report.reporterId, reporterId), eq(report.leagueId, leagueId)),
    );
  return result[0].count;
}

export async function updateReportStatus(
  id: string,
  status: Report["status"],
  dbOrTx: DBOrTx = db,
): Promise<Report | undefined> {
  const result = await dbOrTx
    .update(report)
    .set({ status })
    .where(eq(report.id, id))
    .returning();
  return result[0];
}

export async function getPendingReportCount(
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<number> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(report)
    .where(and(eq(report.leagueId, leagueId), eq(report.status, "pending")));
  return result[0]?.count ?? 0;
}

export async function hasExistingPendingReport(
  reporterId: string,
  reportedUserId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .select({ count: count() })
    .from(report)
    .where(
      and(
        eq(report.reporterId, reporterId),
        eq(report.reportedUserId, reportedUserId),
        eq(report.leagueId, leagueId),
        eq(report.status, "pending"),
      ),
    );
  return (result[0]?.count ?? 0) > 0;
}

export async function updateReport(
  reportId: string,
  data: {
    reason?: Report["reason"];
    description?: string;
    evidence?: string | null;
  },
  dbOrTx: DBOrTx = db,
): Promise<Report | undefined> {
  const result = await dbOrTx
    .update(report)
    .set(data)
    .where(eq(report.id, reportId))
    .returning();
  return result[0];
}

export async function deleteReport(
  reportId: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const result = await dbOrTx
    .delete(report)
    .where(eq(report.id, reportId))
    .returning();
  return result.length > 0;
}
