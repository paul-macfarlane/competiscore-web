import { getLeagueMember } from "@/db/league-members";
import {
  createPlaceholderMember as dbCreatePlaceholderMember,
  deletePlaceholderMember as dbDeletePlaceholderMember,
  restorePlaceholderMember as dbRestorePlaceholderMember,
  retirePlaceholderMember as dbRetirePlaceholderMember,
  updatePlaceholderMember as dbUpdatePlaceholderMember,
  getActivePlaceholderMembersByLeague,
  getPlaceholderMemberById,
  getRetiredPlaceholderMembersByLeague,
  hasPlaceholderActivity,
} from "@/db/placeholder-members";
import { PlaceholderMember } from "@/db/schema";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import {
  createPlaceholderSchema,
  displayNameSchema,
} from "@/validators/members";
import { placeholderIdSchema } from "@/validators/placeholders";
import { z } from "zod";

import { ServiceResult, formatZodErrors } from "./shared";

const createPlaceholderInputSchema = createPlaceholderSchema.extend({
  leagueId: z.string(),
});

export async function createPlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<PlaceholderMember>> {
  const parsed = createPlaceholderInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId, displayName } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_PLACEHOLDERS)) {
    return { error: "You don't have permission to create placeholder members" };
  }

  const placeholder = await dbCreatePlaceholderMember({
    leagueId,
    displayName,
  });

  return { data: placeholder };
}

export async function getPlaceholders(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<PlaceholderMember[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_MEMBERS)) {
    return { error: "You don't have permission to view members" };
  }

  const placeholders = await getActivePlaceholderMembersByLeague(leagueId);
  return { data: placeholders };
}

const updatePlaceholderInputSchema = z.object({
  placeholderId: z.string(),
  displayName: displayNameSchema,
});

export async function updatePlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<PlaceholderMember>> {
  const parsed = updatePlaceholderInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, displayName } = parsed.data;

  const placeholder = await getPlaceholderMemberById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder member not found" };
  }

  const membership = await getLeagueMember(userId, placeholder.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_PLACEHOLDERS)) {
    return { error: "You don't have permission to manage placeholder members" };
  }

  const updated = await dbUpdatePlaceholderMember(placeholderId, {
    displayName,
  });
  if (!updated) {
    return { error: "Failed to update placeholder member" };
  }

  return { data: updated };
}

export async function retirePlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ retired: boolean; leagueId: string }>> {
  const parsed = placeholderIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, leagueId } = parsed.data;

  const placeholder = await getPlaceholderMemberById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder member not found" };
  }

  if (placeholder.leagueId !== leagueId) {
    return { error: "Placeholder member does not belong to this league" };
  }

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_PLACEHOLDERS)) {
    return { error: "You don't have permission to retire placeholder members" };
  }

  const retired = await dbRetirePlaceholderMember(placeholderId);
  if (!retired) {
    return { error: "Failed to retire placeholder member" };
  }

  return { data: { retired: true, leagueId } };
}

export async function getRetiredPlaceholders(
  leagueId: string,
  userId: string,
): Promise<ServiceResult<PlaceholderMember[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_PLACEHOLDERS)) {
    return { error: "You don't have permission to view retired placeholders" };
  }

  const placeholders = await getRetiredPlaceholderMembersByLeague(leagueId);
  return { data: placeholders };
}

export async function restorePlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ restored: boolean; leagueId: string }>> {
  const parsed = placeholderIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, leagueId } = parsed.data;

  const placeholder = await getPlaceholderMemberById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder member not found" };
  }

  if (placeholder.leagueId !== leagueId) {
    return { error: "Placeholder member does not belong to this league" };
  }

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_PLACEHOLDERS)) {
    return {
      error: "You don't have permission to restore placeholder members",
    };
  }

  const restored = await dbRestorePlaceholderMember(placeholderId);
  if (!restored) {
    return { error: "Failed to restore placeholder member" };
  }

  return { data: { restored: true, leagueId } };
}

export async function deletePlaceholder(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; leagueId: string }>> {
  const parsed = placeholderIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { placeholderId, leagueId } = parsed.data;

  const placeholder = await getPlaceholderMemberById(placeholderId);
  if (!placeholder) {
    return { error: "Placeholder member not found" };
  }

  if (placeholder.leagueId !== leagueId) {
    return { error: "Placeholder member does not belong to this league" };
  }

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_PLACEHOLDERS)) {
    return {
      error: "You don't have permission to delete placeholder members",
    };
  }

  const hasActivity = await hasPlaceholderActivity(placeholderId);
  if (hasActivity) {
    return {
      error:
        "Cannot delete placeholder with activity history. Use retire instead.",
    };
  }

  const deleted = await dbDeletePlaceholderMember(placeholderId);
  if (!deleted) {
    return { error: "Failed to delete placeholder member" };
  }

  return { data: { deleted: true, leagueId } };
}
