import { getGameTypeById } from "@/db/game-types";
import { getLeagueMember } from "@/db/league-members";
import { createMatch, createMatchParticipants } from "@/db/matches";
import {
  bulkUpdateParticipantSeeds,
  checkParticipantInTournament,
  checkTournamentNameExists,
  countTournamentParticipants,
  countTournamentsByLeagueId,
  createTournamentRoundMatches,
  addTournamentParticipant as dbAddParticipant,
  createTournament as dbCreateTournament,
  deleteTournament as dbDeleteTournament,
  removeTournamentParticipant as dbRemoveParticipant,
  updateTournament as dbUpdateTournament,
  getTournamentBracket,
  getTournamentById,
  getTournamentParticipantById,
  getTournamentParticipants,
  getTournamentRoundMatchById,
  getTournamentWithDetails,
  getTournamentsByLeagueId,
  updateTournamentParticipant,
  updateTournamentRoundMatch,
} from "@/db/tournaments";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "./test-helpers";
import {
  addTournamentParticipant,
  createTournament,
  deleteTournament,
  forfeitTournamentMatch,
  generateBracket,
  getLeagueTournaments,
  getTournament,
  recordTournamentMatchResult,
  removeTournamentParticipant,
  setParticipantSeeds,
  updateTournament,
} from "./tournaments";

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((cb: (tx: object) => Promise<unknown>) => cb({})),
}));

vi.mock("@/db/game-types", () => ({
  getGameTypeById: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
}));

vi.mock("@/db/matches", () => ({
  createMatch: vi.fn(),
  createMatchParticipants: vi.fn(),
}));

vi.mock("@/db/placeholder-members", () => ({
  getPlaceholderMemberById: vi.fn(),
}));

vi.mock("@/db/teams", () => ({
  getTeamById: vi.fn(),
}));

vi.mock("@/db/tournaments", () => ({
  createTournament: vi.fn(),
  getTournamentById: vi.fn(),
  getTournamentWithDetails: vi.fn(),
  getTournamentsByLeagueId: vi.fn(),
  updateTournament: vi.fn(),
  checkTournamentNameExists: vi.fn(),
  countTournamentsByLeagueId: vi.fn(),
  deleteTournament: vi.fn(),
  addTournamentParticipant: vi.fn(),
  removeTournamentParticipant: vi.fn(),
  getTournamentParticipants: vi.fn(),
  getTournamentParticipantById: vi.fn(),
  bulkUpdateParticipantSeeds: vi.fn(),
  updateTournamentParticipant: vi.fn(),
  countTournamentParticipants: vi.fn(),
  checkParticipantInTournament: vi.fn(),
  createTournamentRoundMatches: vi.fn(),
  getTournamentBracket: vi.fn(),
  getTournamentRoundMatchById: vi.fn(),
  updateTournamentRoundMatch: vi.fn(),
  getTournamentRoundMatchByPosition: vi.fn(),
}));

vi.mock("./elo-ratings", () => ({
  updateEloRatingsForMatch: vi.fn(() => ({ data: undefined })),
}));

function mockMember(role = "manager", suspended = false) {
  vi.mocked(getLeagueMember).mockResolvedValue({
    id: TEST_IDS.MEMBER_ID,
    userId: TEST_IDS.USER_ID,
    leagueId: TEST_IDS.LEAGUE_ID,
    role,
    joinedAt: new Date(),
    suspendedUntil: suspended ? new Date(Date.now() + 1000 * 60 * 60) : null,
  } as ReturnType<typeof getLeagueMember> extends Promise<infer T>
    ? NonNullable<T>
    : never);
}

function mockGameType(overrides = {}) {
  vi.mocked(getGameTypeById).mockResolvedValue({
    id: TEST_IDS.GAME_TYPE_ID,
    leagueId: TEST_IDS.LEAGUE_ID,
    name: "Ping Pong",
    description: null,
    logo: null,
    category: "head_to_head",
    config:
      '{"scoringType":"win_loss","drawsAllowed":false,"minPlayersPerSide":1,"maxPlayersPerSide":1}',
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function mockTournament(overrides = {}) {
  const t = {
    id: TEST_IDS.TOURNAMENT_ID,
    leagueId: TEST_IDS.LEAGUE_ID,
    gameTypeId: TEST_IDS.GAME_TYPE_ID,
    name: "Test Tournament",
    description: null,
    logo: null,
    tournamentType: "single_elimination",
    status: "draft",
    participantType: "individual",
    seedingType: "random",
    bestOf: 1,
    totalRounds: null,
    startDate: null,
    completedAt: null,
    isArchived: false,
    createdById: TEST_IDS.USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  vi.mocked(getTournamentById).mockResolvedValue(
    t as ReturnType<typeof getTournamentById> extends Promise<infer T>
      ? NonNullable<T>
      : never,
  );
  return t;
}

function mockParticipants(count: number) {
  const participants = Array.from({ length: count }, (_, i) => ({
    id: `b33e4567-e89b-12d3-a456-42661417400${i}`,
    tournamentId: TEST_IDS.TOURNAMENT_ID,
    userId: `323e4567-e89b-12d3-a456-42661417400${i}`,
    teamId: null,
    placeholderMemberId: null,
    seed: null,
    isEliminated: false,
    eliminatedInRound: null,
    finalPlacement: null,
    createdAt: new Date(),
    user: {
      id: `323e4567-e89b-12d3-a456-42661417400${i}`,
      name: `User ${i}`,
      username: `user${i}`,
      image: null,
    },
    team: null,
    placeholderMember: null,
  }));
  vi.mocked(getTournamentParticipants).mockResolvedValue(
    participants as ReturnType<
      typeof getTournamentParticipants
    > extends Promise<infer T>
      ? T
      : never,
  );
  return participants;
}

describe("createTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await createTournament(TEST_IDS.USER_ID, { name: "" });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error for non-member", async () => {
    vi.mocked(getLeagueMember).mockResolvedValue(undefined);
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.error).toBe("You are not a member of this league");
  });

  it("returns error for member role (no permission)", async () => {
    mockMember("member");
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.error).toBe(
      "You do not have permission to create tournaments",
    );
  });

  it("returns error for suspended user", async () => {
    mockMember("manager", true);
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.error).toBe("You cannot create tournaments while suspended");
  });

  it("returns error for non-H2H game type", async () => {
    mockMember();
    mockGameType({ category: "free_for_all" });
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.error).toBe(
      "Tournaments are only supported for head-to-head game types",
    );
  });

  it("returns error for archived game type", async () => {
    mockMember();
    mockGameType({ isArchived: true });
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.error).toBe(
      "Cannot create a tournament with an archived game type",
    );
  });

  it("returns error for duplicate name", async () => {
    mockMember();
    mockGameType();
    vi.mocked(checkTournamentNameExists).mockResolvedValue(true);
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.fieldErrors?.name).toBe(
      "A tournament with this name already exists",
    );
  });

  it("returns error when tournament limit reached", async () => {
    mockMember();
    mockGameType();
    vi.mocked(checkTournamentNameExists).mockResolvedValue(false);
    vi.mocked(countTournamentsByLeagueId).mockResolvedValue(20);
    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.error).toContain("maximum");
  });

  it("creates tournament successfully", async () => {
    mockMember();
    mockGameType();
    vi.mocked(checkTournamentNameExists).mockResolvedValue(false);
    vi.mocked(countTournamentsByLeagueId).mockResolvedValue(0);
    vi.mocked(dbCreateTournament).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ID,
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      description: null,
      logo: null,
      tournamentType: "single_elimination",
      status: "draft",
      participantType: "individual",
      seedingType: "random",
      bestOf: 1,
      totalRounds: null,
      startDate: null,
      completedAt: null,
      isArchived: false,
      createdById: TEST_IDS.USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof dbCreateTournament> extends Promise<infer T>
      ? T
      : never);

    const result = await createTournament(TEST_IDS.USER_ID, {
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      name: "Test",
      participantType: "individual",
      seedingType: "random",
    });
    expect(result.data?.name).toBe("Test");
  });
});

describe("addTournamentParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when tournament not in draft", async () => {
    mockTournament({ status: "in_progress" });
    mockMember();
    const result = await addTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });
    expect(result.error).toBe(
      "Can only add participants to tournaments in draft status",
    );
  });

  it("returns error for duplicate participant", async () => {
    mockTournament();
    mockMember();
    vi.mocked(getLeagueMember).mockResolvedValue({
      id: TEST_IDS.MEMBER_ID,
      userId: TEST_IDS.USER_ID,
      leagueId: TEST_IDS.LEAGUE_ID,
      role: "manager",
      joinedAt: new Date(),
      suspendedUntil: null,
    } as ReturnType<typeof getLeagueMember> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(checkParticipantInTournament).mockResolvedValue(true);
    const result = await addTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });
    expect(result.error).toBe("This participant is already in the tournament");
  });

  it("returns error when max participants reached", async () => {
    mockTournament();
    mockMember();
    vi.mocked(checkParticipantInTournament).mockResolvedValue(false);
    vi.mocked(countTournamentParticipants).mockResolvedValue(64);
    const result = await addTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });
    expect(result.error).toContain("maximum");
  });

  it("adds participant successfully", async () => {
    mockTournament();
    mockMember();
    vi.mocked(checkParticipantInTournament).mockResolvedValue(false);
    vi.mocked(countTournamentParticipants).mockResolvedValue(1);
    vi.mocked(dbAddParticipant).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID_2,
      teamId: null,
      placeholderMemberId: null,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
      createdAt: new Date(),
    } as ReturnType<typeof dbAddParticipant> extends Promise<infer T>
      ? T
      : never);

    const result = await addTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });
    expect(result.data?.id).toBe(TEST_IDS.TOURNAMENT_PARTICIPANT_ID);
  });

  it("returns error when adding team to individual tournament", async () => {
    mockTournament({ participantType: "individual" });
    mockMember();
    const result = await addTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      teamId: TEST_IDS.TEAM_ID,
    });
    expect(result.error).toBe(
      "This tournament is for individual participants, not teams",
    );
  });
});

describe("generateBracket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not enough participants", async () => {
    mockTournament();
    mockMember();
    mockParticipants(1);
    const result = await generateBracket(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.error).toContain("At least");
  });

  it("returns error when tournament not in draft", async () => {
    mockTournament({ status: "in_progress" });
    mockMember();
    const result = await generateBracket(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.error).toBe(
      "Bracket can only be generated for draft tournaments",
    );
  });

  it("returns error when manual seeds not assigned", async () => {
    mockTournament({ seedingType: "manual" });
    mockMember();
    mockParticipants(4);
    const result = await generateBracket(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.error).toBe("All participants must have seeds assigned");
  });

  it("generates bracket with random seeding", async () => {
    mockTournament({ seedingType: "random" });
    mockMember();
    mockParticipants(4);
    vi.mocked(createTournamentRoundMatches).mockImplementation(
      async (matches) =>
        matches.map((m, i) => ({
          ...m,
          id: `match-${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as ReturnType<typeof createTournamentRoundMatches> extends Promise<
          infer T
        >
          ? T
          : never,
    );
    vi.mocked(updateTournamentRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof updateTournamentRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateTournament).mockResolvedValue(
      {} as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(bulkUpdateParticipantSeeds).mockResolvedValue(undefined);

    const result = await generateBracket(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.data?.tournamentId).toBe(TEST_IDS.TOURNAMENT_ID);
    expect(result.data?.leagueId).toBe(TEST_IDS.LEAGUE_ID);
  });

  it("advances bye winners to the next round", async () => {
    mockTournament({ seedingType: "random" });
    mockMember();
    mockParticipants(3);

    const updateCalls: {
      id: string;
      data: Record<string, unknown>;
    }[] = [];

    vi.mocked(createTournamentRoundMatches).mockImplementation(
      async (matches) =>
        matches.map((m, i) => ({
          ...m,
          id: `match-${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as ReturnType<typeof createTournamentRoundMatches> extends Promise<
          infer T
        >
          ? T
          : never,
    );
    vi.mocked(updateTournamentRoundMatch).mockImplementation(
      async (id, data) => {
        updateCalls.push({ id, data: data as Record<string, unknown> });
        return undefined as unknown as ReturnType<
          typeof updateTournamentRoundMatch
        > extends Promise<infer T>
          ? NonNullable<T>
          : never;
      },
    );
    vi.mocked(dbUpdateTournament).mockResolvedValue(
      {} as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(bulkUpdateParticipantSeeds).mockResolvedValue(undefined);

    const result = await generateBracket(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.data?.tournamentId).toBe(TEST_IDS.TOURNAMENT_ID);

    const advanceCalls = updateCalls.filter(
      (c) => c.data.participant1Id || c.data.participant2Id,
    );
    expect(advanceCalls.length).toBeGreaterThan(0);
  });
});

describe("recordTournamentMatchResult", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when tournament not in progress", async () => {
    vi.mocked(getTournamentRoundMatchById).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      round: 1,
      position: 1,
      participant1Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
      participant2Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID_2,
      winnerId: null,
      matchId: null,
      isBye: false,
      isForfeit: false,
      nextMatchId: null,
      nextMatchSlot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof getTournamentRoundMatchById> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    mockTournament({ status: "draft" });

    const result = await recordTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      winnerId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
      playedAt: new Date(),
    });
    expect(result.error).toBe("Tournament is not in progress");
  });

  it("returns error when winningSide is missing for win/loss game type", async () => {
    vi.mocked(getTournamentRoundMatchById).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      round: 1,
      position: 1,
      participant1Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
      participant2Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID_2,
      winnerId: null,
      matchId: null,
      isBye: false,
      isForfeit: false,
      nextMatchId: null,
      nextMatchSlot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof getTournamentRoundMatchById> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    mockTournament({ status: "in_progress" });
    mockMember();
    mockGameType();

    const result = await recordTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      playedAt: new Date(),
    });
    expect(result.error).toBe("Winner selection is required");
  });

  it("records result and creates real match for final", async () => {
    vi.mocked(getTournamentRoundMatchById).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      round: 1,
      position: 1,
      participant1Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
      participant2Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID_2,
      winnerId: null,
      matchId: null,
      isBye: false,
      isForfeit: false,
      nextMatchId: null,
      nextMatchSlot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof getTournamentRoundMatchById> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    mockTournament({ status: "in_progress" });
    mockMember();
    mockGameType();
    vi.mocked(createMatch).mockResolvedValue({
      id: TEST_IDS.MATCH_ID,
      leagueId: TEST_IDS.LEAGUE_ID,
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
      status: "completed",
      playedAt: new Date(),
      recorderId: TEST_IDS.USER_ID,
      challengerId: null,
      challengedAt: null,
      acceptedAt: null,
      declinedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof createMatch> extends Promise<infer T> ? T : never);
    vi.mocked(createMatchParticipants).mockResolvedValue([]);
    vi.mocked(getTournamentParticipantById).mockImplementation(
      async (id) =>
        ({
          id,
          tournamentId: TEST_IDS.TOURNAMENT_ID,
          userId:
            id === TEST_IDS.TOURNAMENT_PARTICIPANT_ID
              ? TEST_IDS.USER_ID
              : TEST_IDS.USER_ID_2,
          teamId: null,
          placeholderMemberId: null,
          seed: 1,
          isEliminated: false,
          eliminatedInRound: null,
          finalPlacement: null,
          createdAt: new Date(),
        }) as ReturnType<typeof getTournamentParticipantById> extends Promise<
          infer T
        >
          ? NonNullable<T>
          : never,
    );
    vi.mocked(updateTournamentRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof updateTournamentRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(updateTournamentParticipant).mockResolvedValue(undefined);
    vi.mocked(dbUpdateTournament).mockResolvedValue(
      {} as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
        ? T
        : never,
    );

    const result = await recordTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.data?.matchId).toBe(TEST_IDS.MATCH_ID);
    expect(result.data?.tournamentId).toBe(TEST_IDS.TOURNAMENT_ID);
  });
});

describe("forfeitTournamentMatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("advances the other participant on forfeit", async () => {
    const nextMatchId = "c33e4567-e89b-12d3-a456-426614174099";
    vi.mocked(getTournamentRoundMatchById)
      .mockResolvedValueOnce({
        id: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
        tournamentId: TEST_IDS.TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: null,
        matchId: null,
        isBye: false,
        isForfeit: false,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof getTournamentRoundMatchById> extends Promise<
        infer T
      >
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
        tournamentId: TEST_IDS.TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID_2,
        matchId: null,
        isBye: false,
        isForfeit: true,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof getTournamentRoundMatchById> extends Promise<
        infer T
      >
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: nextMatchId,
        tournamentId: TEST_IDS.TOURNAMENT_ID,
        round: 2,
        position: 1,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
        matchId: null,
        isBye: false,
        isForfeit: false,
        nextMatchId: null,
        nextMatchSlot: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof getTournamentRoundMatchById> extends Promise<
        infer T
      >
        ? NonNullable<T>
        : never);

    mockTournament({ status: "in_progress" });
    mockMember();
    vi.mocked(updateTournamentRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof updateTournamentRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(updateTournamentParticipant).mockResolvedValue(undefined);

    const result = await forfeitTournamentMatch(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.TOURNAMENT_ROUND_MATCH_ID,
      forfeitParticipantId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.data?.tournamentId).toBe(TEST_IDS.TOURNAMENT_ID);
  });
});

describe("deleteTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not draft", async () => {
    mockTournament({ status: "in_progress" });
    mockMember();
    const result = await deleteTournament(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.error).toBe("Only draft tournaments can be deleted");
  });

  it("deletes successfully when in draft", async () => {
    mockTournament({ status: "draft" });
    mockMember();
    vi.mocked(dbDeleteTournament).mockResolvedValue(true);
    const result = await deleteTournament(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
    });
    expect(result.data?.leagueId).toBe(TEST_IDS.LEAGUE_ID);
  });
});

describe("getLeagueTournaments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error for non-member", async () => {
    vi.mocked(getLeagueMember).mockResolvedValue(undefined);
    const result = await getLeagueTournaments(
      TEST_IDS.USER_ID,
      TEST_IDS.LEAGUE_ID,
    );
    expect(result.error).toBe("You are not a member of this league");
  });

  it("returns tournaments for member", async () => {
    mockMember("member");
    vi.mocked(getTournamentsByLeagueId).mockResolvedValue([]);
    const result = await getLeagueTournaments(
      TEST_IDS.USER_ID,
      TEST_IDS.LEAGUE_ID,
    );
    expect(result.data).toEqual([]);
  });
});

describe("getTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error for non-member", async () => {
    vi.mocked(getTournamentWithDetails).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ID,
      leagueId: TEST_IDS.LEAGUE_ID,
    } as ReturnType<typeof getTournamentWithDetails> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(getLeagueMember).mockResolvedValue(undefined);
    const result = await getTournament(
      TEST_IDS.USER_ID,
      TEST_IDS.TOURNAMENT_ID,
    );
    expect(result.error).toBe("You are not a member of this league");
  });

  it("returns tournament with bracket for member", async () => {
    vi.mocked(getTournamentWithDetails).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ID,
      leagueId: TEST_IDS.LEAGUE_ID,
      name: "Test",
    } as ReturnType<typeof getTournamentWithDetails> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    mockMember("member");
    vi.mocked(getTournamentBracket).mockResolvedValue([]);
    vi.mocked(getTournamentParticipants).mockResolvedValue([]);
    const result = await getTournament(
      TEST_IDS.USER_ID,
      TEST_IDS.TOURNAMENT_ID,
    );
    expect(result.data?.name).toBe("Test");
    expect(result.data?.bracket).toEqual([]);
    expect(result.data?.participants).toEqual([]);
  });
});

describe("setParticipantSeeds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error for random seeding tournament", async () => {
    mockTournament({ seedingType: "random" });
    mockMember();
    const result = await setParticipantSeeds(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      seeds: [{ participantId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID, seed: 1 }],
    });
    expect(result.error).toBe(
      "Seeds can only be set for manually seeded tournaments",
    );
  });

  it("returns error when seed count doesnt match participant count", async () => {
    mockTournament({ seedingType: "manual" });
    mockMember();
    mockParticipants(3);
    const result = await setParticipantSeeds(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      seeds: [{ participantId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID, seed: 1 }],
    });
    expect(result.error).toContain("Must assign seeds to all");
  });
});

describe("removeTournamentParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not in draft", async () => {
    mockTournament({ status: "in_progress" });
    mockMember();
    const result = await removeTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      participantId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.error).toContain("draft status");
  });

  it("removes participant successfully", async () => {
    mockTournament();
    mockMember();
    vi.mocked(getTournamentParticipantById).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID_2,
      teamId: null,
      placeholderMemberId: null,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
      createdAt: new Date(),
    } as ReturnType<typeof getTournamentParticipantById> extends Promise<
      infer T
    >
      ? NonNullable<T>
      : never);
    vi.mocked(dbRemoveParticipant).mockResolvedValue(true);

    const result = await removeTournamentParticipant(TEST_IDS.USER_ID, {
      tournamentId: TEST_IDS.TOURNAMENT_ID,
      participantId: TEST_IDS.TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.data?.tournamentId).toBe(TEST_IDS.TOURNAMENT_ID);
  });
});

describe("updateTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows name and description updates when not in draft", async () => {
    mockTournament({ status: "in_progress" });
    mockMember();
    vi.mocked(checkTournamentNameExists).mockResolvedValue(false);
    vi.mocked(dbUpdateTournament).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ID,
      name: "New Name",
      description: "New description",
    } as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
      ? NonNullable<T>
      : never);

    const result = await updateTournament(
      TEST_IDS.USER_ID,
      { tournamentId: TEST_IDS.TOURNAMENT_ID },
      { name: "New Name", description: "New description" },
    );
    expect(result.data?.name).toBe("New Name");
  });

  it("returns error for draft-only fields when not in draft", async () => {
    mockTournament({ status: "in_progress" });
    mockMember();
    const result = await updateTournament(
      TEST_IDS.USER_ID,
      { tournamentId: TEST_IDS.TOURNAMENT_ID },
      { seedingType: "manual" },
    );
    expect(result.error).toBe(
      "Only name, description, and icon can be edited after the tournament has started",
    );
  });

  it("updates successfully", async () => {
    mockTournament();
    mockMember();
    vi.mocked(checkTournamentNameExists).mockResolvedValue(false);
    vi.mocked(dbUpdateTournament).mockResolvedValue({
      id: TEST_IDS.TOURNAMENT_ID,
      name: "New Name",
    } as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
      ? NonNullable<T>
      : never);

    const result = await updateTournament(
      TEST_IDS.USER_ID,
      { tournamentId: TEST_IDS.TOURNAMENT_ID },
      { name: "New Name" },
    );
    expect(result.data?.name).toBe("New Name");
  });
});
