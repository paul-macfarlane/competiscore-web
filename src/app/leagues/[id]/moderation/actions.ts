"use server";

import { auth } from "@/lib/auth";
import {
  getMemberModerationHistory,
  getPendingReports,
  getReportDetail,
  getSuspendedMembers,
  liftSuspension,
  takeModerationAction,
} from "@/services/moderation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getPendingReportsAction(leagueId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getPendingReports(session.user.id, leagueId);
}

export async function getReportDetailAction(reportId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getReportDetail(session.user.id, reportId);
}

export async function takeModerationActionAction(
  leagueId: string,
  input: unknown,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await takeModerationAction(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/moderation`);
    revalidatePath(`/leagues/${leagueId}/members`);
  }

  return result;
}

export async function getMemberHistoryAction(
  leagueId: string,
  targetUserId: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getMemberModerationHistory(session.user.id, targetUserId, leagueId);
}

export async function getSuspendedMembersAction(leagueId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getSuspendedMembers(session.user.id, leagueId);
}

export async function liftSuspensionAction(
  leagueId: string,
  targetUserId: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await liftSuspension(session.user.id, targetUserId, leagueId);
  if (result.data) {
    revalidatePath(`/leagues/${leagueId}/moderation`);
    revalidatePath(`/leagues/${leagueId}/members`);
  }

  return result;
}
