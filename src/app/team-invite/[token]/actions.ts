"use server";

import { auth } from "@/lib/server/auth";
import { joinTeamViaInviteLink } from "@/services/team-invitations";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function joinTeamViaInviteLinkAction(token: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await joinTeamViaInviteLink(token, session.user.id);
  if (result.data) {
    revalidatePath("/leagues");
    revalidatePath("/dashboard");
  }

  return result;
}
