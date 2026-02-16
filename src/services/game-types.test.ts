import * as dbGameTypes from "@/db/game-types";
import * as dbLeagueMembers from "@/db/league-members";
import * as limits from "@/lib/server/limits";
import { GameCategory, ICON_PATHS } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_GAME_TYPES_PER_LEAGUE } from "./constants";
import {
  archiveGameType,
  createGameType,
  deleteGameType,
  getGameType,
  getLeagueGameTypes,
  updateGameType,
} from "./game-types";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/game-types", () => ({
  createGameType: vi.fn(),
  getGameTypeById: vi.fn(),
  getGameTypesByLeagueId: vi.fn(),
  updateGameType: vi.fn(),
  archiveGameType: vi.fn(),
  deleteGameType: vi.fn(),
  getGameTypeCountByLeagueId: vi.fn(),
  checkGameTypeNameExists: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
}));

vi.mock("@/lib/server/limits", () => ({
  canLeagueAddGameType: vi.fn(),
}));

const mockGameType = {
  id: TEST_IDS.GAME_TYPE_ID,
  leagueId: TEST_IDS.LEAGUE_ID,
  name: "Ping Pong",
  description: "Classic table tennis",
  logo: `${ICON_PATHS.GAME_TYPE_ICONS}/ping-pong.svg`,
  category: GameCategory.HEAD_TO_HEAD,
  config: JSON.stringify({
    scoringType: "score_based",
    scoreDescription: "Points",
    drawsAllowed: false,
    participantType: "individual",
    minPlayersPerSide: 1,
    maxPlayersPerSide: 2,
  }),
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMember = {
  id: TEST_IDS.MEMBER_ID,
  userId: TEST_IDS.USER_ID,
  leagueId: TEST_IDS.LEAGUE_ID,
  role: "manager" as const,
  joinedAt: new Date(),
  suspendedUntil: null,
};

describe("createGameType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a game type successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.checkGameTypeNameExists).mockResolvedValue(false);
    vi.mocked(limits.canLeagueAddGameType).mockResolvedValue({
      allowed: true,
      limitInfo: { current: 5, max: 20, isAtLimit: false, isNearLimit: false },
    });
    vi.mocked(dbGameTypes.createGameType).mockResolvedValue(mockGameType);

    const result = await createGameType(TEST_IDS.USER_ID, {
      name: "Ping Pong",
      description: "Classic table tennis",
      logo: `${ICON_PATHS.GAME_TYPE_ICONS}/ping-pong.svg`,
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "score_based",
        scoreDescription: "Points",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 2,
      },
      leagueId: TEST_IDS.LEAGUE_ID,
    });

    expect(result.data).toEqual(mockGameType);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await createGameType(TEST_IDS.USER_ID, {
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
      leagueId: TEST_IDS.LEAGUE_ID,
    });

    expect(result.error).toBe("You are not a member of this league");
    expect(result.data).toBeUndefined();
  });

  it("should fail if user does not have permission", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      role: "member",
    });

    const result = await createGameType(TEST_IDS.USER_ID, {
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
      leagueId: TEST_IDS.LEAGUE_ID,
    });

    expect(result.error).toBe(
      "You do not have permission to create game types",
    );
    expect(result.data).toBeUndefined();
  });

  it("should fail if name already exists", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.checkGameTypeNameExists).mockResolvedValue(true);

    const result = await createGameType(TEST_IDS.USER_ID, {
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
      leagueId: TEST_IDS.LEAGUE_ID,
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A game type with this name already exists",
    );
  });

  it("should fail if league is at game type limit", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.checkGameTypeNameExists).mockResolvedValue(false);
    vi.mocked(limits.canLeagueAddGameType).mockResolvedValue({
      allowed: false,
      limitInfo: {
        current: MAX_GAME_TYPES_PER_LEAGUE,
        max: MAX_GAME_TYPES_PER_LEAGUE,
        isAtLimit: true,
        isNearLimit: false,
      },
      message: `This league has reached its maximum of ${MAX_GAME_TYPES_PER_LEAGUE} game types`,
    });

    const result = await createGameType(TEST_IDS.USER_ID, {
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
      leagueId: TEST_IDS.LEAGUE_ID,
    });

    expect(result.error).toBe(
      `This league has reached its maximum of ${MAX_GAME_TYPES_PER_LEAGUE} game types`,
    );
  });

  it("should fail with invalid input", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    const result = await createGameType(TEST_IDS.USER_ID, {
      name: "",
      category: "invalid",
      leagueId: TEST_IDS.LEAGUE_ID,
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });
});

describe("getGameType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a game type successfully", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    const result = await getGameType(TEST_IDS.USER_ID, TEST_IDS.GAME_TYPE_ID);

    expect(result.data).toEqual(mockGameType);
    expect(result.error).toBeUndefined();
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await getGameType(TEST_IDS.USER_ID, TEST_IDS.GAME_TYPE_ID);

    expect(result.error).toBe("Game type not found");
    expect(result.data).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getGameType(TEST_IDS.USER_ID, TEST_IDS.GAME_TYPE_ID);

    expect(result.error).toBe("You are not a member of this league");
    expect(result.data).toBeUndefined();
  });
});

describe("getLeagueGameTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all game types for a league", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.getGameTypesByLeagueId).mockResolvedValue([
      mockGameType,
    ]);

    const result = await getLeagueGameTypes(
      TEST_IDS.USER_ID,
      TEST_IDS.LEAGUE_ID,
    );

    expect(result.data).toEqual([mockGameType]);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getLeagueGameTypes(
      TEST_IDS.USER_ID,
      TEST_IDS.LEAGUE_ID,
    );

    expect(result.error).toBe("You are not a member of this league");
    expect(result.data).toBeUndefined();
  });
});

describe("updateGameType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update a game type successfully", async () => {
    const updatedGameType = { ...mockGameType, name: "Updated Ping Pong" };
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.checkGameTypeNameExists).mockResolvedValue(false);
    vi.mocked(dbGameTypes.updateGameType).mockResolvedValue(updatedGameType);

    const result = await updateGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.GAME_TYPE_ID },
      {
        category: GameCategory.HEAD_TO_HEAD,
        name: "Updated Ping Pong",
      },
    );

    expect(result.data).toEqual(updatedGameType);
    expect(result.error).toBeUndefined();
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await updateGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.GAME_TYPE_ID },
      {
        category: GameCategory.HEAD_TO_HEAD,
        name: "Updated",
      },
    );

    expect(result.error).toBe("Game type not found");
  });

  it("should fail if user does not have permission", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      role: "member",
    });

    const result = await updateGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.GAME_TYPE_ID },
      {
        category: GameCategory.HEAD_TO_HEAD,
        name: "Updated",
      },
    );

    expect(result.error).toBe("You do not have permission to edit game types");
  });

  it("should fail if new name already exists", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.checkGameTypeNameExists).mockResolvedValue(true);

    const result = await updateGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.GAME_TYPE_ID },
      {
        category: GameCategory.HEAD_TO_HEAD,
        name: "Existing Name",
      },
    );

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A game type with this name already exists",
    );
  });
});

describe("archiveGameType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should archive a game type successfully", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.archiveGameType).mockResolvedValue({
      ...mockGameType,
      isArchived: true,
    });

    const result = await archiveGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBeUndefined();
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await archiveGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBe("Game type not found");
  });

  it("should fail if user does not have permission", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      role: "member",
    });

    const result = await archiveGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBe(
      "You do not have permission to archive game types",
    );
  });
});

describe("deleteGameType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a game type successfully", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.deleteGameType).mockResolvedValue(true);

    const result = await deleteGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBeUndefined();
  });

  it("should fail if game type not found", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(undefined);

    const result = await deleteGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBe("Game type not found");
  });

  it("should fail if user does not have permission", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
      ...mockMember,
      role: "member",
    });

    const result = await deleteGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBe(
      "You do not have permission to delete game types",
    );
  });

  it("should fail if delete operation fails", async () => {
    vi.mocked(dbGameTypes.getGameTypeById).mockResolvedValue(mockGameType);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbGameTypes.deleteGameType).mockResolvedValue(false);

    const result = await deleteGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.GAME_TYPE_ID,
    });

    expect(result.error).toBe("Failed to delete game type");
  });
});
