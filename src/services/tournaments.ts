import { getGameTypeById as dbGetGameTypeById } from "@/db/game-types";
import { DBOrTx, withTransaction } from "@/db/index";
import { getLeagueMember } from "@/db/league-members";
import {
  createMatch as dbCreateMatch,
  createMatchParticipants as dbCreateMatchParticipants,
} from "@/db/matches";
import { getPlaceholderMemberById } from "@/db/placeholder-members";
import {
  NewMatchParticipant,
  Tournament,
  TournamentParticipant,
  TournamentRoundMatch,
} from "@/db/schema";
import { getTeamById } from "@/db/teams";
import {
  TournamentParticipantWithDetails,
  TournamentRoundMatchWithDetails,
  TournamentWithDetails,
  addTournamentParticipant as dbAddParticipant,
  bulkUpdateParticipantSeeds as dbBulkUpdateSeeds,
  checkParticipantInTournament as dbCheckParticipantInTournament,
  checkTournamentNameExists as dbCheckTournamentNameExists,
  countTournamentParticipants as dbCountParticipants,
  countTournamentsByLeagueId as dbCountTournaments,
  countTournamentsByLeagueIdAndStatus as dbCountTournamentsByStatus,
  createTournamentRoundMatches as dbCreateRoundMatches,
  createTournament as dbCreateTournament,
  deleteTournament as dbDeleteTournament,
  getTournamentBracket as dbGetBracket,
  getTournamentParticipantById as dbGetParticipantById,
  getTournamentParticipants as dbGetParticipants,
  getTournamentRoundMatchById as dbGetRoundMatchById,
  getTournamentRoundMatchesByRound as dbGetRoundMatchesByRound,
  getTournamentById as dbGetTournamentById,
  getTournamentWithDetails as dbGetTournamentWithDetails,
  getTournamentsByLeagueId as dbGetTournamentsByLeagueId,
  removeTournamentParticipant as dbRemoveParticipant,
  updateTournamentParticipant as dbUpdateParticipant,
  updateTournamentRoundMatch as dbUpdateRoundMatch,
  updateTournament as dbUpdateTournament,
} from "@/db/tournaments";
import { generateSingleEliminationBracket } from "@/lib/shared/bracket-generator";
import {
  GameCategory,
  MatchResult,
  MatchStatus,
  ParticipantType,
  ScoringType,
  SeedingType,
  TournamentStatus,
  TournamentType,
} from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import {
  SwissMatchRecord,
  computeSwissStandings,
  generateSwissNextRound,
  generateSwissRound1,
  getSwissRanking,
} from "@/lib/shared/swiss-pairing";
import {
  addTournamentParticipantSchema,
  createTournamentSchema,
  forfeitTournamentMatchSchema,
  generateBracketSchema,
  generateNextSwissRoundSchema,
  recordTournamentMatchResultSchema,
  removeTournamentParticipantSchema,
  setParticipantSeedsSchema,
  tournamentIdSchema,
  updateTournamentSchema,
} from "@/validators/tournaments";

import {
  DEFAULT_ITEMS_PER_PAGE,
  MAX_TOURNAMENTS_PER_LEAGUE,
  MAX_TOURNAMENT_PARTICIPANTS,
  MIN_TOURNAMENT_PARTICIPANTS,
} from "./constants";
import { updateEloRatingsForMatch } from "./elo-ratings";
import {
  PaginatedResult,
  ServiceResult,
  formatZodErrors,
  isSuspended,
} from "./shared";

export async function createTournament(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Tournament>> {
  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const membership = await getLeagueMember(userId, data.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to create tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot create tournaments while suspended" };
  }

  const gameType = await dbGetGameTypeById(data.gameTypeId);
  if (!gameType || gameType.leagueId !== data.leagueId) {
    return { error: "Game type not found in this league" };
  }

  if (gameType.isArchived) {
    return { error: "Cannot create a tournament with an archived game type" };
  }

  if (gameType.category !== GameCategory.HEAD_TO_HEAD) {
    return {
      error: "Tournaments are only supported for head-to-head game types",
    };
  }

  const nameExists = await dbCheckTournamentNameExists(
    data.leagueId,
    data.name,
  );
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "A tournament with this name already exists" },
    };
  }

  const tournamentCount = await dbCountTournaments(data.leagueId);
  if (tournamentCount >= MAX_TOURNAMENTS_PER_LEAGUE) {
    return {
      error: `This league has reached the maximum of ${MAX_TOURNAMENTS_PER_LEAGUE} tournaments`,
    };
  }

  const isSwiss = data.tournamentType === TournamentType.SWISS;
  const seedingType = isSwiss
    ? SeedingType.RANDOM
    : (data.seedingType ?? SeedingType.RANDOM);

  const newTournament = await dbCreateTournament({
    leagueId: data.leagueId,
    gameTypeId: data.gameTypeId,
    name: data.name,
    description: data.description ?? null,
    logo: data.logo ?? null,
    tournamentType: data.tournamentType ?? TournamentType.SINGLE_ELIMINATION,
    status: TournamentStatus.DRAFT,
    participantType: data.participantType,
    seedingType,
    bestOf: 1,
    totalRounds: isSwiss ? (data.swissRounds ?? null) : null,
    startDate: data.startDate ?? null,
    placementPointConfig: data.placementPointConfig
      ? JSON.stringify(data.placementPointConfig)
      : null,
    createdById: userId,
  });

  return { data: newTournament };
}

export async function updateTournament(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<Tournament>> {
  const idParsed = tournamentIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateTournamentSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const { tournamentId } = idParsed.data;
  const data = dataParsed.data;

  const tournamentData = await dbGetTournamentById(tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to edit tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot edit tournaments while suspended" };
  }

  const isDraft = tournamentData.status === TournamentStatus.DRAFT;
  const hasDraftOnlyFields =
    data.seedingType !== undefined || data.startDate !== undefined;

  if (!isDraft && hasDraftOnlyFields) {
    return {
      error:
        "Only name, description, and icon can be edited after the tournament has started",
    };
  }

  if (data.name) {
    const nameExists = await dbCheckTournamentNameExists(
      tournamentData.leagueId,
      data.name,
      tournamentId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "A tournament with this name already exists" },
      };
    }
  }

  const updated = await dbUpdateTournament(tournamentId, {
    name: data.name,
    description: data.description,
    logo: data.logo,
    ...(isDraft && {
      seedingType: data.seedingType as Tournament["seedingType"],
      startDate: data.startDate,
    }),
  });

  if (!updated) {
    return { error: "Failed to update tournament" };
  }

  return { data: updated };
}

export async function addTournamentParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<TournamentParticipant>> {
  const parsed = addTournamentParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const tournamentData = await dbGetTournamentById(data.tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return {
      error: "Can only add participants to tournaments in draft status",
    };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to manage tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot manage tournaments while suspended" };
  }

  if (
    tournamentData.participantType === ParticipantType.INDIVIDUAL &&
    data.teamId
  ) {
    return {
      error: "This tournament is for individual participants, not teams",
    };
  }
  if (tournamentData.participantType === ParticipantType.TEAM && !data.teamId) {
    return { error: "This tournament is for team participants" };
  }

  if (data.userId) {
    const participantMembership = await getLeagueMember(
      data.userId,
      tournamentData.leagueId,
    );
    if (!participantMembership) {
      return { error: "User is not a member of this league" };
    }
  } else if (data.teamId) {
    const teamData = await getTeamById(data.teamId);
    if (!teamData || teamData.leagueId !== tournamentData.leagueId) {
      return { error: "Team not found in this league" };
    }
    if (teamData.isArchived) {
      return { error: "Cannot add an archived team" };
    }
  } else if (data.placeholderMemberId) {
    const placeholder = await getPlaceholderMemberById(
      data.placeholderMemberId,
    );
    if (!placeholder || placeholder.leagueId !== tournamentData.leagueId) {
      return { error: "Placeholder member not found in this league" };
    }
  }

  const alreadyInTournament = await dbCheckParticipantInTournament(
    data.tournamentId,
    {
      userId: data.userId,
      teamId: data.teamId,
      placeholderMemberId: data.placeholderMemberId,
    },
  );
  if (alreadyInTournament) {
    return { error: "This participant is already in the tournament" };
  }

  const currentCount = await dbCountParticipants(data.tournamentId);
  if (currentCount >= MAX_TOURNAMENT_PARTICIPANTS) {
    return {
      error: `Tournament has reached the maximum of ${MAX_TOURNAMENT_PARTICIPANTS} participants`,
    };
  }

  const participant = await dbAddParticipant({
    tournamentId: data.tournamentId,
    userId: data.userId ?? null,
    teamId: data.teamId ?? null,
    placeholderMemberId: data.placeholderMemberId ?? null,
    seed: null,
    isEliminated: false,
    eliminatedInRound: null,
    finalPlacement: null,
  });

  return { data: participant };
}

export async function removeTournamentParticipant(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const parsed = removeTournamentParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const tournamentData = await dbGetTournamentById(data.tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return {
      error: "Can only remove participants from tournaments in draft status",
    };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to manage tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot manage tournaments while suspended" };
  }

  const participant = await dbGetParticipantById(data.participantId);
  if (!participant || participant.tournamentId !== data.tournamentId) {
    return { error: "Participant not found in this tournament" };
  }

  await dbRemoveParticipant(data.participantId);

  return {
    data: {
      tournamentId: data.tournamentId,
      leagueId: tournamentData.leagueId,
    },
  };
}

export async function setParticipantSeeds(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const parsed = setParticipantSeedsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const tournamentData = await dbGetTournamentById(data.tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Can only set seeds for tournaments in draft status" };
  }

  if (tournamentData.seedingType !== SeedingType.MANUAL) {
    return { error: "Seeds can only be set for manually seeded tournaments" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to manage tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot manage tournaments while suspended" };
  }

  const participants = await dbGetParticipants(data.tournamentId);
  if (data.seeds.length !== participants.length) {
    return {
      error: `Must assign seeds to all ${participants.length} participants`,
    };
  }

  const participantIds = new Set(participants.map((p) => p.id));
  for (const seed of data.seeds) {
    if (!participantIds.has(seed.participantId)) {
      return { error: "Invalid participant ID in seed assignments" };
    }
  }

  const seedValues = data.seeds.map((s) => s.seed).sort((a, b) => a - b);
  const expected = Array.from({ length: participants.length }, (_, i) => i + 1);
  if (JSON.stringify(seedValues) !== JSON.stringify(expected)) {
    return {
      error: `Seeds must be unique values from 1 to ${participants.length}`,
    };
  }

  await dbBulkUpdateSeeds(
    data.seeds.map((s) => ({ id: s.participantId, seed: s.seed })),
  );

  return {
    data: {
      tournamentId: data.tournamentId,
      leagueId: tournamentData.leagueId,
    },
  };
}

export async function generateBracket(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const parsed = generateBracketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { tournamentId } = parsed.data;

  const tournamentData = await dbGetTournamentById(tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Bracket can only be generated for draft tournaments" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to manage tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot manage tournaments while suspended" };
  }

  const participants = await dbGetParticipants(tournamentId);
  if (participants.length < MIN_TOURNAMENT_PARTICIPANTS) {
    return {
      error: `At least ${MIN_TOURNAMENT_PARTICIPANTS} participants are required`,
    };
  }

  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;

  if (!isSwiss && tournamentData.seedingType === SeedingType.MANUAL) {
    const allSeeded = participants.every((p) => p.seed !== null);
    if (!allSeeded) {
      return { error: "All participants must have seeds assigned" };
    }
  }

  if (isSwiss) {
    return generateSwissBracket(tournamentId, tournamentData, participants);
  }

  return generateSingleEliminationBracketForTournament(
    tournamentId,
    tournamentData,
    participants,
  );
}

async function generateSwissBracket(
  tournamentId: string,
  tournamentData: Tournament,
  participants: TournamentParticipantWithDetails[],
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  return withTransaction(async (tx) => {
    const participantNames = participants.map((p) => ({
      id: p.id,
      name:
        p.user?.name ??
        p.team?.name ??
        p.placeholderMember?.displayName ??
        "Unknown",
    }));

    const round1 = generateSwissRound1(participantNames);

    const totalRounds =
      tournamentData.totalRounds ?? Math.ceil(Math.log2(participants.length));

    const roundMatchData = round1.pairings.map((pairing, i) => ({
      tournamentId,
      round: 1,
      position: i + 1,
      participant1Id: pairing.participant1Id,
      participant2Id: pairing.participant2Id as string | null,
      winnerId: null as string | null,
      matchId: null as string | null,
      isBye: false,
      isForfeit: false,
      isDraw: false,
      nextMatchId: null as string | null,
      nextMatchSlot: null as number | null,
    }));

    // Add bye match if needed
    if (round1.byeParticipantId) {
      roundMatchData.push({
        tournamentId,
        round: 1,
        position: roundMatchData.length + 1,
        participant1Id: round1.byeParticipantId,
        participant2Id: null,
        winnerId: round1.byeParticipantId,
        matchId: null as string | null,
        isBye: true,
        isForfeit: false,
        isDraw: false,
        nextMatchId: null as string | null,
        nextMatchSlot: null as number | null,
      });
    }

    await dbCreateRoundMatches(roundMatchData, tx);

    await dbUpdateTournament(
      tournamentId,
      {
        status: TournamentStatus.IN_PROGRESS,
        totalRounds,
      },
      tx,
    );

    return {
      data: {
        tournamentId,
        leagueId: tournamentData.leagueId,
      },
    };
  });
}

async function generateSingleEliminationBracketForTournament(
  tournamentId: string,
  tournamentData: Tournament,
  participants: TournamentParticipantWithDetails[],
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  return withTransaction(async (tx) => {
    let seededParticipants: TournamentParticipant[];
    if (tournamentData.seedingType === SeedingType.RANDOM) {
      const shuffled = [...participants];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const seedUpdates = shuffled.map((p, i) => ({
        id: p.id,
        seed: i + 1,
      }));
      await dbBulkUpdateSeeds(seedUpdates, tx);
      seededParticipants = shuffled.map((p, i) => ({
        ...p,
        seed: i + 1,
      }));
    } else {
      seededParticipants = [...participants].sort(
        (a, b) => (a.seed ?? 0) - (b.seed ?? 0),
      );
    }

    const bracketSlots = generateSingleEliminationBracket(
      seededParticipants.length,
    );
    const totalRounds = Math.max(...bracketSlots.map((s) => s.round));

    const seedToParticipant = new Map<number, TournamentParticipant>();
    for (const p of seededParticipants) {
      if (p.seed !== null) {
        seedToParticipant.set(p.seed, p);
      }
    }

    const roundMatchData = bracketSlots.map((slot) => ({
      tournamentId,
      round: slot.round,
      position: slot.position,
      participant1Id: slot.seed1
        ? (seedToParticipant.get(slot.seed1)?.id ?? null)
        : null,
      participant2Id: slot.seed2
        ? (seedToParticipant.get(slot.seed2)?.id ?? null)
        : null,
      winnerId: null as string | null,
      matchId: null as string | null,
      isBye: slot.isBye,
      isForfeit: false,
      isDraw: false,
      nextMatchId: null as string | null,
      nextMatchSlot: slot.nextPosition?.slot ?? null,
    }));

    const createdMatches = await dbCreateRoundMatches(roundMatchData, tx);

    const positionToMatch = new Map<string, TournamentRoundMatch>();
    for (const m of createdMatches) {
      positionToMatch.set(`${m.round}-${m.position}`, m);
    }

    for (const slot of bracketSlots) {
      if (slot.nextPosition) {
        const currentMatch = positionToMatch.get(
          `${slot.round}-${slot.position}`,
        );
        const nextMatch = positionToMatch.get(
          `${slot.nextPosition.round}-${slot.nextPosition.position}`,
        );
        if (currentMatch && nextMatch) {
          await dbUpdateRoundMatch(
            currentMatch.id,
            {
              nextMatchId: nextMatch.id,
              nextMatchSlot: slot.nextPosition.slot,
            },
            tx,
          );
          positionToMatch.set(`${slot.round}-${slot.position}`, {
            ...currentMatch,
            nextMatchId: nextMatch.id,
            nextMatchSlot: slot.nextPosition.slot,
          });
        }
      }
    }

    for (const rm of createdMatches) {
      if (rm.isBye) {
        const winnerId = rm.participant1Id ?? rm.participant2Id;
        if (winnerId) {
          await dbUpdateRoundMatch(rm.id, { winnerId }, tx);
          const updatedMatch = positionToMatch.get(
            `${rm.round}-${rm.position}`,
          );
          if (updatedMatch) {
            await advanceWinner(updatedMatch, winnerId, positionToMatch, tx);
          }
        }
      }
    }

    await dbUpdateTournament(
      tournamentId,
      {
        status: TournamentStatus.IN_PROGRESS,
        totalRounds,
      },
      tx,
    );

    return {
      data: {
        tournamentId,
        leagueId: tournamentData.leagueId,
      },
    };
  });
}

async function advanceWinner(
  currentMatch: TournamentRoundMatch,
  winnerId: string,
  positionToMatch: Map<string, TournamentRoundMatch>,
  tx: Parameters<Parameters<typeof withTransaction>[0]>[0],
): Promise<void> {
  if (!currentMatch.nextMatchId) return;

  let nextMatch: TournamentRoundMatch | undefined;
  for (const m of positionToMatch.values()) {
    if (m.id === currentMatch.nextMatchId) {
      nextMatch = m;
      break;
    }
  }

  if (!nextMatch) {
    nextMatch = await dbGetRoundMatchById(currentMatch.nextMatchId, tx);
  }

  if (!nextMatch) return;

  const slot = currentMatch.nextMatchSlot;
  if (slot === 1) {
    await dbUpdateRoundMatch(nextMatch.id, { participant1Id: winnerId }, tx);
    nextMatch = { ...nextMatch, participant1Id: winnerId };
  } else if (slot === 2) {
    await dbUpdateRoundMatch(nextMatch.id, { participant2Id: winnerId }, tx);
    nextMatch = { ...nextMatch, participant2Id: winnerId };
  }

  positionToMatch.set(`${nextMatch.round}-${nextMatch.position}`, nextMatch);
}

export async function recordTournamentMatchResult(
  userId: string,
  input: unknown,
): Promise<
  ServiceResult<{ matchId: string; tournamentId: string; leagueId: string }>
> {
  const parsed = recordTournamentMatchResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const roundMatch = await dbGetRoundMatchById(data.tournamentMatchId);
  if (!roundMatch) {
    return { error: "Tournament match not found" };
  }

  const tournamentData = await dbGetTournamentById(roundMatch.tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament is not in progress" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (isSuspended(membership)) {
    return {
      error: "You cannot record tournament results while suspended",
    };
  }

  const isManager = canPerformAction(
    membership.role,
    LeagueAction.CREATE_TOURNAMENTS,
  );

  if (!isManager) {
    const [p1, p2] = await Promise.all([
      roundMatch.participant1Id
        ? dbGetParticipantById(roundMatch.participant1Id)
        : null,
      roundMatch.participant2Id
        ? dbGetParticipantById(roundMatch.participant2Id)
        : null,
    ]);
    const isParticipant = p1?.userId === userId || p2?.userId === userId;
    if (!isParticipant) {
      return {
        error: "You do not have permission to record this tournament match",
      };
    }
  }

  if (roundMatch.winnerId || roundMatch.isDraw) {
    return { error: "This match already has a result" };
  }

  if (!roundMatch.participant1Id || !roundMatch.participant2Id) {
    return { error: "Both participants must be set before recording a result" };
  }

  const participant1Id = roundMatch.participant1Id;
  const participant2Id = roundMatch.participant2Id;
  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;

  return withTransaction(async (tx) => {
    const gameType = await dbGetGameTypeById(tournamentData.gameTypeId, tx);
    if (!gameType) {
      return { error: "Game type not found" };
    }

    const h2hConfig = parseH2HConfig(gameType.config);

    let winnerId: string | null = null;
    let isDraw = false;

    if (h2hConfig.scoringType === ScoringType.SCORE_BASED) {
      if (data.side1Score == null || data.side2Score == null) {
        return { error: "Scores are required for this game type" };
      }
      if (data.side1Score === data.side2Score) {
        if (!isSwiss) {
          return { error: "Tournament matches cannot end in a draw" };
        }
        isDraw = true;
      } else {
        winnerId =
          data.side1Score > data.side2Score ? participant1Id : participant2Id;
      }
    } else {
      if (!data.winningSide) {
        return { error: "Winner selection is required" };
      }
      if (data.winningSide === "draw") {
        if (!isSwiss) {
          return { error: "Draws are not allowed in this tournament type" };
        }
        isDraw = true;
      } else {
        winnerId =
          data.winningSide === "side1" ? participant1Id : participant2Id;
      }
    }

    const realMatch = await dbCreateMatch(
      {
        leagueId: tournamentData.leagueId,
        gameTypeId: tournamentData.gameTypeId,
        status: MatchStatus.COMPLETED,
        playedAt: data.playedAt,
        recorderId: userId,
      },
      tx,
    );

    const p1 = await dbGetParticipantById(participant1Id, tx);
    const p2 = await dbGetParticipantById(participant2Id, tx);

    if (!p1 || !p2) {
      return { error: "Participant not found" };
    }

    if (isDraw) {
      const matchParticipants: Omit<NewMatchParticipant, "id" | "createdAt">[] =
        [
          {
            matchId: realMatch.id,
            userId: p1.userId,
            teamId: p1.teamId,
            placeholderMemberId: p1.placeholderMemberId,
            side: 1,
            score: data.side1Score ?? null,
            result: MatchResult.DRAW,
            rank: null,
            isChallenged: null,
          },
          {
            matchId: realMatch.id,
            userId: p2.userId,
            teamId: p2.teamId,
            placeholderMemberId: p2.placeholderMemberId,
            side: 2,
            score: data.side2Score ?? null,
            result: MatchResult.DRAW,
            rank: null,
            isChallenged: null,
          },
        ];

      await dbCreateMatchParticipants(matchParticipants, tx);
      await updateEloRatingsForMatch(realMatch.id, tx);

      await dbUpdateRoundMatch(
        roundMatch.id,
        { isDraw: true, matchId: realMatch.id },
        tx,
      );
    } else {
      const loserId =
        winnerId === participant1Id ? participant2Id : participant1Id;
      const winner = winnerId === participant1Id ? p1 : p2;
      const loser = winnerId === participant1Id ? p2 : p1;
      const winnerIsP1 = winnerId === participant1Id;

      const matchParticipants: Omit<NewMatchParticipant, "id" | "createdAt">[] =
        [
          {
            matchId: realMatch.id,
            userId: winner.userId,
            teamId: winner.teamId,
            placeholderMemberId: winner.placeholderMemberId,
            side: winnerIsP1 ? 1 : 2,
            score: winnerIsP1
              ? (data.side1Score ?? null)
              : (data.side2Score ?? null),
            result: MatchResult.WIN,
            rank: null,
            isChallenged: null,
          },
          {
            matchId: realMatch.id,
            userId: loser.userId,
            teamId: loser.teamId,
            placeholderMemberId: loser.placeholderMemberId,
            side: winnerIsP1 ? 2 : 1,
            score: winnerIsP1
              ? (data.side2Score ?? null)
              : (data.side1Score ?? null),
            result: MatchResult.LOSS,
            rank: null,
            isChallenged: null,
          },
        ];

      await dbCreateMatchParticipants(matchParticipants, tx);
      await updateEloRatingsForMatch(realMatch.id, tx);

      await dbUpdateRoundMatch(
        roundMatch.id,
        { winnerId, matchId: realMatch.id },
        tx,
      );

      if (!isSwiss) {
        await dbUpdateParticipant(
          loserId,
          {
            isEliminated: true,
            eliminatedInRound: roundMatch.round,
          },
          tx,
        );
      }
    }

    if (isSwiss) {
      await handleSwissRoundCompletion(tournamentData, roundMatch.round, tx);
    } else {
      // Single elimination advancement logic
      const isFinal = !roundMatch.nextMatchId;
      if (isFinal && winnerId) {
        const loserId =
          winnerId === participant1Id ? participant2Id : participant1Id;
        await dbUpdateTournament(
          tournamentData.id,
          {
            status: TournamentStatus.COMPLETED,
            completedAt: new Date(),
          },
          tx,
        );

        await dbUpdateParticipant(winnerId, { finalPlacement: 1 }, tx);
        await dbUpdateParticipant(loserId, { finalPlacement: 2 }, tx);
      } else if (winnerId) {
        const updatedRoundMatch = await dbGetRoundMatchById(roundMatch.id, tx);
        if (updatedRoundMatch?.nextMatchId) {
          const nextMatch = await dbGetRoundMatchById(
            updatedRoundMatch.nextMatchId,
            tx,
          );
          if (nextMatch) {
            const slot = updatedRoundMatch.nextMatchSlot;
            if (slot === 1) {
              await dbUpdateRoundMatch(
                nextMatch.id,
                { participant1Id: winnerId },
                tx,
              );
            } else if (slot === 2) {
              await dbUpdateRoundMatch(
                nextMatch.id,
                { participant2Id: winnerId },
                tx,
              );
            }
          }
        }
      }
    }

    return {
      data: {
        matchId: realMatch.id,
        tournamentId: tournamentData.id,
        leagueId: tournamentData.leagueId,
      },
    };
  });
}

async function handleSwissRoundCompletion(
  tournamentData: Tournament,
  currentRound: number,
  tx: DBOrTx,
): Promise<void> {
  const roundMatches = await dbGetRoundMatchesByRound(
    tournamentData.id,
    currentRound,
    tx,
  );

  const allResolved = roundMatches.every(
    (m) => m.winnerId !== null || m.isDraw || m.isBye,
  );

  if (!allResolved) return;

  const isFinalRound =
    tournamentData.totalRounds !== null &&
    currentRound >= tournamentData.totalRounds;

  if (isFinalRound) {
    await completeSwissTournament(tournamentData, tx);
  } else {
    await generateNextSwissRoundInternal(tournamentData, currentRound, tx);
  }
}

async function completeSwissTournament(
  tournamentData: Tournament,
  tx: DBOrTx,
): Promise<void> {
  const participants = await dbGetParticipants(tournamentData.id, tx);
  const bracket = await dbGetBracket(tournamentData.id, tx);

  const participantNames = participants.map((p) => ({
    id: p.id,
    name:
      p.user?.name ??
      p.team?.name ??
      p.placeholderMember?.displayName ??
      "Unknown",
  }));

  const matchRecords: SwissMatchRecord[] = bracket.map((m) => ({
    participant1Id: m.participant1Id,
    participant2Id: m.participant2Id,
    winnerId: m.winnerId,
    isDraw: m.isDraw,
    isBye: m.isBye,
    isForfeit: m.isForfeit,
  }));

  const standings = computeSwissStandings(participantNames, matchRecords);
  const ranking = getSwissRanking(standings);

  for (let i = 0; i < ranking.length; i++) {
    await dbUpdateParticipant(
      ranking[i].participantId,
      { finalPlacement: i + 1 },
      tx,
    );
  }

  await dbUpdateTournament(
    tournamentData.id,
    {
      status: TournamentStatus.COMPLETED,
      completedAt: new Date(),
    },
    tx,
  );
}

async function generateNextSwissRoundInternal(
  tournamentData: Tournament,
  currentRound: number,
  tx: DBOrTx,
): Promise<void> {
  const participants = await dbGetParticipants(tournamentData.id, tx);
  const bracket = await dbGetBracket(tournamentData.id, tx);

  const participantNames = participants.map((p) => ({
    id: p.id,
    name:
      p.user?.name ??
      p.team?.name ??
      p.placeholderMember?.displayName ??
      "Unknown",
  }));

  const matchRecords: SwissMatchRecord[] = bracket.map((m) => ({
    participant1Id: m.participant1Id,
    participant2Id: m.participant2Id,
    winnerId: m.winnerId,
    isDraw: m.isDraw,
    isBye: m.isBye,
    isForfeit: m.isForfeit,
  }));

  const standings = computeSwissStandings(participantNames, matchRecords);
  const nextRound = generateSwissNextRound(standings);
  const newRoundNumber = currentRound + 1;

  const roundMatchData = nextRound.pairings.map((pairing, i) => ({
    tournamentId: tournamentData.id,
    round: newRoundNumber,
    position: i + 1,
    participant1Id: pairing.participant1Id,
    participant2Id: pairing.participant2Id as string | null,
    winnerId: null as string | null,
    matchId: null as string | null,
    isBye: false,
    isForfeit: false,
    isDraw: false,
    nextMatchId: null as string | null,
    nextMatchSlot: null as number | null,
  }));

  if (nextRound.byeParticipantId) {
    roundMatchData.push({
      tournamentId: tournamentData.id,
      round: newRoundNumber,
      position: roundMatchData.length + 1,
      participant1Id: nextRound.byeParticipantId,
      participant2Id: null,
      winnerId: nextRound.byeParticipantId,
      matchId: null as string | null,
      isBye: true,
      isForfeit: false,
      isDraw: false,
      nextMatchId: null as string | null,
      nextMatchSlot: null as number | null,
    });
  }

  await dbCreateRoundMatches(roundMatchData, tx);
}

export async function forfeitTournamentMatch(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const parsed = forfeitTournamentMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const roundMatch = await dbGetRoundMatchById(data.tournamentMatchId);
  if (!roundMatch) {
    return { error: "Tournament match not found" };
  }

  const tournamentData = await dbGetTournamentById(roundMatch.tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament is not in progress" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to manage tournament matches" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot manage tournaments while suspended" };
  }

  if (roundMatch.winnerId) {
    return { error: "This match already has a result" };
  }

  if (
    data.forfeitParticipantId !== roundMatch.participant1Id &&
    data.forfeitParticipantId !== roundMatch.participant2Id
  ) {
    return {
      error: "Forfeit participant must be one of the match participants",
    };
  }

  const winnerId =
    data.forfeitParticipantId === roundMatch.participant1Id
      ? roundMatch.participant2Id
      : roundMatch.participant1Id;

  if (!winnerId) {
    return { error: "Cannot forfeit when the other participant slot is empty" };
  }

  const isSwiss = tournamentData.tournamentType === TournamentType.SWISS;

  return withTransaction(async (tx) => {
    await dbUpdateRoundMatch(roundMatch.id, { winnerId, isForfeit: true }, tx);

    if (!isSwiss) {
      await dbUpdateParticipant(
        data.forfeitParticipantId,
        {
          isEliminated: true,
          eliminatedInRound: roundMatch.round,
        },
        tx,
      );

      const isFinal = !roundMatch.nextMatchId;
      if (isFinal) {
        await dbUpdateTournament(
          tournamentData.id,
          {
            status: TournamentStatus.COMPLETED,
            completedAt: new Date(),
          },
          tx,
        );
        await dbUpdateParticipant(winnerId, { finalPlacement: 1 }, tx);
        await dbUpdateParticipant(
          data.forfeitParticipantId,
          { finalPlacement: 2 },
          tx,
        );
      } else {
        const updatedRoundMatch = await dbGetRoundMatchById(roundMatch.id, tx);
        if (updatedRoundMatch?.nextMatchId) {
          const nextMatch = await dbGetRoundMatchById(
            updatedRoundMatch.nextMatchId,
            tx,
          );
          if (nextMatch) {
            const slot = updatedRoundMatch.nextMatchSlot;
            if (slot === 1) {
              await dbUpdateRoundMatch(
                nextMatch.id,
                { participant1Id: winnerId },
                tx,
              );
            } else if (slot === 2) {
              await dbUpdateRoundMatch(
                nextMatch.id,
                { participant2Id: winnerId },
                tx,
              );
            }
          }
        }
      }
    } else {
      await handleSwissRoundCompletion(tournamentData, roundMatch.round, tx);
    }

    return {
      data: {
        tournamentId: tournamentData.id,
        leagueId: tournamentData.leagueId,
      },
    };
  });
}

export type TournamentFullDetails = TournamentWithDetails & {
  bracket: TournamentRoundMatchWithDetails[];
  participants: TournamentParticipantWithDetails[];
};

export async function getTournament(
  userId: string,
  tournamentId: string,
): Promise<ServiceResult<TournamentFullDetails>> {
  const tournamentData = await dbGetTournamentWithDetails(tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const [bracket, participants] = await Promise.all([
    dbGetBracket(tournamentId),
    dbGetParticipants(tournamentId),
  ]);

  return {
    data: {
      ...tournamentData,
      bracket,
      participants,
    },
  };
}

export async function getLeagueTournaments(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<TournamentWithDetails[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const tournaments = await dbGetTournamentsByLeagueId(leagueId);
  return { data: tournaments };
}

export async function getLeagueTournamentsPaginated(
  userId: string,
  leagueId: string,
  options: {
    statuses: TournamentStatus[];
    limit?: number;
    offset?: number;
  },
): Promise<ServiceResult<PaginatedResult<TournamentWithDetails>>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const limit = options.limit ?? DEFAULT_ITEMS_PER_PAGE;
  const offset = options.offset ?? 0;

  const [items, total] = await Promise.all([
    dbGetTournamentsByLeagueId(leagueId, {
      statuses: options.statuses,
      limit,
      offset,
    }),
    dbCountTournamentsByStatus(leagueId, options.statuses),
  ]);

  return { data: { items, total, limit, offset } };
}

export async function generateNextSwissRound(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ tournamentId: string; leagueId: string }>> {
  const parsed = generateNextSwissRoundSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { tournamentId } = parsed.data;

  const tournamentData = await dbGetTournamentById(tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.tournamentType !== TournamentType.SWISS) {
    return { error: "This action is only for Swiss tournaments" };
  }

  if (tournamentData.status !== TournamentStatus.IN_PROGRESS) {
    return { error: "Tournament is not in progress" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to manage tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot manage tournaments while suspended" };
  }

  // Find the current round number
  const bracket = await dbGetBracket(tournamentId);
  if (bracket.length === 0) {
    return { error: "No rounds exist yet" };
  }

  const currentRound = Math.max(...bracket.map((m) => m.round));

  // Check all matches in current round are resolved
  const roundMatches = bracket.filter((m) => m.round === currentRound);
  const allResolved = roundMatches.every(
    (m) => m.winnerId !== null || m.isDraw || m.isBye,
  );

  if (!allResolved) {
    return {
      error: "All matches in the current round must be completed first",
    };
  }

  if (
    tournamentData.totalRounds !== null &&
    currentRound >= tournamentData.totalRounds
  ) {
    return { error: "All rounds have been completed" };
  }

  return withTransaction(async (tx) => {
    await generateNextSwissRoundInternal(tournamentData, currentRound, tx);

    return {
      data: {
        tournamentId: tournamentData.id,
        leagueId: tournamentData.leagueId,
      },
    };
  });
}

export async function deleteTournament(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ leagueId: string }>> {
  const parsed = tournamentIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { tournamentId } = parsed.data;

  const tournamentData = await dbGetTournamentById(tournamentId);
  if (!tournamentData) {
    return { error: "Tournament not found" };
  }

  if (tournamentData.status !== TournamentStatus.DRAFT) {
    return { error: "Only draft tournaments can be deleted" };
  }

  const membership = await getLeagueMember(userId, tournamentData.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TOURNAMENTS)) {
    return { error: "You do not have permission to delete tournaments" };
  }

  if (isSuspended(membership)) {
    return { error: "You cannot delete tournaments while suspended" };
  }

  await dbDeleteTournament(tournamentId);

  return { data: { leagueId: tournamentData.leagueId } };
}
