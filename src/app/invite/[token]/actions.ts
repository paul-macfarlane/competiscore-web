"use server";

import { auth } from "@/lib/server/auth";
import { joinViaInviteLink } from "@/services/invitations";
import { headers } from "next/headers";

export async function joinViaInviteLinkAction(input: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return joinViaInviteLink(session.user.id, input);
}
