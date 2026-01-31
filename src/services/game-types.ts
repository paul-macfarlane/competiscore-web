import {
  archiveGameType as dbArchiveGameType,
  checkGameTypeNameExists as dbCheckGameTypeNameExists,
  createGameType as dbCreateGameType,
  deleteGameType as dbDeleteGameType,
  getGameTypeById as dbGetGameTypeById,
  getGameTypesByLeagueId as dbGetGameTypesByLeagueId,
  unarchiveGameType as dbUnarchiveGameType,
  updateGameType as dbUpdateGameType,
} from "@/db/game-types";
import { getLeagueMember } from "@/db/league-members";
import { GameType } from "@/db/schema";
import { canLeagueAddGameType } from "@/lib/server/limits";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import {
  archiveGameTypeSchema,
  createGameTypeFormSchema,
  deleteGameTypeSchema,
  gameTypeIdSchema,
  unarchiveGameTypeSchema,
  updateGameTypeFormSchema,
} from "@/validators/game-types";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<GameType>> {
  const parsed = createGameTypeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const membership = await getLeagueMember(userId, parsed.data.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES)) {
    return { error: "You do not have permission to create game types" };
  }

  const nameExists = await dbCheckGameTypeNameExists(
    parsed.data.leagueId,
    parsed.data.name,
  );
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "A game type with this name already exists" },
    };
  }

  const limitCheck = await canLeagueAddGameType(parsed.data.leagueId);
  if (!limitCheck.allowed) {
    return { error: limitCheck.message };
  }

  const gameType = await dbCreateGameType({
    leagueId: parsed.data.leagueId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    logo: parsed.data.logo || null,
    category: parsed.data.category,
    config: JSON.stringify(parsed.data.config),
  });

  return { data: gameType };
}

export async function getGameType(
  userId: string,
  gameTypeId: string,
): Promise<ServiceResult<GameType>> {
  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  return { data: gameType };
}

export async function getLeagueGameTypes(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<GameType[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const gameTypes = await dbGetGameTypesByLeagueId(leagueId);
  return { data: gameTypes };
}

export async function updateGameType(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<GameType>> {
  const idParsed = gameTypeIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateGameTypeFormSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const gameType = await dbGetGameTypeById(idParsed.data.gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES)) {
    return { error: "You do not have permission to edit game types" };
  }

  if (dataParsed.data.name) {
    const nameExists = await dbCheckGameTypeNameExists(
      gameType.leagueId,
      dataParsed.data.name,
      idParsed.data.gameTypeId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "A game type with this name already exists" },
      };
    }
  }

  // Merge config: preserve existing config fields and only update provided ones
  let configToUpdate: string | undefined = undefined;
  if (dataParsed.data.config) {
    const existingConfig = JSON.parse(gameType.config);
    const mergedConfig = {
      ...existingConfig,
      ...dataParsed.data.config,
    };
    configToUpdate = JSON.stringify(mergedConfig);
  }

  const updated = await dbUpdateGameType(idParsed.data.gameTypeId, {
    name: dataParsed.data.name,
    description: dataParsed.data.description,
    logo: dataParsed.data.logo,
    config: configToUpdate,
  });
  if (!updated) {
    return { error: "Failed to update game type" };
  }

  return { data: updated };
}

export async function archiveGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = archiveGameTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { gameTypeId } = parsed.data;

  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES)) {
    return { error: "You do not have permission to archive game types" };
  }

  await dbArchiveGameType(gameTypeId);
  return { data: undefined };
}

export async function unarchiveGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = unarchiveGameTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { gameTypeId } = parsed.data;

  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES)) {
    return { error: "You do not have permission to unarchive game types" };
  }

  await dbUnarchiveGameType(gameTypeId);
  return { data: undefined };
}

export async function deleteGameType(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = deleteGameTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { gameTypeId } = parsed.data;

  const gameType = await dbGetGameTypeById(gameTypeId);
  if (!gameType) {
    return { error: "Game type not found" };
  }

  const membership = await getLeagueMember(userId, gameType.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES)) {
    return { error: "You do not have permission to delete game types" };
  }

  const deleted = await dbDeleteGameType(gameTypeId);
  if (!deleted) {
    return { error: "Failed to delete game type" };
  }

  return { data: undefined };
}
