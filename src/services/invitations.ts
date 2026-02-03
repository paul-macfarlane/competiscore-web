import { withTransaction } from "@/db/index";
import {
  InvitationWithDetails,
  checkExistingPendingInvitation,
  createInvitation as dbCreateInvitation,
  getPendingInvitationsForLeague as dbGetPendingInvitationsForLeague,
  getPendingInvitationsForUser as dbGetPendingInvitationsForUser,
  deleteInvitation,
  getInvitationByIdWithDetails,
  getInvitationByToken,
  getInvitationByTokenWithDetails,
  incrementInvitationUseCount,
  updateInvitationStatus,
} from "@/db/invitations";
import { getLeagueMember } from "@/db/league-members";
import { getLeagueById as dbGetLeagueById } from "@/db/leagues";
import { League, LeagueMember } from "@/db/schema";
import { getUserById } from "@/db/users";
import { canLeagueAddMember } from "@/lib/server/limits";
import { InvitationStatus, LeagueMemberRole } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getAssignableRoles } from "@/lib/shared/roles";
import {
  cancelInvitationSchema,
  invitationIdSchema,
  joinViaTokenSchema,
} from "@/validators/invitations";
import {
  generateInviteLinkSchema,
  inviteUserSchema,
} from "@/validators/members";
import { z } from "zod";

import { addUserToLeague } from "./join-league";
import { ServiceResult, formatZodErrors } from "./shared";

type ValidatedInviter = {
  membership: LeagueMember;
};

async function validateInvitePermissions(
  inviterId: string,
  leagueId: string,
  role: LeagueMemberRole,
): Promise<ServiceResult<ValidatedInviter>> {
  const membership = await getLeagueMember(inviterId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.INVITE_MEMBERS)) {
    return { error: "You don't have permission to invite members" };
  }

  const assignableRoles = getAssignableRoles(membership.role);
  if (!assignableRoles.includes(role)) {
    return { error: "You cannot invite someone with a higher role than yours" };
  }

  return { data: { membership } };
}

const inviteInputSchema = inviteUserSchema.extend({
  leagueId: z.string(),
});

export async function inviteUser(
  inviterId: string,
  input: unknown,
): Promise<
  ServiceResult<{ invited: boolean; invitationId: string; leagueId: string }>
> {
  const parsed = inviteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, inviteeUserId, role } = parsed.data;

  const validation = await validateInvitePermissions(inviterId, leagueId, role);
  if (validation.error) {
    return { error: validation.error };
  }

  const invitee = await getUserById(inviteeUserId);
  if (!invitee) {
    return { error: "User not found" };
  }

  const existingMembership = await getLeagueMember(inviteeUserId, leagueId);
  if (existingMembership) {
    return { error: "User is already a member of this league" };
  }

  const existingInvitation = await checkExistingPendingInvitation(
    leagueId,
    inviteeUserId,
  );
  if (existingInvitation) {
    return { error: "User already has a pending invitation to this league" };
  }

  const leagueLimitCheck = await canLeagueAddMember(leagueId);
  if (!leagueLimitCheck.allowed) {
    return { error: leagueLimitCheck.message };
  }

  const invitation = await dbCreateInvitation({
    leagueId,
    inviterId,
    inviteeUserId,
    role,
    status: InvitationStatus.PENDING,
  });

  return {
    data: { invited: true, invitationId: invitation.id, leagueId: leagueId },
  };
}

const generateLinkInputSchema = generateInviteLinkSchema.extend({
  leagueId: z.string(),
});

export async function generateInviteLink(
  inviterId: string,
  input: unknown,
): Promise<
  ServiceResult<{ token: string; invitationId: string; leagueId: string }>
> {
  const parsed = generateLinkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, role, expiresInDays, maxUses } = parsed.data;

  const validation = await validateInvitePermissions(inviterId, leagueId, role);
  if (validation.error) {
    return { error: validation.error };
  }

  const token = crypto.randomUUID();
  let expiresAt: Date | undefined;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const invitation = await dbCreateInvitation({
    leagueId,
    inviterId,
    role,
    status: InvitationStatus.PENDING,
    token,
    maxUses: maxUses ?? null,
    expiresAt: expiresAt ?? null,
  });

  return { data: { token, invitationId: invitation.id, leagueId } };
}

export type InviteLinkDetails = {
  league: Pick<League, "id" | "name" | "description" | "logo">;
  role: LeagueMemberRole;
  isValid: boolean;
  reason?: string;
};

export async function getInviteLinkDetails(
  token: string,
): Promise<ServiceResult<InviteLinkDetails>> {
  const invitation = await getInvitationByTokenWithDetails(token);
  if (!invitation) {
    return { error: "Invite link not found or has expired" };
  }

  const now = new Date();
  let isValid = true;
  let reason: string | undefined;

  if (invitation.status !== InvitationStatus.PENDING) {
    isValid = false;
    reason = "This invite link is no longer active";
  } else if (invitation.expiresAt && invitation.expiresAt < now) {
    isValid = false;
    reason = "This invite link has expired";
  } else if (
    invitation.maxUses !== null &&
    invitation.useCount >= invitation.maxUses
  ) {
    isValid = false;
    reason = "This invite link has reached its maximum uses";
  }

  return {
    data: {
      league: invitation.league,
      role: invitation.role,
      isValid,
      reason,
    },
  };
}

export async function acceptInvitation(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ joined: boolean }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { invitationId } = parsed.data;

  const invitation = await getInvitationByIdWithDetails(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeUserId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  const now = new Date();
  if (invitation.expiresAt && invitation.expiresAt < now) {
    await updateInvitationStatus(invitationId, InvitationStatus.EXPIRED);
    return { error: "This invitation has expired" };
  }

  return withTransaction(async (tx) => {
    const joinResult = await addUserToLeague(
      userId,
      invitation.leagueId,
      invitation.role,
      tx,
    );
    if (joinResult.error) {
      if (joinResult.error === "You are already a member of this league") {
        await updateInvitationStatus(
          invitationId,
          InvitationStatus.ACCEPTED,
          tx,
        );
      }
      return joinResult;
    }

    await updateInvitationStatus(invitationId, InvitationStatus.ACCEPTED, tx);

    return { data: { joined: true } };
  });
}

export async function declineInvitation(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ declined: boolean }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { invitationId } = parsed.data;

  const invitation = await getInvitationByIdWithDetails(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeUserId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  await updateInvitationStatus(invitationId, InvitationStatus.DECLINED);

  return { data: { declined: true } };
}

export async function joinViaInviteLink(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ joined: boolean; leagueId: string }>> {
  const parsed = joinViaTokenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { token } = parsed.data;

  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return { error: "Invite link not found" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invite link is no longer active" };
  }

  const now = new Date();
  if (invitation.expiresAt && invitation.expiresAt < now) {
    return { error: "This invite link has expired" };
  }

  if (
    invitation.maxUses !== null &&
    invitation.useCount >= invitation.maxUses
  ) {
    return { error: "This invite link has reached its maximum uses" };
  }

  const league = await dbGetLeagueById(invitation.leagueId);
  if (!league) {
    return { error: "League not found" };
  }

  if (league.isArchived) {
    return { error: "This league has been archived" };
  }

  return withTransaction(async (tx) => {
    const joinResult = await addUserToLeague(
      userId,
      invitation.leagueId,
      invitation.role,
      tx,
    );
    if (joinResult.error) {
      return { error: joinResult.error };
    }

    await incrementInvitationUseCount(invitation.id, tx);

    return { data: { joined: true, leagueId: invitation.leagueId } };
  });
}

export async function cancelInvitation(
  requestingUserId: string,
  input: unknown,
): Promise<ServiceResult<{ cancelled: boolean; leagueId: string }>> {
  const parsed = cancelInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { invitationId, leagueId } = parsed.data;

  const invitation = await getInvitationByIdWithDetails(invitationId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.leagueId !== leagueId) {
    return { error: "Invitation does not belong to this league" };
  }

  const membership = await getLeagueMember(requestingUserId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.INVITE_MEMBERS)) {
    return { error: "You don't have permission to cancel invitations" };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { error: "This invitation is no longer pending" };
  }

  const deleted = await deleteInvitation(invitationId);
  if (!deleted) {
    return { error: "Failed to cancel invitation" };
  }

  return { data: { cancelled: true, leagueId } };
}

export async function getUserPendingInvitations(
  userId: string,
): Promise<ServiceResult<InvitationWithDetails[]>> {
  const invitations = await dbGetPendingInvitationsForUser(userId);
  return { data: invitations };
}

export async function getLeaguePendingInvitations(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<InvitationWithDetails[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.INVITE_MEMBERS)) {
    return { error: "You don't have permission to view invitations" };
  }

  const invitations = await dbGetPendingInvitationsForLeague(leagueId);
  return { data: invitations };
}
