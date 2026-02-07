import * as dbGameTypes from "@/db/game-types";
import * as dbLeagueMembers from "@/db/league-members";
import * as dbMatches from "@/db/matches";
import {
  ChallengeWinningSide,
  GameCategory,
  MatchStatus,
  ScoringType,
} from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  declineChallenge,
  getChallenge,
  getPendingChallenges,
  getSentChallenges,
  recordChallengeH2HScoreResult,
  recordChallengeH2HWinLossResult,
} from "./challenges";

vi.mock("@/db/game-types", () => ({
  getGameTypeById: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
}));

vi.mock("@/db/matches", () => ({
  createMatch: vi.fn(),
  createMatchParticipants: vi.fn(),
  getMatchById: vi.fn(),
  getMatchParticipants: vi.fn(),
  getMatchWithParticipants: vi.fn(),
  getPendingChallengesForUser: vi.fn(),
  getSentChallengesByUser: vi.fn(),
  updateMatchStatus: vi.fn(),
  updateMatchParticipantResults: vi.fn(),
  updateMatchForChallengeResult: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn(async (callback) => await callback({})),
}));

const GAME_TYPE_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID_1 = "550e8400-e29b-41d4-a716-446655440101";
const USER_ID_2 = "550e8400-e29b-41d4-a716-446655440102";
const LEAGUE_ID = "550e8400-e29b-41d4-a716-446655440301";
const MATCH_ID = "550e8400-e29b-41d4-a716-446655440401";
const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440501";
const PARTICIPANT_ID_1 = "550e8400-e29b-41d4-a716-446655440601";
const PARTICIPANT_ID_2 = "550e8400-e29b-41d4-a716-446655440602";

const mockMember = {
  id: MEMBER_ID,
  userId: USER_ID_1,
  leagueId: LEAGUE_ID,
  role: "member" as const,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockSuspendedMember = {
  ...mockMember,
  suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Suspended for 24 hours
};

const mockH2HWinLossGameType = {
  id: GAME_TYPE_ID,
  leagueId: LEAGUE_ID,
  name: "Chess",
  description: "Classic chess",
  logo: null,
  category: GameCategory.HEAD_TO_HEAD,
  config: JSON.stringify({
    scoringType: ScoringType.WIN_LOSS,
    drawsAllowed: true,
    minPlayersPerSide: 1,
    maxPlayersPerSide: 1,
  }),
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockH2HScoreGameType = {
  ...mockH2HWinLossGameType,
  config: JSON.stringify({
    scoringType: ScoringType.SCORE_BASED,
    drawsAllowed: false,
    minPlayersPerSide: 1,
    maxPlayersPerSide: 1,
  }),
};

const mockPendingChallenge = {
  id: MATCH_ID,
  leagueId: LEAGUE_ID,
  gameTypeId: GAME_TYPE_ID,
  status: MatchStatus.PENDING,
  playedAt: new Date(),
  recorderId: USER_ID_1,
  challengerId: USER_ID_1,
  challengedAt: new Date(),
  acceptedAt: null,
  declinedAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAcceptedChallenge = {
  ...mockPendingChallenge,
  status: MatchStatus.ACCEPTED,
  acceptedAt: new Date(),
};

const mockParticipants = [
  {
    id: PARTICIPANT_ID_1,
    matchId: MATCH_ID,
    userId: USER_ID_1,
    teamId: null,
    placeholderMemberId: null,
    side: 1,
    result: null,
    score: null,
    rank: null,
    isChallenged: false,
    createdAt: new Date(),
  },
  {
    id: PARTICIPANT_ID_2,
    matchId: MATCH_ID,
    userId: USER_ID_2,
    teamId: null,
    placeholderMemberId: null,
    side: 2,
    result: null,
    score: null,
    rank: null,
    isChallenged: true,
    createdAt: new Date(),
  },
];

describe("createChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a challenge successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.data).toEqual(mockPendingChallenge);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.error).toBe("You are not a member of this league");
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.error).toBe("You cannot create challenges while suspended");
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.error).toBe("Game type not found in this league");
  });

  it("should fail if game type is archived", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue({
      ...mockH2HWinLossGameType,
      isArchived: true,
    });

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.error).toBe(
      "Cannot create challenges for an archived game type",
    );
  });

  it("should fail if game type is not H2H", async () => {
    const ffaGameType = {
      ...mockH2HWinLossGameType,
      category: GameCategory.FREE_FOR_ALL,
    };
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(ffaGameType);

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.error).toBe(
      "Challenges are only available for head-to-head game types",
    );
  });

  it("should fail if challenged participant is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember)
      .mockResolvedValueOnce(mockMember)
      .mockResolvedValueOnce(mockSuspendedMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );

    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: GAME_TYPE_ID,
      challengerParticipants: [{ userId: USER_ID_1 }],
      challengedParticipants: [{ userId: USER_ID_2 }],
    });

    expect(result.error).toBe("Cannot challenge suspended members");
  });

  it("should fail with invalid input", async () => {
    const result = await createChallenge(USER_ID_1, LEAGUE_ID, {
      gameTypeId: "not-a-uuid",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });
});

describe("acceptChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept a challenge successfully", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      userId: USER_ID_2,
    });
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbMatches.updateMatchStatus).mockResolvedValue(
      mockAcceptedChallenge,
    );

    const result = await acceptChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.data).toEqual(mockAcceptedChallenge);
    expect(result.error).toBeUndefined();
  });

  it("should fail if challenge not found", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(undefined);

    const result = await acceptChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.error).toBe("Challenge not found");
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await acceptChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.error).toBe("You are not a member of this league");
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockSuspendedMember,
      userId: USER_ID_2,
    });

    const result = await acceptChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.error).toBe("You cannot accept challenges while suspended");
  });

  it("should fail if challenge is not pending", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      userId: USER_ID_2,
    });

    const result = await acceptChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.error).toBe("This challenge is no longer pending");
  });

  it("should fail if user is not the challenged party", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );

    const result = await acceptChallenge(USER_ID_1, { matchId: MATCH_ID });

    expect(result.error).toBe("You are not the target of this challenge");
  });
});

describe("declineChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should decline a challenge successfully", async () => {
    const declinedChallenge = {
      ...mockPendingChallenge,
      status: MatchStatus.DECLINED,
      declinedAt: new Date(),
    };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      userId: USER_ID_2,
    });
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbMatches.updateMatchStatus).mockResolvedValue(declinedChallenge);

    const result = await declineChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.data).toEqual(declinedChallenge);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not the challenged party", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );

    const result = await declineChallenge(USER_ID_1, { matchId: MATCH_ID });

    expect(result.error).toBe("You are not the target of this challenge");
  });
});

describe("cancelChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should cancel a challenge successfully", async () => {
    const cancelledChallenge = {
      ...mockPendingChallenge,
      status: MatchStatus.CANCELLED,
      cancelledAt: new Date(),
    };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.updateMatchStatus).mockResolvedValue(
      cancelledChallenge,
    );

    const result = await cancelChallenge(USER_ID_1, { matchId: MATCH_ID });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not the challenger", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      userId: USER_ID_2,
    });

    const result = await cancelChallenge(USER_ID_2, { matchId: MATCH_ID });

    expect(result.error).toBe("You can only cancel challenges you created");
  });

  it("should fail if challenge is not pending", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    const result = await cancelChallenge(USER_ID_1, { matchId: MATCH_ID });

    expect(result.error).toBe("This challenge is no longer pending");
  });
});

describe("recordChallengeH2HWinLossResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record a win/loss result successfully", async () => {
    const completedChallenge = {
      ...mockAcceptedChallenge,
      status: MatchStatus.COMPLETED,
    };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbMatches.updateMatchParticipantResults).mockResolvedValue(
      undefined,
    );
    vi.mocked(dbMatches.updateMatchForChallengeResult).mockResolvedValue(
      completedChallenge,
    );

    const result = await recordChallengeH2HWinLossResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      winningSide: ChallengeWinningSide.CHALLENGER,
    });

    expect(result.data).toEqual(completedChallenge);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await recordChallengeH2HWinLossResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      winningSide: ChallengeWinningSide.CHALLENGER,
    });

    expect(result.error).toBe("You cannot record results while suspended");
  });

  it("should fail if challenge is not accepted", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    const result = await recordChallengeH2HWinLossResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      winningSide: ChallengeWinningSide.CHALLENGER,
    });

    expect(result.error).toBe(
      "This challenge must be accepted before recording a result",
    );
  });

  it("should fail if draw not allowed", async () => {
    const noDrawGameType = {
      ...mockH2HWinLossGameType,
      config: JSON.stringify({
        scoringType: ScoringType.WIN_LOSS,
        drawsAllowed: false,
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      }),
    };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(noDrawGameType);

    const result = await recordChallengeH2HWinLossResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      winningSide: ChallengeWinningSide.DRAW,
    });

    expect(result.error).toBe("Draws are not allowed for this game type");
  });

  it("should fail if user is not a participant", async () => {
    const USER_ID_3 = "00000000-0000-0000-0000-000000000103";
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      userId: USER_ID_3,
    });
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );

    const result = await recordChallengeH2HWinLossResult(USER_ID_3, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      winningSide: ChallengeWinningSide.CHALLENGER,
    });

    expect(result.error).toBe(
      "Only challenge participants can record the result",
    );
  });
});

describe("recordChallengeH2HScoreResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record a score-based result successfully", async () => {
    const completedChallenge = {
      ...mockAcceptedChallenge,
      status: MatchStatus.COMPLETED,
    };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HScoreGameType,
    );
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbMatches.updateMatchParticipantResults).mockResolvedValue(
      undefined,
    );
    vi.mocked(dbMatches.updateMatchForChallengeResult).mockResolvedValue(
      completedChallenge,
    );

    const result = await recordChallengeH2HScoreResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      challengerScore: 21,
      challengedScore: 18,
    });

    expect(result.data).toEqual(completedChallenge);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await recordChallengeH2HScoreResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      challengerScore: 21,
      challengedScore: 18,
    });

    expect(result.error).toBe("You cannot record results while suspended");
  });

  it("should fail if draw not allowed and scores are equal", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockAcceptedChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HScoreGameType,
    );

    const result = await recordChallengeH2HScoreResult(USER_ID_1, MATCH_ID, {
      playedAt: new Date("2024-01-01"),
      challengerScore: 21,
      challengedScore: 21,
    });

    expect(result.error).toBe("Draws are not allowed for this game type");
  });
});

describe("getPendingChallenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get pending challenges successfully with gameType data", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getPendingChallengesForUser).mockResolvedValue([
      mockPendingChallenge,
    ]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );

    const result = await getPendingChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].gameType).toEqual({
      id: GAME_TYPE_ID,
      name: "Chess",
      category: GameCategory.HEAD_TO_HEAD,
    });
    expect(result.error).toBeUndefined();
  });

  it("should skip challenges with missing gameType", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getPendingChallengesForUser).mockResolvedValue([
      mockPendingChallenge,
    ]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await getPendingChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.data).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("should skip challenges for archived game types", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getPendingChallengesForUser).mockResolvedValue([
      mockPendingChallenge,
    ]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue({
      ...mockH2HWinLossGameType,
      isArchived: true,
    });

    const result = await getPendingChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.data).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getPendingChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.error).toBe("You are not a member of this league");
  });
});

describe("getSentChallenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get sent challenges successfully with gameType data", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getSentChallengesByUser).mockResolvedValue([
      mockPendingChallenge,
    ]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );

    const result = await getSentChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].gameType).toEqual({
      id: GAME_TYPE_ID,
      name: "Chess",
      category: GameCategory.HEAD_TO_HEAD,
    });
    expect(result.error).toBeUndefined();
  });

  it("should skip challenges with missing gameType", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getSentChallengesByUser).mockResolvedValue([
      mockPendingChallenge,
    ]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await getSentChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.data).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("should skip challenges for archived game types", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getSentChallengesByUser).mockResolvedValue([
      mockPendingChallenge,
    ]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue(
      mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue({
      ...mockH2HWinLossGameType,
      isArchived: true,
    });

    const result = await getSentChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.data).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getSentChallenges(USER_ID_1, LEAGUE_ID);

    expect(result.error).toBe("You are not a member of this league");
  });
});

describe("getChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a challenge successfully", async () => {
    const challengeWithParticipants = {
      ...mockPendingChallenge,
      participants: mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockPendingChallenge);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getMatchWithParticipants).mockResolvedValue({
      ...mockPendingChallenge,
      participants: mockParticipants.map((p) => ({
        ...p,
        user: null,
        team: null,
        placeholderMember: null,
      })),
    });

    const result = await getChallenge(USER_ID_1, MATCH_ID);

    expect(result.data).toEqual(challengeWithParticipants);
    expect(result.error).toBeUndefined();
  });

  it("should fail if challenge not found", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(undefined);

    const result = await getChallenge(USER_ID_1, MATCH_ID);

    expect(result.error).toBe("Challenge not found");
  });
});
