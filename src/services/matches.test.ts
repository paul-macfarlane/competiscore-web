import * as dbGameTypes from "@/db/game-types";
import * as dbHighScores from "@/db/high-scores";
import * as dbLeagueMembers from "@/db/league-members";
import * as dbMatches from "@/db/matches";
import * as dbPlaceholderMembers from "@/db/placeholder-members";
import * as dbTeams from "@/db/teams";
import {
  GameCategory,
  LeagueMemberRole,
  MatchStatus,
  ScoreOrder,
  ScoringType,
} from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getGameTypeMatches,
  getMatch,
  recordFFARankedMatch,
  recordFFAScoreMatch,
  recordH2HScoreMatch,
  recordH2HWinLossMatch,
  submitHighScore,
} from "./matches";

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
  getMatchesByGameTypeId: vi.fn(),
}));

vi.mock("@/db/high-scores", () => ({
  createHighScoreEntry: vi.fn(),
}));

vi.mock("@/db/teams", () => ({
  isUserMemberOfTeam: vi.fn(),
}));

vi.mock("@/db/placeholder-members", () => ({
  getPlaceholderMemberById: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn(async (callback) => await callback({})),
}));

const GAME_TYPE_H2H_WL_ID = "550e8400-e29b-41d4-a716-446655440001";
const GAME_TYPE_H2H_SCORE_ID = "550e8400-e29b-41d4-a716-446655440002";
const GAME_TYPE_FFA_RANKED_ID = "550e8400-e29b-41d4-a716-446655440003";
const GAME_TYPE_FFA_SCORE_ID = "550e8400-e29b-41d4-a716-446655440004";
const GAME_TYPE_HIGH_SCORE_ID = "550e8400-e29b-41d4-a716-446655440005";
const USER_ID_1 = "550e8400-e29b-41d4-a716-446655440101";
const USER_ID_2 = "550e8400-e29b-41d4-a716-446655440102";
const USER_ID_3 = "550e8400-e29b-41d4-a716-446655440103";
const TEAM_ID_1 = "550e8400-e29b-41d4-a716-446655440201";
const LEAGUE_ID = "550e8400-e29b-41d4-a716-446655440301";
const MATCH_ID = "550e8400-e29b-41d4-a716-446655440401";
const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440501";
const ENTRY_ID = "550e8400-e29b-41d4-a716-446655440601";

const mockMember = {
  id: MEMBER_ID,
  userId: USER_ID_1,
  leagueId: LEAGUE_ID,
  role: LeagueMemberRole.MEMBER,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockManager = {
  ...mockMember,
  role: LeagueMemberRole.MANAGER,
};

const mockExecutive = {
  ...mockMember,
  role: LeagueMemberRole.EXECUTIVE,
};

const mockSuspendedMember = {
  ...mockMember,
  suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Suspended for 24 hours
};

const mockH2HWinLossGameType = {
  id: GAME_TYPE_H2H_WL_ID,
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
  id: GAME_TYPE_H2H_SCORE_ID,
  name: "Ping Pong",
  config: JSON.stringify({
    scoringType: ScoringType.SCORE_BASED,
    scoreDescription: "Points",
    drawsAllowed: false,
    minPlayersPerSide: 1,
    maxPlayersPerSide: 2,
  }),
};

const mockFFARankedGameType = {
  ...mockH2HWinLossGameType,
  id: GAME_TYPE_FFA_RANKED_ID,
  name: "Mario Kart",
  category: GameCategory.FREE_FOR_ALL,
  config: JSON.stringify({
    scoringType: ScoringType.RANKED_FINISH,
    scoreOrder: ScoreOrder.HIGHEST_WINS,
    minPlayers: 2,
    maxPlayers: 8,
  }),
};

const mockFFAScoreGameType = {
  ...mockH2HWinLossGameType,
  id: GAME_TYPE_FFA_SCORE_ID,
  name: "Golf",
  category: GameCategory.FREE_FOR_ALL,
  config: JSON.stringify({
    scoringType: ScoringType.SCORE_BASED,
    scoreOrder: ScoreOrder.LOWEST_WINS,
    minPlayers: 2,
    maxPlayers: 4,
  }),
};

const mockHighScoreGameType = {
  ...mockH2HWinLossGameType,
  id: GAME_TYPE_HIGH_SCORE_ID,
  name: "Pac-Man",
  category: GameCategory.HIGH_SCORE,
  config: JSON.stringify({
    scoreOrder: ScoreOrder.HIGHEST_WINS,
    scoreDescription: "Points",
    participantType: "individual",
  }),
};

const mockMatch = {
  id: MATCH_ID,
  leagueId: LEAGUE_ID,
  gameTypeId: GAME_TYPE_H2H_WL_ID,
  status: MatchStatus.COMPLETED,
  playedAt: new Date(),
  recorderId: USER_ID_1,
  challengerId: null,
  challengedAt: null,
  acceptedAt: null,
  declinedAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("recordH2HWinLossMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record a win/loss match successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should record a draw successfully when draws are allowed", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "draw",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.error).toBe("You are not a member of this league");
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.error).toBe("Game type not found in this league");
  });

  it("should fail if game type is wrong category", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockFFARankedGameType,
    );

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_RANKED_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.error).toBe(
      "This game type is not configured for head-to-head matches",
    );
  });

  it("should fail if draws not allowed and draw selected", async () => {
    const noDraw = {
      ...mockH2HWinLossGameType,
      config: JSON.stringify({
        scoringType: ScoringType.WIN_LOSS,
        drawsAllowed: false,
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      }),
    };
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(noDraw);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "draw",
    });

    expect(result.error).toBe("Draws are not allowed for this game type");
  });

  it("should fail with invalid input", async () => {
    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: "not-a-uuid",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.error).toBe("You cannot record matches while suspended");
  });

  it("should allow member to record match they are involved in", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should fail when member tries to record match they are not involved in", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_2 }],
      side2Participants: [{ userId: USER_ID_3 }],
      winningSide: "side1",
    });

    expect(result.error).toBe("You can only record matches you're involved in");
  });

  it("should allow manager to record match they are not involved in", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_2 }],
      side2Participants: [{ userId: USER_ID_3 }],
      winningSide: "side1",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should allow executive to record match they are not involved in", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockExecutive);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_2 }],
      side2Participants: [{ userId: USER_ID_3 }],
      winningSide: "side1",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should allow member to record match involving their team", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbTeams.isUserMemberOfTeam).mockResolvedValue(true);
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ teamId: TEAM_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should allow member to record match involving placeholder linked to them", async () => {
    const PLACEHOLDER_ID = "550e8400-e29b-41d4-a716-446655440701";
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbPlaceholderMembers.getPlaceholderMemberById).mockResolvedValue({
      id: PLACEHOLDER_ID,
      leagueId: LEAGUE_ID,
      displayName: "John Doe",
      linkedUserId: USER_ID_1,
      createdAt: new Date(),
      retiredAt: null,
    });
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HWinLossMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ placeholderMemberId: PLACEHOLDER_ID }],
      side2Participants: [{ userId: USER_ID_2 }],
      winningSide: "side1",
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });
});

describe("recordH2HScoreMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record a score-based match successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HScoreGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordH2HScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_SCORE_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      side1Score: 21,
      side2Score: 18,
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should fail if score results in draw when not allowed", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HScoreGameType,
    );

    const result = await recordH2HScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_SCORE_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      side1Score: 21,
      side2Score: 21,
    });

    expect(result.error).toBe("Draws are not allowed for this game type");
  });

  it("should fail if wrong scoring type", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );

    const result = await recordH2HScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      side1Score: 21,
      side2Score: 18,
    });

    expect(result.error).toBe("This game type requires win/loss recording");
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await recordH2HScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_SCORE_ID,
      playedAt: new Date("2024-01-01"),
      side1Participants: [{ userId: USER_ID_1 }],
      side2Participants: [{ userId: USER_ID_2 }],
      side1Score: 21,
      side2Score: 18,
    });

    expect(result.error).toBe("You cannot record matches while suspended");
  });
});

describe("recordFFARankedMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record a ranked FFA match successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockFFARankedGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordFFARankedMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_RANKED_ID,
      playedAt: new Date("2024-01-01"),
      participants: [
        { userId: USER_ID_1, rank: 1 },
        { userId: USER_ID_2, rank: 2 },
        { userId: USER_ID_3, rank: 3 },
      ],
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should fail with duplicate ranks", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockFFARankedGameType,
    );

    const result = await recordFFARankedMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_RANKED_ID,
      playedAt: new Date("2024-01-01"),
      participants: [
        { userId: USER_ID_1, rank: 1 },
        { userId: USER_ID_2, rank: 1 },
      ],
    });

    expect(result.error).toBe("Each participant must have a unique rank");
  });

  it("should fail with too few participants", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockFFARankedGameType,
    );

    const result = await recordFFARankedMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_RANKED_ID,
      playedAt: new Date("2024-01-01"),
      participants: [{ userId: USER_ID_1, rank: 1 }],
    });

    expect(result.error).toBe("Validation failed");
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await recordFFARankedMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_RANKED_ID,
      playedAt: new Date("2024-01-01"),
      participants: [
        { userId: USER_ID_1, rank: 1 },
        { userId: USER_ID_2, rank: 2 },
      ],
    });

    expect(result.error).toBe("You cannot record matches while suspended");
  });
});

describe("recordFFAScoreMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record a score-based FFA match successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockFFAScoreGameType,
    );
    vi.mocked(dbMatches.createMatch).mockResolvedValue(mockMatch);
    vi.mocked(dbMatches.createMatchParticipants).mockResolvedValue([]);

    const result = await recordFFAScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_SCORE_ID,
      playedAt: new Date("2024-01-01"),
      participants: [
        { userId: USER_ID_1, score: 72 },
        { userId: USER_ID_2, score: 85 },
      ],
    });

    expect(result.data).toEqual(mockMatch);
    expect(result.error).toBeUndefined();
  });

  it("should fail if wrong scoring type", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockFFARankedGameType,
    );

    const result = await recordFFAScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_RANKED_ID,
      playedAt: new Date("2024-01-01"),
      participants: [
        { userId: USER_ID_1, score: 72 },
        { userId: USER_ID_2, score: 85 },
      ],
    });

    expect(result.error).toBe("This game type requires ranked recording");
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await recordFFAScoreMatch(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_FFA_SCORE_ID,
      playedAt: new Date("2024-01-01"),
      participants: [
        { userId: USER_ID_1, score: 72 },
        { userId: USER_ID_2, score: 85 },
      ],
    });

    expect(result.error).toBe("You cannot record matches while suspended");
  });
});

describe("submitHighScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should submit a high score successfully", async () => {
    const mockEntry = {
      id: ENTRY_ID,
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_HIGH_SCORE_ID,
      userId: USER_ID_1,
      teamId: null,
      placeholderMemberId: null,
      score: 999999,
      recorderId: USER_ID_1,
      achievedAt: new Date("2024-01-01"),
      createdAt: new Date(),
    };

    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockHighScoreGameType,
    );
    vi.mocked(dbHighScores.createHighScoreEntry).mockResolvedValue(mockEntry);

    const result = await submitHighScore(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_HIGH_SCORE_ID,
      participant: { userId: USER_ID_1 },
      score: 999999,
      achievedAt: new Date("2024-01-01"),
    });

    expect(result.data).toEqual(mockEntry);
    expect(result.error).toBeUndefined();
  });

  it("should fail if game type is wrong category", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );

    const result = await submitHighScore(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_H2H_WL_ID,
      participant: { userId: USER_ID_1 },
      score: 999999,
      achievedAt: new Date("2024-01-01"),
    });

    expect(result.error).toBe(
      "This game type is not configured for high score submissions",
    );
  });

  it("should fail if individual game type but team provided", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockHighScoreGameType,
    );

    const result = await submitHighScore(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_HIGH_SCORE_ID,
      participant: { teamId: TEAM_ID_1 },
      score: 999999,
      achievedAt: new Date("2024-01-01"),
    });

    expect(result.error).toBe(
      "This game type requires individual participants",
    );
  });

  it("should fail if user is suspended", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockSuspendedMember,
    );

    const result = await submitHighScore(USER_ID_1, {
      leagueId: LEAGUE_ID,
      gameTypeId: GAME_TYPE_HIGH_SCORE_ID,
      participant: { userId: USER_ID_1 },
      score: 999999,
      achievedAt: new Date("2024-01-01"),
    });

    expect(result.error).toBe("You cannot submit scores while suspended");
  });
});

describe("getMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a match successfully", async () => {
    const mockWithParticipants = { ...mockMatch, participants: [] };
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockMatch);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getMatchWithParticipants).mockResolvedValue(
      mockWithParticipants,
    );
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockHighScoreGameType,
    );

    const result = await getMatch(USER_ID_1, MATCH_ID);

    expect(result.data).toEqual({
      ...mockWithParticipants,
      gameType: {
        id: mockHighScoreGameType.id,
        name: mockHighScoreGameType.name,
        category: mockHighScoreGameType.category,
      },
    });
    expect(result.error).toBeUndefined();
  });

  it("should fail if match not found", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(undefined);

    const result = await getMatch(USER_ID_1, MATCH_ID);

    expect(result.error).toBe("Match not found");
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbMatches.getMatchById).mockResolvedValue(mockMatch);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getMatch(USER_ID_1, MATCH_ID);

    expect(result.error).toBe("You are not a member of this league");
  });
});

describe("getGameTypeMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get matches for a game type", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbMatches.getMatchesByGameTypeId).mockResolvedValue([mockMatch]);
    vi.mocked(dbMatches.getMatchParticipants).mockResolvedValue([]);

    const result = await getGameTypeMatches(USER_ID_1, GAME_TYPE_H2H_WL_ID);

    expect(result.data).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await getGameTypeMatches(USER_ID_1, GAME_TYPE_H2H_WL_ID);

    expect(result.error).toBe("Game type not found");
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(
      mockH2HWinLossGameType,
    );
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getGameTypeMatches(USER_ID_1, GAME_TYPE_H2H_WL_ID);

    expect(result.error).toBe("You are not a member of this league");
  });
});
