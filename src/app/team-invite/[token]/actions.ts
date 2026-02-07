"use server";

import { auth } from "@/lib/server/auth";
import { joinTeamViaInviteLink } from "@/services/team-invitations";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function joinTeamViaInviteLinkAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await joinTeamViaInviteLink(input, session.user.id);
  if (result.data) {
    revalidatePath("/leagues");
  }

  return result;
}
