"use server";

import { auth } from "@/lib/server/auth";
import { joinViaInviteLink } from "@/services/invitations";
import { headers } from "next/headers";

export async function joinViaInviteLinkAction(token: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return joinViaInviteLink(token, session.user.id);
}
