import { and, count, eq } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import { NewReport, Report, User, report, reportColumns, user } from "./schema";

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
  dbOrTx: DBOrTx = db,
): Promise<ReportWithUsers[]> {
  const results = await dbOrTx
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
    .orderBy(report.createdAt);

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
  dbOrTx: DBOrTx = db,
): Promise<ReportWithUsers[]> {
  const results = await dbOrTx
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
    .where(
      and(eq(report.reporterId, reporterId), eq(report.leagueId, leagueId)),
    )
    .orderBy(report.createdAt);

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
