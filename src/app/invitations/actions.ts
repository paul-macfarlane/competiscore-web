"use server";

import { auth } from "@/lib/server/auth";
import {
  acceptInvitation,
  declineInvitation,
  getUserPendingInvitations,
} from "@/services/invitations";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getMyPendingInvitationsAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return getUserPendingInvitations(session.user.id);
}

export async function acceptInvitationAction(invitationId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await acceptInvitation(invitationId, session.user.id);
  if (result.data) {
    revalidatePath("/invitations");
    revalidatePath("/leagues");
  }
  return result;
}

export async function declineInvitationAction(invitationId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = await declineInvitation(invitationId, session.user.id);
  if (result.data) {
    revalidatePath("/invitations");
  }
  return result;
}
