"use server";

import { Match } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  acceptChallenge as acceptChallengeService,
  cancelChallenge as cancelChallengeService,
  declineChallenge as declineChallengeService,
} from "@/services/challenges";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function acceptChallengeAction(
  input: unknown,
): Promise<ServiceResult<Match>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return acceptChallengeService(session.user.id, input);
}

export async function declineChallengeAction(
  input: unknown,
): Promise<ServiceResult<Match>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return declineChallengeService(session.user.id, input);
}

export async function cancelChallengeAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return cancelChallengeService(session.user.id, input);
}
