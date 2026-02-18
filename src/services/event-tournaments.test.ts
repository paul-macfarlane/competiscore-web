import {
  addEventTournamentParticipant as dbAddParticipant,
  addEventTournamentParticipantMembers as dbAddParticipantMembers,
  bulkUpdateEventParticipantSeeds as dbBulkUpdateSeeds,
  checkIndividualInEventTournamentPartnership as dbCheckIndividualInPartnership,
  checkIndividualInEventTournament as dbCheckIndividualInTournament,
  checkEventTournamentNameExists as dbCheckNameExists,
  countEventTournamentParticipants as dbCountParticipants,
  countEventTournamentsByEventId as dbCountTournaments,
  createEventTournamentRoundMatches as dbCreateRoundMatches,
  createEventTournament as dbCreateTournament,
  deleteEventTournament as dbDeleteTournament,
  getEventTournamentBracket as dbGetBracket,
  getEventTournamentParticipantById as dbGetParticipantById,
  getEventTournamentParticipants as dbGetParticipants,
  getEventTournamentRoundMatchById as dbGetRoundMatchById,
  getEventTournamentById as dbGetTournamentById,
  getEventTournamentWithDetails as dbGetTournamentWithDetails,
  getEventTournamentsByEventId as dbGetTournamentsByEventId,
  removeEventTournamentParticipant as dbRemoveParticipant,
  updateEventTournamentParticipant as dbUpdateParticipant,
  updateEventTournamentRoundMatch as dbUpdateRoundMatch,
  updateEventTournament as dbUpdateTournament,
} from "@/db/event-tournaments";
import {
  createEventMatch,
  createEventMatchParticipants,
  createEventPointEntries,
  deleteEventMatch,
  deleteEventMatchesForTournament,
  getEventGameTypeById,
  getEventMatchesByRoundMatchId,
  getEventParticipant,
  getTeamForPlaceholder,
  getTeamForUser,
} from "@/db/events";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addEventTournamentParticipant,
  addEventTournamentPartnership,
  createEventTournament,
  deleteEventTournament,
  forfeitEventTournamentMatch,
  generateEventBracket,
  getEventTournament,
  getEventTournaments,
  recordEventTournamentMatchResult,
  removeEventTournamentParticipant,
  setEventParticipantSeeds,
  undoEventTournamentMatchResult,
  updateEventTournament,
} from "./event-tournaments";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((cb: (tx: object) => Promise<unknown>) => cb({})),
  db: {},
}));

vi.mock("@/db/events", () => ({
  getEventParticipant: vi.fn(),
  getEventGameTypeById: vi.fn(),
  getTeamForUser: vi.fn(),
  getTeamForPlaceholder: vi.fn(),
  createEventMatch: vi.fn(),
  createEventMatchParticipants: vi.fn(),
  createEventPointEntries: vi.fn(),
  getEventMatchesByRoundMatchId: vi.fn(),
  deleteEventMatch: vi.fn(),
  deleteEventMatchesForTournament: vi.fn(),
  deleteEventPointEntriesForTournament: vi.fn(),
}));

const PARTNERSHIP_H2H_CONFIG = JSON.stringify({
  scoringType: "win_loss",
  drawsAllowed: false,
  participantType: "individual",
  minPlayersPerSide: 2,
  maxPlayersPerSide: 2,
});

vi.mock("@/db/event-tournaments", () => ({
  createEventTournament: vi.fn(),
  getEventTournamentById: vi.fn(),
  getEventTournamentWithDetails: vi.fn(),
  getEventTournamentsByEventId: vi.fn(),
  updateEventTournament: vi.fn(),
  deleteEventTournament: vi.fn(),
  checkEventTournamentNameExists: vi.fn(),
  countEventTournamentsByEventId: vi.fn(),
  addEventTournamentParticipant: vi.fn(),
  addEventTournamentParticipantMembers: vi.fn(),
  removeEventTournamentParticipant: vi.fn(),
  getEventTournamentParticipants: vi.fn(),
  getEventTournamentParticipantById: vi.fn(),
  getEventTournamentParticipantMembers: vi.fn().mockResolvedValue([]),
  bulkUpdateEventParticipantSeeds: vi.fn(),
  updateEventTournamentParticipant: vi.fn(),
  countEventTournamentParticipants: vi.fn(),
  checkIndividualInEventTournament: vi.fn(),
  checkIndividualInEventTournamentPartnership: vi.fn(),
  createEventTournamentRoundMatches: vi.fn(),
  getEventTournamentBracket: vi.fn(),
  getEventTournamentRoundMatchById: vi.fn(),
  updateEventTournamentRoundMatch: vi.fn(),
  getEventTournamentRoundMatchByPosition: vi.fn(),
}));

vi.mock("@/lib/shared/bracket-generator", () => ({
  generateSingleEliminationBracket: vi.fn(() => [
    {
      round: 1,
      position: 1,
      seed1: 1,
      seed2: 4,
      isBye: false,
      nextPosition: { round: 2, position: 1, slot: 1 },
    },
    {
      round: 1,
      position: 2,
      seed1: 2,
      seed2: 3,
      isBye: false,
      nextPosition: { round: 2, position: 1, slot: 2 },
    },
    {
      round: 2,
      position: 1,
      seed1: null,
      seed2: null,
      isBye: false,
      nextPosition: null,
    },
  ]),
}));

const H2H_CONFIG = JSON.stringify({
  scoringType: "win_loss",
  drawsAllowed: false,
  participantType: "individual",
  minPlayersPerSide: 1,
  maxPlayersPerSide: 1,
});

function mockOrganizerMember() {
  vi.mocked(getEventParticipant).mockResolvedValue({
    id: TEST_IDS.EVENT_MEMBER_ID,
    eventId: TEST_IDS.EVENT_ID,
    userId: TEST_IDS.USER_ID,
    role: "organizer",
    joinedAt: new Date(),
  } as ReturnType<typeof getEventParticipant> extends Promise<infer T>
    ? NonNullable<T>
    : never);
}

function mockParticipantMember() {
  vi.mocked(getEventParticipant).mockResolvedValue({
    id: TEST_IDS.EVENT_MEMBER_ID,
    eventId: TEST_IDS.EVENT_ID,
    userId: TEST_IDS.USER_ID,
    role: "participant",
    joinedAt: new Date(),
  } as ReturnType<typeof getEventParticipant> extends Promise<infer T>
    ? NonNullable<T>
    : never);
}

function mockH2HGameType(overrides = {}) {
  vi.mocked(getEventGameTypeById).mockResolvedValue({
    id: TEST_IDS.EVENT_GAME_TYPE_ID,
    eventId: TEST_IDS.EVENT_ID,
    name: "Ping Pong",
    description: null,
    logo: null,
    category: "head_to_head",
    config: H2H_CONFIG,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ReturnType<typeof getEventGameTypeById> extends Promise<infer T>
    ? NonNullable<T>
    : never);
}

function mockTournament(overrides = {}) {
  const t = {
    id: TEST_IDS.EVENT_TOURNAMENT_ID,
    eventId: TEST_IDS.EVENT_ID,
    eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    name: "Test Tournament",
    description: null,
    logo: null,
    tournamentType: "single_elimination",
    status: "draft",
    seedingType: "random",
    bestOf: 1,
    roundBestOf: null,
    participantType: "individual",
    placementPointConfig: null,
    totalRounds: null,
    startDate: null,
    completedAt: null,
    createdById: TEST_IDS.USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  vi.mocked(dbGetTournamentById).mockResolvedValue(
    t as ReturnType<typeof dbGetTournamentById> extends Promise<infer T>
      ? NonNullable<T>
      : never,
  );
  return t;
}

function mockInProgressTournament(overrides = {}) {
  return mockTournament({ status: "in_progress", ...overrides });
}

function mockParticipants(count: number) {
  const participants = Array.from({ length: count }, (_, i) => ({
    id: `b53e4567-e89b-12d3-a456-42661417400${i}`,
    eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    eventTeamId: `a43e4567-e89b-12d3-a456-42661417400${i}`,
    seed: null,
    isEliminated: false,
    eliminatedInRound: null,
    finalPlacement: null,
    createdAt: new Date(),
    team: {
      id: `a43e4567-e89b-12d3-a456-42661417400${i}`,
      name: `Team ${i}`,
      logo: null,
    },
  }));
  vi.mocked(dbGetParticipants).mockResolvedValue(
    participants as ReturnType<typeof dbGetParticipants> extends Promise<
      infer T
    >
      ? T
      : never,
  );
  return participants;
}

function mockRoundMatch(overrides = {}) {
  const rm = {
    id: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
    eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    round: 1,
    position: 1,
    participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    participant2Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
    winnerId: null,
    eventMatchId: null,
    isBye: false,
    isForfeit: false,
    participant1Score: null,
    participant2Score: null,
    participant1Wins: 0,
    participant2Wins: 0,
    nextMatchId: null,
    nextMatchSlot: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  vi.mocked(dbGetRoundMatchById).mockResolvedValue(
    rm as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
      ? NonNullable<T>
      : never,
  );
  return rm;
}

// =================== createEventTournament ===================

describe("createEventTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      name: "",
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when not a member", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue(undefined);
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when not organizer", async () => {
    mockParticipantMember();
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.error).toBe(
      "You do not have permission to create tournaments",
    );
  });

  it("returns error when game type not found", async () => {
    mockOrganizerMember();
    vi.mocked(getEventGameTypeById).mockResolvedValue(undefined);
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.error).toBe("Game type not found in this event");
  });

  it("returns error when game type is not H2H", async () => {
    mockOrganizerMember();
    mockH2HGameType({ category: "free_for_all" });
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.error).toBe(
      "Tournaments are only supported for head-to-head game types",
    );
  });

  it("returns error for duplicate name", async () => {
    mockOrganizerMember();
    mockH2HGameType();
    vi.mocked(dbCheckNameExists).mockResolvedValue(true);
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.fieldErrors?.name).toBe(
      "A tournament with this name already exists",
    );
  });

  it("returns error when tournament limit reached", async () => {
    mockOrganizerMember();
    mockH2HGameType();
    vi.mocked(dbCheckNameExists).mockResolvedValue(false);
    vi.mocked(dbCountTournaments).mockResolvedValue(20);
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.error).toContain("maximum");
  });

  it("creates tournament successfully", async () => {
    mockOrganizerMember();
    mockH2HGameType();
    vi.mocked(dbCheckNameExists).mockResolvedValue(false);
    vi.mocked(dbCountTournaments).mockResolvedValue(0);
    vi.mocked(dbCreateTournament).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventId: TEST_IDS.EVENT_ID,
      eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      description: null,
      logo: null,
      tournamentType: "single_elimination",
      status: "draft",
      seedingType: "random",
      bestOf: 1,
      placementPointConfig: null,
      totalRounds: null,
      startDate: null,
      completedAt: null,
      createdById: TEST_IDS.USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof dbCreateTournament> extends Promise<infer T>
      ? T
      : never);

    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test",
      seedingType: "random",
    });
    expect(result.data?.name).toBe("Test");
  });
});

// =================== updateEventTournament ===================

describe("updateEventTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when tournament not found", async () => {
    vi.mocked(dbGetTournamentById).mockResolvedValue(undefined);
    const result = await updateEventTournament(
      TEST_IDS.USER_ID,
      { eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID },
      { name: "New Name" },
    );
    expect(result.error).toBe("Tournament not found");
  });

  it("returns error when not organizer", async () => {
    mockTournament();
    mockParticipantMember();
    const result = await updateEventTournament(
      TEST_IDS.USER_ID,
      { eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID },
      { name: "New Name" },
    );
    expect(result.error).toBe("You do not have permission to edit tournaments");
  });

  it("returns error for draft-only fields on non-draft tournament", async () => {
    mockTournament({ status: "in_progress" });
    mockOrganizerMember();
    const result = await updateEventTournament(
      TEST_IDS.USER_ID,
      { eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID },
      { seedingType: "manual" },
    );
    expect(result.error).toBe(
      "Only name, description, and icon can be edited after the tournament has started",
    );
  });

  it("updates tournament successfully", async () => {
    mockTournament();
    mockOrganizerMember();
    vi.mocked(dbCheckNameExists).mockResolvedValue(false);
    vi.mocked(dbUpdateTournament).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "New Name",
    } as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
      ? NonNullable<T>
      : never);

    const result = await updateEventTournament(
      TEST_IDS.USER_ID,
      { eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID },
      { name: "New Name" },
    );
    expect(result.data?.name).toBe("New Name");
  });
});

// =================== deleteEventTournament ===================

describe("deleteEventTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not organizer", async () => {
    mockTournament({ status: "draft" });
    mockParticipantMember();
    const result = await deleteEventTournament(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.error).toBe(
      "You do not have permission to delete tournaments",
    );
  });

  it("deletes draft tournament successfully", async () => {
    mockTournament({ status: "draft" });
    mockOrganizerMember();
    vi.mocked(deleteEventMatchesForTournament).mockResolvedValue(undefined);
    vi.mocked(dbDeleteTournament).mockResolvedValue(true);
    const result = await deleteEventTournament(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("deletes in-progress tournament successfully", async () => {
    mockTournament({ status: "in_progress" });
    mockOrganizerMember();
    vi.mocked(deleteEventMatchesForTournament).mockResolvedValue(undefined);
    vi.mocked(dbDeleteTournament).mockResolvedValue(true);
    const result = await deleteEventTournament(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("deletes completed tournament with placement points successfully", async () => {
    mockTournament({
      status: "completed",
      placementPointConfig: JSON.stringify([
        { placement: 1, points: 10 },
        { placement: 2, points: 5 },
      ]),
    });
    mockOrganizerMember();
    vi.mocked(deleteEventMatchesForTournament).mockResolvedValue(undefined);
    vi.mocked(dbDeleteTournament).mockResolvedValue(true);
    const result = await deleteEventTournament(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

// =================== getEventTournament ===================

describe("getEventTournament", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a member", async () => {
    vi.mocked(dbGetTournamentWithDetails).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventId: TEST_IDS.EVENT_ID,
    } as ReturnType<typeof dbGetTournamentWithDetails> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(getEventParticipant).mockResolvedValue(undefined);
    const result = await getEventTournament(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_TOURNAMENT_ID,
    );
    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns full details for member", async () => {
    vi.mocked(dbGetTournamentWithDetails).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Test",
    } as ReturnType<typeof dbGetTournamentWithDetails> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    mockOrganizerMember();
    vi.mocked(dbGetBracket).mockResolvedValue([]);
    vi.mocked(dbGetParticipants).mockResolvedValue([]);
    const result = await getEventTournament(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_TOURNAMENT_ID,
    );
    expect(result.data?.name).toBe("Test");
    expect(result.data?.bracket).toEqual([]);
    expect(result.data?.participants).toEqual([]);
  });
});

// =================== getEventTournaments ===================

describe("getEventTournaments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a member", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue(undefined);
    const result = await getEventTournaments(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_ID,
    );
    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns tournament list", async () => {
    mockOrganizerMember();
    vi.mocked(dbGetTournamentsByEventId).mockResolvedValue([]);
    const result = await getEventTournaments(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_ID,
    );
    expect(result.data).toEqual([]);
  });
});

// =================== addEventTournamentParticipant ===================

describe("addEventTournamentParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when tournament not draft", async () => {
    mockInProgressTournament();
    mockOrganizerMember();
    const result = await addEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID,
    });
    expect(result.error).toBe(
      "Can only add participants to tournaments in draft status",
    );
  });

  it("returns error when not organizer", async () => {
    mockTournament();
    mockParticipantMember();
    const result = await addEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID,
    });
    expect(result.error).toBe(
      "You do not have permission to manage tournaments",
    );
  });

  it("returns error when participant not on a team", async () => {
    mockTournament();
    mockOrganizerMember();
    vi.mocked(getTeamForUser).mockResolvedValue(undefined);
    const result = await addEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID,
    });
    expect(result.error).toBe("Participant is not on a team in this event");
  });

  it("returns error when participant already in tournament", async () => {
    mockTournament();
    mockOrganizerMember();
    vi.mocked(getTeamForUser).mockResolvedValue({
      id: TEST_IDS.EVENT_TEAM_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team 1",
      logo: null,
      createdAt: new Date(),
    } as ReturnType<typeof getTeamForUser> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(true);
    const result = await addEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID,
    });
    expect(result.error).toBe("This participant is already in the tournament");
  });

  it("returns error at max participants", async () => {
    mockTournament();
    mockOrganizerMember();
    vi.mocked(getTeamForUser).mockResolvedValue({
      id: TEST_IDS.EVENT_TEAM_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team 1",
      logo: null,
      createdAt: new Date(),
    } as ReturnType<typeof getTeamForUser> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCountParticipants).mockResolvedValue(64);
    const result = await addEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID,
    });
    expect(result.error).toContain("maximum");
  });

  it("adds participant successfully", async () => {
    mockTournament();
    mockOrganizerMember();
    vi.mocked(getTeamForUser).mockResolvedValue({
      id: TEST_IDS.EVENT_TEAM_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team 1",
      logo: null,
      createdAt: new Date(),
    } as ReturnType<typeof getTeamForUser> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCountParticipants).mockResolvedValue(1);
    vi.mocked(dbAddParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: TEST_IDS.USER_ID,
      eventPlaceholderParticipantId: null,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
      createdAt: new Date(),
    } as ReturnType<typeof dbAddParticipant> extends Promise<infer T>
      ? T
      : never);

    const result = await addEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      userId: TEST_IDS.USER_ID,
    });
    expect(result.data?.id).toBe(TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID);
  });
});

// =================== removeEventTournamentParticipant ===================

describe("removeEventTournamentParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not draft", async () => {
    mockInProgressTournament();
    mockOrganizerMember();
    const result = await removeEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      participantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.error).toContain("draft status");
  });

  it("returns error when not organizer", async () => {
    mockTournament();
    mockParticipantMember();
    const result = await removeEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      participantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.error).toBe(
      "You do not have permission to manage tournaments",
    );
  });

  it("removes participant successfully", async () => {
    mockTournament();
    mockOrganizerMember();
    vi.mocked(dbGetParticipantById).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
      createdAt: new Date(),
    } as ReturnType<typeof dbGetParticipantById> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(dbRemoveParticipant).mockResolvedValue(true);

    const result = await removeEventTournamentParticipant(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      participantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

// =================== setEventParticipantSeeds ===================

describe("setEventParticipantSeeds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not draft", async () => {
    mockInProgressTournament({ seedingType: "manual" });
    mockOrganizerMember();
    const result = await setEventParticipantSeeds(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      seeds: [
        {
          participantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
          seed: 1,
        },
      ],
    });
    expect(result.error).toBe(
      "Can only set seeds for tournaments in draft status",
    );
  });

  it("returns error when not manual seeding", async () => {
    mockTournament({ seedingType: "random" });
    mockOrganizerMember();
    const result = await setEventParticipantSeeds(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      seeds: [
        {
          participantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
          seed: 1,
        },
      ],
    });
    expect(result.error).toBe(
      "Seeds can only be set for manually seeded tournaments",
    );
  });

  it("returns error when seed count doesnt match participants", async () => {
    mockTournament({ seedingType: "manual" });
    mockOrganizerMember();
    mockParticipants(3);
    const result = await setEventParticipantSeeds(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      seeds: [
        {
          participantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
          seed: 1,
        },
      ],
    });
    expect(result.error).toContain("Must assign seeds to all");
  });

  it("sets seeds successfully", async () => {
    mockTournament({ seedingType: "manual" });
    mockOrganizerMember();
    const participants = mockParticipants(2);
    vi.mocked(dbBulkUpdateSeeds).mockResolvedValue(undefined);

    const result = await setEventParticipantSeeds(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      seeds: [
        { participantId: participants[0].id, seed: 1 },
        { participantId: participants[1].id, seed: 2 },
      ],
    });
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

// =================== generateEventBracket ===================

describe("generateEventBracket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not draft", async () => {
    mockInProgressTournament();
    mockOrganizerMember();
    const result = await generateEventBracket(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.error).toBe(
      "Bracket can only be generated for draft tournaments",
    );
  });

  it("returns error when less than 2 participants", async () => {
    mockTournament();
    mockOrganizerMember();
    mockParticipants(1);
    const result = await generateEventBracket(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.error).toContain("At least");
  });

  it("returns error when manual seeds not all assigned", async () => {
    mockTournament({ seedingType: "manual" });
    mockOrganizerMember();
    mockParticipants(4);
    const result = await generateEventBracket(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.error).toBe("All participants must have seeds assigned");
  });

  it("generates bracket successfully with random seeding", async () => {
    mockTournament({ seedingType: "random" });
    mockOrganizerMember();
    mockParticipants(4);
    vi.mocked(dbBulkUpdateSeeds).mockResolvedValue(undefined);
    vi.mocked(dbCreateRoundMatches).mockImplementation(
      async (matches) =>
        matches.map((m, i) => ({
          ...m,
          id: `match-${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as ReturnType<typeof dbCreateRoundMatches> extends Promise<infer T>
          ? T
          : never,
    );
    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateTournament).mockResolvedValue(
      {} as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
        ? T
        : never,
    );

    const result = await generateEventBracket(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    });
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

// =================== recordEventTournamentMatchResult ===================

describe("recordEventTournamentMatchResult", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when tournament not in progress", async () => {
    mockRoundMatch();
    mockTournament({ status: "draft" });

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.error).toBe("Tournament is not in progress");
  });

  it("returns error when series already decided", async () => {
    mockRoundMatch({ winnerId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID });
    mockInProgressTournament();
    mockOrganizerMember();

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.error).toBe("This match already has a result");
  });

  it("returns error when both participants not set", async () => {
    mockRoundMatch({ participant2Id: null });
    mockInProgressTournament();
    mockOrganizerMember();

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.error).toBe(
      "Both participants must be set before recording a result",
    );
  });

  it("returns error when winningSide missing for win/loss game type", async () => {
    mockRoundMatch();
    mockInProgressTournament();
    mockOrganizerMember();
    mockH2HGameType();

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      playedAt: new Date(),
    });
    expect(result.error).toBe("Winner selection is required");
  });

  it("records result successfully with match and advancement", async () => {
    const nextMatchId = "c53e4567-e89b-12d3-a456-426614174099";
    mockRoundMatch({ nextMatchId, nextMatchSlot: 1 });
    mockInProgressTournament();
    mockOrganizerMember();
    mockH2HGameType();

    vi.mocked(createEventMatch).mockResolvedValue({
      id: TEST_IDS.EVENT_MATCH_ID,
      eventId: TEST_IDS.EVENT_ID,
      eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(),
      recorderId: TEST_IDS.USER_ID,
      createdAt: new Date(),
    } as ReturnType<typeof createEventMatch> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(createEventMatchParticipants).mockResolvedValue([]);

    vi.mocked(dbGetParticipantById).mockImplementation(
      async (id) =>
        ({
          id,
          eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
          eventTeamId:
            id === TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID
              ? TEST_IDS.EVENT_TEAM_ID
              : TEST_IDS.EVENT_TEAM_ID_2,
          seed: 1,
          isEliminated: false,
          eliminatedInRound: null,
          finalPlacement: null,
          createdAt: new Date(),
        }) as ReturnType<typeof dbGetParticipantById> extends Promise<infer T>
          ? NonNullable<T>
          : never,
    );

    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateParticipant).mockResolvedValue(undefined);

    // After recording, the updated round match has the nextMatchId
    vi.mocked(dbGetRoundMatchById)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: null,
        eventMatchId: null,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        eventMatchId: TEST_IDS.EVENT_MATCH_ID,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: nextMatchId,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 2,
        position: 1,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
        eventMatchId: null,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId: null,
        nextMatchSlot: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never);

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.data?.eventMatchId).toBe(TEST_IDS.EVENT_MATCH_ID);
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("records final match result successfully", async () => {
    mockRoundMatch({ nextMatchId: null, nextMatchSlot: null });
    mockOrganizerMember();
    mockH2HGameType();

    // First call returns in_progress tournament, second call (inside tx for placement points) returns completed
    vi.mocked(dbGetTournamentById)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
        name: "Test Tournament",
        description: null,
        logo: null,
        tournamentType: "single_elimination",
        status: "in_progress",
        seedingType: "random",
        bestOf: 1,
        placementPointConfig: null,
        totalRounds: 2,
        startDate: null,
        completedAt: null,
        createdById: TEST_IDS.USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetTournamentById> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
        name: "Test Tournament",
        description: null,
        logo: null,
        tournamentType: "single_elimination",
        status: "completed",
        seedingType: "random",
        bestOf: 1,
        placementPointConfig: null,
        totalRounds: 2,
        startDate: null,
        completedAt: new Date(),
        createdById: TEST_IDS.USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetTournamentById> extends Promise<infer T>
        ? NonNullable<T>
        : never);

    vi.mocked(createEventMatch).mockResolvedValue({
      id: TEST_IDS.EVENT_MATCH_ID,
      eventId: TEST_IDS.EVENT_ID,
      eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(),
      recorderId: TEST_IDS.USER_ID,
      createdAt: new Date(),
    } as ReturnType<typeof createEventMatch> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(createEventMatchParticipants).mockResolvedValue([]);
    vi.mocked(createEventPointEntries).mockResolvedValue([]);

    vi.mocked(dbGetParticipantById).mockImplementation(
      async (id) =>
        ({
          id,
          eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
          eventTeamId:
            id === TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID
              ? TEST_IDS.EVENT_TEAM_ID
              : TEST_IDS.EVENT_TEAM_ID_2,
          seed: 1,
          isEliminated: false,
          eliminatedInRound: null,
          finalPlacement: null,
          createdAt: new Date(),
        }) as ReturnType<typeof dbGetParticipantById> extends Promise<infer T>
          ? NonNullable<T>
          : never,
    );

    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateParticipant).mockResolvedValue(undefined);
    vi.mocked(dbUpdateTournament).mockResolvedValue(
      {} as ReturnType<typeof dbUpdateTournament> extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbGetParticipants).mockResolvedValue([]);

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.data?.eventMatchId).toBe(TEST_IDS.EVENT_MATCH_ID);
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
  });
});

// =================== forfeitEventTournamentMatch ===================

describe("forfeitEventTournamentMatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when tournament not in progress", async () => {
    mockRoundMatch();
    mockTournament({ status: "draft" });

    const result = await forfeitEventTournamentMatch(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      forfeitParticipantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.error).toBe("Tournament is not in progress");
  });

  it("returns error when not organizer", async () => {
    mockRoundMatch();
    mockInProgressTournament();
    mockParticipantMember();

    const result = await forfeitEventTournamentMatch(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      forfeitParticipantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.error).toBe(
      "You do not have permission to manage tournament matches",
    );
  });

  it("returns error when series already has a result", async () => {
    mockRoundMatch({ winnerId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID });
    mockInProgressTournament();
    mockOrganizerMember();

    const result = await forfeitEventTournamentMatch(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      forfeitParticipantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
    });
    expect(result.error).toBe("This match already has a result");
  });

  it("returns error when forfeit participant not in match", async () => {
    mockRoundMatch();
    mockInProgressTournament();
    mockOrganizerMember();

    const result = await forfeitEventTournamentMatch(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      forfeitParticipantId: TEST_IDS.EVENT_TEAM_ID, // not a match participant
    });
    expect(result.error).toBe(
      "Forfeit participant must be one of the match participants",
    );
  });

  it("forfeits match successfully with advancement", async () => {
    const nextMatchId = "c53e4567-e89b-12d3-a456-426614174099";
    mockRoundMatch({ nextMatchId, nextMatchSlot: 1 });
    mockInProgressTournament();
    mockOrganizerMember();

    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateParticipant).mockResolvedValue(undefined);

    // After forfeit, re-fetch the round match to get nextMatchId for advancement
    vi.mocked(dbGetRoundMatchById)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: null,
        eventMatchId: null,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
        eventMatchId: null,
        isBye: false,
        isForfeit: true,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: nextMatchId,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 2,
        position: 1,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
        eventMatchId: null,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId: null,
        nextMatchSlot: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never);

    const result = await forfeitEventTournamentMatch(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      forfeitParticipantId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
    });
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

// =================== Series tracking (best-of-3) ===================

describe("recordEventTournamentMatchResult (best-of series)", () => {
  beforeEach(() => vi.clearAllMocks());

  function setupSeriesTest(bestOf: number, roundBestOf?: string) {
    mockRoundMatch();
    mockInProgressTournament({ bestOf, roundBestOf });
    mockOrganizerMember();
    mockH2HGameType();

    vi.mocked(createEventMatch).mockResolvedValue({
      id: TEST_IDS.EVENT_MATCH_ID,
      eventId: TEST_IDS.EVENT_ID,
      eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(),
      recorderId: TEST_IDS.USER_ID,
      createdAt: new Date(),
    } as ReturnType<typeof createEventMatch> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(createEventMatchParticipants).mockResolvedValue([]);

    vi.mocked(dbGetParticipantById).mockImplementation(
      async (id) =>
        ({
          id,
          eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
          eventTeamId:
            id === TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID
              ? TEST_IDS.EVENT_TEAM_ID
              : TEST_IDS.EVENT_TEAM_ID_2,
          seed: 1,
          isEliminated: false,
          eliminatedInRound: null,
          finalPlacement: null,
          createdAt: new Date(),
        }) as ReturnType<typeof dbGetParticipantById> extends Promise<infer T>
          ? NonNullable<T>
          : never,
    );

    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateParticipant).mockResolvedValue(undefined);
  }

  it("records game 1 of best-of-3 without deciding series", async () => {
    setupSeriesTest(3);

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.data?.seriesComplete).toBe(false);
    expect(result.data?.participant1Wins).toBe(1);
    expect(result.data?.participant2Wins).toBe(0);
  });

  it("does not decide series at 1-1 in best-of-3", async () => {
    mockRoundMatch({ participant1Wins: 0, participant2Wins: 1 });
    mockInProgressTournament({ bestOf: 3 });
    mockOrganizerMember();
    mockH2HGameType();

    vi.mocked(createEventMatch).mockResolvedValue({
      id: TEST_IDS.EVENT_MATCH_ID,
      eventId: TEST_IDS.EVENT_ID,
      eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(),
      recorderId: TEST_IDS.USER_ID,
      createdAt: new Date(),
    } as ReturnType<typeof createEventMatch> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(createEventMatchParticipants).mockResolvedValue([]);
    vi.mocked(dbGetParticipantById).mockImplementation(
      async (id) =>
        ({
          id,
          eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
          eventTeamId:
            id === TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID
              ? TEST_IDS.EVENT_TEAM_ID
              : TEST_IDS.EVENT_TEAM_ID_2,
          seed: 1,
          isEliminated: false,
          eliminatedInRound: null,
          finalPlacement: null,
          createdAt: new Date(),
        }) as ReturnType<typeof dbGetParticipantById> extends Promise<infer T>
          ? NonNullable<T>
          : never,
    );
    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateParticipant).mockResolvedValue(undefined);

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.data?.seriesComplete).toBe(false);
    expect(result.data?.participant1Wins).toBe(1);
    expect(result.data?.participant2Wins).toBe(1);
  });

  it("uses roundBestOf config over default bestOf", async () => {
    // Default bestOf is 1, but round 1 is Bo3
    setupSeriesTest(1, JSON.stringify({ "1": 3 }));

    const result = await recordEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      winningSide: "side1",
      playedAt: new Date(),
    });
    expect(result.data?.seriesComplete).toBe(false);
    expect(result.data?.participant1Wins).toBe(1);
  });

  it("rejects roundBestOf with even best-of values", async () => {
    const result = await createEventTournament(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Bad Config",
      seedingType: "random",
      bestOf: 1,
      roundBestOf: { "1": 2 },
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });
});

// =================== undoEventTournamentMatchResult ===================

describe("undoEventTournamentMatchResult", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when no games to undo", async () => {
    mockRoundMatch({
      winnerId: null,
      participant1Wins: 0,
      participant2Wins: 0,
    });
    mockInProgressTournament();
    mockOrganizerMember();
    vi.mocked(getEventMatchesByRoundMatchId).mockResolvedValue([]);

    const result = await undoEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
    });
    expect(result.error).toBe("This match does not have a result to undo");
  });

  it("undoes a mid-series game (decrements wins)", async () => {
    mockRoundMatch({
      winnerId: null,
      participant1Wins: 1,
      participant2Wins: 0,
      eventMatchId: TEST_IDS.EVENT_MATCH_ID,
    });
    mockInProgressTournament({ bestOf: 3 });
    mockOrganizerMember();

    vi.mocked(getEventMatchesByRoundMatchId).mockResolvedValue([
      {
        id: TEST_IDS.EVENT_MATCH_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
        playedAt: new Date(),
        recorderId: TEST_IDS.USER_ID,
        createdAt: new Date(),
        eventTournamentRoundMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      } as ReturnType<typeof getEventMatchesByRoundMatchId> extends Promise<
        infer T
      >
        ? T[number]
        : never,
    ]);
    vi.mocked(deleteEventMatch).mockResolvedValue(true);
    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );

    const result = await undoEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
    });
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("undoes a series-deciding game (un-advances winner)", async () => {
    const nextMatchId = "c53e4567-e89b-12d3-a456-426614174099";

    mockRoundMatch({
      winnerId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
      participant1Wins: 2,
      participant2Wins: 1,
      eventMatchId: TEST_IDS.EVENT_MATCH_ID,
      nextMatchId,
      nextMatchSlot: 1,
    });
    mockInProgressTournament({ bestOf: 3 });
    mockOrganizerMember();

    vi.mocked(getEventMatchesByRoundMatchId).mockResolvedValue([
      {
        id: TEST_IDS.EVENT_MATCH_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
        playedAt: new Date(),
        recorderId: TEST_IDS.USER_ID,
        createdAt: new Date(),
        eventTournamentRoundMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
      } as ReturnType<typeof getEventMatchesByRoundMatchId> extends Promise<
        infer T
      >
        ? T[number]
        : never,
    ]);

    vi.mocked(deleteEventMatch).mockResolvedValue(true);
    vi.mocked(dbUpdateRoundMatch).mockResolvedValue(
      undefined as unknown as ReturnType<
        typeof dbUpdateRoundMatch
      > extends Promise<infer T>
        ? T
        : never,
    );
    vi.mocked(dbUpdateParticipant).mockResolvedValue(undefined);

    vi.mocked(dbGetRoundMatchById)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 1,
        position: 1,
        participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        participant2Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID_2,
        winnerId: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        eventMatchId: TEST_IDS.EVENT_MATCH_ID,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 2,
        participant2Wins: 1,
        nextMatchId,
        nextMatchSlot: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: nextMatchId,
        eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
        round: 2,
        position: 1,
        participant1Id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
        participant2Id: null,
        winnerId: null,
        eventMatchId: null,
        isBye: false,
        isForfeit: false,
        participant1Score: null,
        participant2Score: null,
        participant1Wins: 0,
        participant2Wins: 0,
        nextMatchId: null,
        nextMatchSlot: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<typeof dbGetRoundMatchById> extends Promise<infer T>
        ? NonNullable<T>
        : never);

    const result = await undoEventTournamentMatchResult(TEST_IDS.USER_ID, {
      tournamentMatchId: TEST_IDS.EVENT_TOURNAMENT_ROUND_MATCH_ID,
    });
    expect(result.data?.eventTournamentId).toBe(TEST_IDS.EVENT_TOURNAMENT_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

// =================== addEventTournamentPartnership ===================

describe("addEventTournamentPartnership", () => {
  beforeEach(() => vi.clearAllMocks());

  const validInput = {
    eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
    members: [{ userId: TEST_IDS.USER_ID_2 }, { userId: TEST_IDS.USER_ID_3 }],
  };

  function mockPartnershipGameType() {
    vi.mocked(getEventGameTypeById).mockResolvedValue({
      id: TEST_IDS.EVENT_GAME_TYPE_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Doubles Ping Pong",
      description: null,
      logo: null,
      category: "head_to_head",
      config: PARTNERSHIP_H2H_CONFIG,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof getEventGameTypeById> extends Promise<infer T>
      ? NonNullable<T>
      : never);
  }

  function mockTeamForUsers(teamId: string = TEST_IDS.EVENT_TEAM_ID) {
    vi.mocked(getTeamForUser).mockResolvedValue({
      id: teamId,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team 1",
      logo: null,
      createdAt: new Date(),
    } as ReturnType<typeof getTeamForUser> extends Promise<infer T>
      ? NonNullable<T>
      : never);
  }

  it("returns validation error for invalid input", async () => {
    const result = await addEventTournamentPartnership(TEST_IDS.USER_ID, {
      eventTournamentId: "not-a-uuid",
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns validation error for fewer than 2 members", async () => {
    const result = await addEventTournamentPartnership(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      members: [{ userId: TEST_IDS.USER_ID_2 }],
    });
    expect(result.error).toBe("Validation failed");
  });

  it("returns error when tournament not found", async () => {
    vi.mocked(dbGetTournamentById).mockResolvedValue(undefined);
    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe("Tournament not found");
  });

  it("returns error when tournament not draft", async () => {
    mockInProgressTournament();
    mockOrganizerMember();
    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe(
      "Can only add participants to tournaments in draft status",
    );
  });

  it("returns error when not organizer", async () => {
    mockTournament();
    mockParticipantMember();
    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe(
      "You do not have permission to manage tournaments",
    );
  });

  it("returns error when tournament is team type", async () => {
    mockTournament({ participantType: "team" });
    mockOrganizerMember();
    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe(
      "Partnerships are only for individual tournaments",
    );
  });

  it("returns error when game type does not support partnerships", async () => {
    mockTournament();
    mockOrganizerMember();
    mockH2HGameType(); // standard 1v1 config
    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe("This game type does not support partnerships");
  });

  it("returns error when wrong number of members", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType(); // requires 2 members
    const result = await addEventTournamentPartnership(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      members: [
        { userId: TEST_IDS.USER_ID_2 },
        { userId: TEST_IDS.USER_ID_3 },
        { userId: TEST_IDS.USER_ID_4 },
      ],
    });
    expect(result.error).toContain("exactly 2 members");
  });

  it("returns error when members are on different teams", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType();
    vi.mocked(getTeamForUser)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TEAM_ID,
        eventId: TEST_IDS.EVENT_ID,
        name: "Team 1",
        logo: null,
        createdAt: new Date(),
      } as ReturnType<typeof getTeamForUser> extends Promise<infer T>
        ? NonNullable<T>
        : never)
      .mockResolvedValueOnce({
        id: TEST_IDS.EVENT_TEAM_ID_2,
        eventId: TEST_IDS.EVENT_ID,
        name: "Team 2",
        logo: null,
        createdAt: new Date(),
      } as ReturnType<typeof getTeamForUser> extends Promise<infer T>
        ? NonNullable<T>
        : never);
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCheckIndividualInPartnership).mockResolvedValue(false);

    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe(
      "All partnership members must be on the same team",
    );
  });

  it("returns error when member already in tournament", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType();
    mockTeamForUsers();
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(true);

    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe(
      "One or more members are already in the tournament",
    );
  });

  it("returns error when member already in another partnership", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType();
    mockTeamForUsers();
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCheckIndividualInPartnership).mockResolvedValue(true);

    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toBe(
      "One or more members are already in a partnership in this tournament",
    );
  });

  it("returns error at max participants", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType();
    mockTeamForUsers();
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCheckIndividualInPartnership).mockResolvedValue(false);
    vi.mocked(dbCountParticipants).mockResolvedValue(64);

    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.error).toContain("maximum");
  });

  it("creates partnership successfully", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType();
    mockTeamForUsers();
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCheckIndividualInPartnership).mockResolvedValue(false);
    vi.mocked(dbCountParticipants).mockResolvedValue(2);
    vi.mocked(dbAddParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: null,
      eventPlaceholderParticipantId: null,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
      createdAt: new Date(),
    } as ReturnType<typeof dbAddParticipant> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(dbAddParticipantMembers).mockResolvedValue([]);

    const result = await addEventTournamentPartnership(
      TEST_IDS.USER_ID,
      validInput,
    );
    expect(result.data?.id).toBe(TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID);
    expect(result.data?.userId).toBeNull();
  });

  it("works with placeholder participants", async () => {
    mockTournament();
    mockOrganizerMember();
    mockPartnershipGameType();
    vi.mocked(getTeamForPlaceholder).mockResolvedValue({
      id: TEST_IDS.EVENT_TEAM_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team 1",
      logo: null,
      createdAt: new Date(),
    } as ReturnType<typeof getTeamForPlaceholder> extends Promise<infer T>
      ? NonNullable<T>
      : never);
    vi.mocked(dbCheckIndividualInTournament).mockResolvedValue(false);
    vi.mocked(dbCheckIndividualInPartnership).mockResolvedValue(false);
    vi.mocked(dbCountParticipants).mockResolvedValue(0);
    vi.mocked(dbAddParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID,
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      userId: null,
      eventPlaceholderParticipantId: null,
      seed: null,
      isEliminated: false,
      eliminatedInRound: null,
      finalPlacement: null,
      createdAt: new Date(),
    } as ReturnType<typeof dbAddParticipant> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(dbAddParticipantMembers).mockResolvedValue([]);

    const result = await addEventTournamentPartnership(TEST_IDS.USER_ID, {
      eventTournamentId: TEST_IDS.EVENT_TOURNAMENT_ID,
      members: [
        { eventPlaceholderParticipantId: TEST_IDS.EVENT_PLACEHOLDER_ID },
        { eventPlaceholderParticipantId: TEST_IDS.PLACEHOLDER_ID },
      ],
    });
    expect(result.data?.id).toBe(TEST_IDS.EVENT_TOURNAMENT_PARTICIPANT_ID);
  });
});
