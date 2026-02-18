"use server";

import { Tournament, TournamentParticipant } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import { ServiceResult } from "@/services/shared";
import {
  addTournamentParticipant,
  createTournament,
  deleteTournament,
  forfeitTournamentMatch,
  generateBracket,
  generateNextSwissRound,
  recordTournamentMatchResult,
  removeTournamentParticipant,
  setParticipantSeeds,
  updateTournament,
} from "@/services/tournaments";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createTournamentAction(
  input: unknown,
): Promise<ServiceResult<Tournament>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await createTournament(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/tournaments`);
  }
  return result;
}

export async function updateTournamentAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<Tournament>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await updateTournament(session.user.id, idInput, dataInput);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/tournaments`);
  }
  return result;
}

export async function addTournamentParticipantAction(
  input: unknown,
): Promise<ServiceResult<TournamentParticipant>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await addTournamentParticipant(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues`);
  }
  return result;
}

export async function removeTournamentParticipantAction(
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await removeTournamentParticipant(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/tournaments/${result.data.tournamentId}`,
    );
  }
  return result;
}

export async function setParticipantSeedsAction(
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await setParticipantSeeds(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/tournaments/${result.data.tournamentId}`,
    );
  }
  return result;
}

export async function generateBracketAction(
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await generateBracket(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/tournaments/${result.data.tournamentId}`,
    );
  }
  return result;
}

export async function recordTournamentMatchResultAction(
  input: unknown,
): Promise<
  ServiceResult<{ matchId: string; tournamentId: string; leagueId: string }>
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await recordTournamentMatchResult(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/tournaments/${result.data.tournamentId}`,
    );
    revalidatePath(`/leagues/${result.data.leagueId}/matches`);
  }
  return result;
}

export async function forfeitTournamentMatchAction(
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await forfeitTournamentMatch(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/tournaments/${result.data.tournamentId}`,
    );
  }
  return result;
}

export async function generateNextSwissRoundAction(
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await generateNextSwissRound(session.user.id, input);
  if (result.data) {
    revalidatePath(
      `/leagues/${result.data.leagueId}/tournaments/${result.data.tournamentId}`,
    );
  }
  return result;
}

export async function deleteTournamentAction(
  input: unknown,
): Promise<ServiceResult<{ leagueId: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const result = await deleteTournament(session.user.id, input);
  if (result.data) {
    revalidatePath(`/leagues/${result.data.leagueId}/tournaments`);
  }
  return result;
}
