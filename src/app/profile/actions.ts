"use server";

import { User } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ServiceResult } from "@/services/shared";
import {
  checkUsernameAvailability as checkUsernameAvailabilityService,
  updateUserProfile as updateUserProfileService,
} from "@/services/users";
import { headers } from "next/headers";

export async function updateProfileAction(
  input: unknown,
): Promise<ServiceResult<User>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return updateUserProfileService(session.user.id, input);
}

export async function checkUsernameAction(
  username: unknown,
): Promise<ServiceResult<{ available: boolean }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return checkUsernameAvailabilityService(username, session.user.id);
}
