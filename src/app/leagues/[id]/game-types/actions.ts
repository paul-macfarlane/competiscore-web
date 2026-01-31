"use server";

import { GameType } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  archiveGameType as archiveGameTypeService,
  createGameType as createGameTypeService,
  deleteGameType as deleteGameTypeService,
  unarchiveGameType as unarchiveGameTypeService,
  updateGameType as updateGameTypeService,
} from "@/services/game-types";
import { ServiceResult } from "@/services/shared";
import { headers } from "next/headers";

export async function createGameTypeAction(
  input: unknown,
): Promise<ServiceResult<GameType>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return createGameTypeService(session.user.id, input);
}

export async function updateGameTypeAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<GameType>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return updateGameTypeService(session.user.id, idInput, dataInput);
}

export async function archiveGameTypeAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return archiveGameTypeService(session.user.id, input);
}

export async function deleteGameTypeAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return deleteGameTypeService(session.user.id, input);
}

export async function unarchiveGameTypeAction(
  input: unknown,
): Promise<ServiceResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { error: "Unauthorized" };
  }

  return unarchiveGameTypeService(session.user.id, input);
}
