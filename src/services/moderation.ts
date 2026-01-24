import { withTransaction } from "@/db";
import {
  LeagueMemberWithUser,
  getSuspendedMembers as dbGetSuspendedMembers,
  deleteLeagueMember,
  getLeagueMember,
  isMemberSuspended,
  suspendMember,
  unsuspendMember,
} from "@/db/league-members";
import {
  ModerationHistoryItem,
  createModerationAction,
  createStandaloneModerationAction,
  acknowledgeModerationAction as dbAcknowledgeModerationAction,
  getModerationHistoryByUser,
  getWarningsByUser,
} from "@/db/moderation-actions";
import {
  ReportWithUsers,
  createReport as dbCreateReport,
  getPendingReportCount as dbGetPendingReportCount,
  getPendingReportsByLeague,
  getReportWithUsersById,
  getReportsByReporter,
  hasExistingPendingReport,
  updateReportStatus,
} from "@/db/reports";
import { ModerationActionType } from "@/lib/constants";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import { canActOnRole } from "@/lib/roles";
import {
  createReportSchema,
  takeModerationActionSchema,
} from "@/validators/moderation";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createReport(
  reporterId: string,
  input: unknown,
): Promise<ServiceResult<{ created: boolean }>> {
  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { reportedUserId, leagueId, reason, description, evidence } =
    parsed.data;

  if (reporterId === reportedUserId) {
    return { error: "You cannot report yourself" };
  }

  const reporterMembership = await getLeagueMember(reporterId, leagueId);
  if (!reporterMembership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(reporterMembership.role, LeagueAction.REPORT_MEMBER)) {
    return { error: "You don't have permission to report members" };
  }

  const isSuspended = await isMemberSuspended(reporterId, leagueId);
  if (isSuspended) {
    return { error: "You cannot report members while suspended" };
  }

  const reportedMembership = await getLeagueMember(reportedUserId, leagueId);
  if (!reportedMembership) {
    return {
      error: "The user you are trying to report is not a league member",
    };
  }

  const hasPendingReport = await hasExistingPendingReport(
    reporterId,
    reportedUserId,
    leagueId,
  );
  if (hasPendingReport) {
    return {
      error: "You already have a pending report against this member",
    };
  }

  await dbCreateReport({
    reporterId,
    reportedUserId,
    leagueId,
    reason,
    description,
    evidence: evidence ?? null,
  });

  return { data: { created: true } };
}

export async function getPendingReports(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<ReportWithUsers[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_REPORTS)) {
    return { error: "You don't have permission to view reports" };
  }

  const reports = await getPendingReportsByLeague(leagueId);
  return { data: reports };
}

export async function getPendingReportCount(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<number>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_REPORTS)) {
    return { data: 0 };
  }

  const count = await dbGetPendingReportCount(leagueId);
  return { data: count };
}

export type ReportDetail = {
  report: ReportWithUsers;
  targetHistory: ModerationHistoryItem[];
};

export async function getReportDetail(
  userId: string,
  reportId: string,
): Promise<ServiceResult<ReportDetail>> {
  const report = await getReportWithUsersById(reportId);
  if (!report) {
    return { error: "Report not found" };
  }

  const membership = await getLeagueMember(userId, report.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_REPORTS)) {
    return { error: "You don't have permission to view reports" };
  }

  const targetHistory = await getModerationHistoryByUser(
    report.reportedUserId,
    report.leagueId,
  );

  return {
    data: {
      report,
      targetHistory,
    },
  };
}

export async function takeModerationAction(
  moderatorId: string,
  input: unknown,
): Promise<ServiceResult<{ actionTaken: boolean }>> {
  const parsed = takeModerationActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { reportId, action, reason, suspensionDays } = parsed.data;

  const report = await getReportWithUsersById(reportId);
  if (!report) {
    return { error: "Report not found" };
  }

  if (report.status === "resolved") {
    return { error: "This report has already been resolved" };
  }

  const moderatorMembership = await getLeagueMember(
    moderatorId,
    report.leagueId,
  );
  if (!moderatorMembership) {
    return { error: "You are not a member of this league" };
  }

  if (
    !canPerformAction(moderatorMembership.role, LeagueAction.MODERATE_MEMBERS)
  ) {
    return { error: "You don't have permission to moderate members" };
  }

  if (report.reporterId === moderatorId) {
    return { error: "You cannot moderate a report you submitted" };
  }

  const targetMembership = await getLeagueMember(
    report.reportedUserId,
    report.leagueId,
  );

  if (
    action !== ModerationActionType.DISMISSED &&
    targetMembership &&
    !canActOnRole(moderatorMembership.role, targetMembership.role)
  ) {
    return {
      error:
        "You cannot take action against someone with an equal or higher role",
    };
  }

  if (
    (action === ModerationActionType.WARNED ||
      action === ModerationActionType.SUSPENDED ||
      action === ModerationActionType.REMOVED) &&
    !targetMembership
  ) {
    return {
      error: "The reported user is no longer a member of this league",
    };
  }

  let suspendedUntil: Date | undefined;
  if (action === ModerationActionType.SUSPENDED && suspensionDays) {
    suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + suspensionDays);
  }

  await withTransaction(async (tx) => {
    await createModerationAction(
      {
        reportId,
        moderatorId,
        targetUserId: report.reportedUserId,
        leagueId: report.leagueId,
        action,
        reason,
        suspendedUntil: suspendedUntil ?? null,
      },
      tx,
    );

    await updateReportStatus(reportId, "resolved", tx);

    if (action === ModerationActionType.SUSPENDED && suspendedUntil) {
      await suspendMember(
        report.reportedUserId,
        report.leagueId,
        suspendedUntil,
        tx,
      );
    }

    if (action === ModerationActionType.REMOVED) {
      await deleteLeagueMember(report.reportedUserId, report.leagueId, tx);
    }
  });

  return { data: { actionTaken: true } };
}

export type OwnModerationHistory = {
  warnings: ModerationHistoryItem[];
  suspendedUntil: Date | null;
};

export async function getOwnModerationHistory(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<OwnModerationHistory>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const warnings = await getWarningsByUser(userId, leagueId);
  const suspendedUntil = membership.suspendedUntil;

  return {
    data: {
      warnings,
      suspendedUntil:
        suspendedUntil && suspendedUntil > new Date() ? suspendedUntil : null,
    },
  };
}

export async function getMemberModerationHistory(
  requesterId: string,
  targetUserId: string,
  leagueId: string,
): Promise<ServiceResult<ModerationHistoryItem[]>> {
  const membership = await getLeagueMember(requesterId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_REPORTS)) {
    return { error: "You don't have permission to view moderation history" };
  }

  const history = await getModerationHistoryByUser(targetUserId, leagueId);
  return { data: history };
}

export type SubmittedReport = ReportWithUsers;

export async function getOwnSubmittedReports(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<SubmittedReport[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const reports = await getReportsByReporter(userId, leagueId);
  return { data: reports };
}

export async function getOwnReportCount(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<number>> {
  const reports = await getReportsByReporter(userId, leagueId);
  return { data: reports.length };
}

export async function getOwnWarningCount(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<number>> {
  const warnings = await getWarningsByUser(userId, leagueId);
  return { data: warnings.length };
}

export async function acknowledgeModerationAction(
  userId: string,
  actionId: string,
): Promise<ServiceResult<{ acknowledged: boolean }>> {
  const acknowledged = await dbAcknowledgeModerationAction(actionId, userId);
  if (!acknowledged) {
    return { error: "Moderation action not found or already acknowledged" };
  }
  return { data: { acknowledged: true } };
}

export async function getSuspendedMembers(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<LeagueMemberWithUser[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.MODERATE_MEMBERS)) {
    return { error: "You don't have permission to view suspended members" };
  }

  const suspendedMembers = await dbGetSuspendedMembers(leagueId);
  return { data: suspendedMembers };
}

export async function liftSuspension(
  moderatorId: string,
  targetUserId: string,
  leagueId: string,
): Promise<ServiceResult<{ lifted: boolean }>> {
  const moderatorMembership = await getLeagueMember(moderatorId, leagueId);
  if (!moderatorMembership) {
    return { error: "You are not a member of this league" };
  }

  if (
    !canPerformAction(moderatorMembership.role, LeagueAction.MODERATE_MEMBERS)
  ) {
    return { error: "You don't have permission to lift suspensions" };
  }

  const targetMembership = await getLeagueMember(targetUserId, leagueId);
  if (!targetMembership) {
    return { error: "The member is no longer part of this league" };
  }

  if (
    !targetMembership.suspendedUntil ||
    targetMembership.suspendedUntil <= new Date()
  ) {
    return { error: "This member is not currently suspended" };
  }

  if (!canActOnRole(moderatorMembership.role, targetMembership.role)) {
    return {
      error:
        "You cannot lift the suspension of someone with an equal or higher role",
    };
  }

  await withTransaction(async (tx) => {
    await createStandaloneModerationAction(
      {
        moderatorId,
        targetUserId,
        leagueId,
        action: ModerationActionType.SUSPENSION_LIFTED,
        reason: "Suspension lifted early by moderator",
        suspendedUntil: null,
        acknowledgedAt: null,
      },
      tx,
    );

    await unsuspendMember(targetUserId, leagueId, tx);
  });

  return { data: { lifted: true } };
}
