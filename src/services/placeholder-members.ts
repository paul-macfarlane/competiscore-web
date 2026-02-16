import {
  deleteEloRating,
  getEloRatingByParticipant,
  getEloRatingsByPlaceholder,
  migrateEloRatingToUser,
  updateEloHistoryRatingId,
} from "@/db/elo-ratings";
import { type DBOrTx, db, withTransaction } from "@/db/index";
import { cancelPendingInvitationsForPlaceholder } from "@/db/invitations";
import { getLeagueMember } from "@/db/league-members";
import {
  countActivePlaceholderMembersByLeague,
  createPlaceholderMember as dbCreatePlaceholderMember,
  deletePlaceholderMember as dbDeletePlaceholderMember,
  restorePlaceholderMember as dbRestorePlaceholderMember,
  retirePlaceholderMember as dbRetirePlaceholderMember,
  updatePlaceholderMember as dbUpdatePlaceholderMember,
  getActivePlaceholderMembersByLeague,
  getPlaceholderMemberById,
  getRetiredPlaceholderMembersByLeague,
  hasPlaceholderActivity,
  migrateHighScoreEntriesToUser,
  migrateMatchParticipantsToUser,
  migrateTeamMembersToUser,
} from "@/db/placeholder-members";
import { PlaceholderMember } from "@/db/schema";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import {
  createPlaceholderSchema,
  displayNameSchema,
} from "@/validators/members";
import { placeholderIdSchema } from "@/validators/placeholders";
import { z } from "zod";

import { DEFAULT_ITEMS_PER_PAGE } from "./constants";
import { PaginatedResult, ServiceResult, formatZodErrors } from "./shared";

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

export async function getPlaceholdersPaginated(
  leagueId: string,
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<ServiceResult<PaginatedResult<PlaceholderMember>>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.VIEW_MEMBERS)) {
    return { error: "You don't have permission to view members" };
  }

  const limit = options?.limit ?? DEFAULT_ITEMS_PER_PAGE;
  const offset = options?.offset ?? 0;

  const [items, total] = await Promise.all([
    getActivePlaceholderMembersByLeague(leagueId, { limit, offset }),
    countActivePlaceholderMembersByLeague(leagueId),
  ]);

  return { data: { items, total, limit, offset } };
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

export async function checkPlaceholderActivity(
  userId: string,
  placeholderId: string,
  leagueId: string,
): Promise<ServiceResult<{ hasActivity: boolean }>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const result = await hasPlaceholderActivity(placeholderId);
  return { data: { hasActivity: result } };
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

/**
 * Migrates ELO ratings from a placeholder to a user.
 * For each game type:
 * - If user has NO existing rating, transfer placeholder's rating
 * - If user HAS existing rating, merge history into user's rating and delete placeholder's rating
 */
async function migrateEloRatingsToUser(
  placeholderId: string,
  userId: string,
  dbOrTx: DBOrTx,
): Promise<void> {
  const placeholderRatings = await getEloRatingsByPlaceholder(
    placeholderId,
    dbOrTx,
  );

  for (const placeholderRating of placeholderRatings) {
    const existingUserRating = await getEloRatingByParticipant(
      {
        gameTypeId: placeholderRating.gameTypeId,
        userId,
      },
      dbOrTx,
    );

    if (!existingUserRating) {
      await migrateEloRatingToUser(placeholderRating.id, userId, dbOrTx);
    } else {
      await updateEloHistoryRatingId(
        placeholderRating.id,
        existingUserRating.id,
        dbOrTx,
      );
      await deleteEloRating(placeholderRating.id, dbOrTx);
    }
  }
}

/**
 * Links a placeholder member to a real user and migrates all their data.
 * This is called when a user joins a league and needs to inherit a placeholder's history.
 *
 * Migrations performed:
 * - Match participant records
 * - Team member records
 * - High score entries
 * - ELO ratings (transferred if user has none, or history merged if user has existing ratings)
 * - Sets linkedUserId on the placeholder
 */
export async function linkPlaceholderToUser(
  placeholderId: string,
  userId: string,
  leagueId: string,
  dbOrTx: DBOrTx = db,
): Promise<ServiceResult<{ linked: boolean }>> {
  const placeholder = await getPlaceholderMemberById(placeholderId, dbOrTx);
  if (!placeholder) {
    return { error: "Placeholder member not found" };
  }

  if (placeholder.leagueId !== leagueId) {
    return { error: "Placeholder does not belong to this league" };
  }

  if (placeholder.linkedUserId) {
    return { error: "Placeholder is already linked to a user" };
  }

  const processLink = async (tx: DBOrTx) => {
    await migrateMatchParticipantsToUser(placeholderId, userId, tx);
    await migrateTeamMembersToUser(placeholderId, userId, tx);
    await migrateHighScoreEntriesToUser(placeholderId, userId, tx);
    await migrateEloRatingsToUser(placeholderId, userId, tx);
    await dbUpdatePlaceholderMember(
      placeholderId,
      { linkedUserId: userId },
      tx,
    );
    await cancelPendingInvitationsForPlaceholder(placeholderId, tx);
    await dbRetirePlaceholderMember(placeholderId, tx);

    return { data: { linked: true } };
  };

  if (dbOrTx === db) {
    return withTransaction(processLink);
  }
  return processLink(dbOrTx);
}
