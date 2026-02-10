import * as dbEvents from "@/db/events";
import { EventParticipantRole, GameCategory } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_EVENT_GAME_TYPES } from "./constants";
import {
  archiveEventGameType,
  createEventGameType,
  deleteEventGameType,
  getEventGameType,
  unarchiveEventGameType,
  updateEventGameType,
} from "./event-game-types";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  archiveEventGameType: vi.fn(),
  checkEventGameTypeNameExists: vi.fn(),
  countEventGameTypes: vi.fn(),
  createEventGameType: vi.fn(),
  deleteEventGameType: vi.fn(),
  getEventById: vi.fn(),
  getEventGameTypeById: vi.fn(),
  getEventGameTypes: vi.fn(),
  getEventParticipant: vi.fn(),
  unarchiveEventGameType: vi.fn(),
  updateEventGameType: vi.fn(),
}));

const mockOrganizerMember = {
  id: TEST_IDS.EVENT_MEMBER_ID,
  eventId: TEST_IDS.EVENT_ID,
  userId: TEST_IDS.USER_ID,
  role: EventParticipantRole.ORGANIZER,
  joinedAt: new Date(),
};

const mockParticipantMember = {
  ...mockOrganizerMember,
  role: EventParticipantRole.PARTICIPANT,
};

const mockGameType = {
  id: TEST_IDS.EVENT_GAME_TYPE_ID,
  eventId: TEST_IDS.EVENT_ID,
  name: "Ping Pong",
  description: null,
  logo: null,
  category: GameCategory.HEAD_TO_HEAD,
  config: JSON.stringify({
    scoringType: "win_loss",
    drawsAllowed: false,
    participantType: "individual",
    minPlayersPerSide: 1,
    maxPlayersPerSide: 1,
  }),
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createEventGameType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await createEventGameType(TEST_IDS.USER_ID, {
      name: "",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await createEventGameType(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
    });

    expect(result.error).toBe("You don't have permission to manage game types");
  });

  it("returns error at game type limit", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue({
      status: "active",
    } as never);
    vi.mocked(dbEvents.checkEventGameTypeNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.countEventGameTypes).mockResolvedValue(
      MAX_EVENT_GAME_TYPES,
    );

    const result = await createEventGameType(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "New Game",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
    });

    expect(result.error).toBe(
      "Event can have at most " + MAX_EVENT_GAME_TYPES + " game types",
    );
  });

  it("returns error for duplicate name", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue({
      status: "active",
    } as never);
    vi.mocked(dbEvents.checkEventGameTypeNameExists).mockResolvedValue(true);

    const result = await createEventGameType(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A game type with this name already exists",
    );
  });

  it("returns success when creating a game type", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue({
      status: "active",
    } as never);
    vi.mocked(dbEvents.checkEventGameTypeNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.countEventGameTypes).mockResolvedValue(0);
    vi.mocked(dbEvents.createEventGameType).mockResolvedValue(
      mockGameType as never,
    );

    const result = await createEventGameType(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Ping Pong",
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: "win_loss",
        drawsAllowed: false,
        participantType: "individual",
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
    });

    expect(result.data?.name).toBe("Ping Pong");
  });
});

describe("getEventGameType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when game type not found", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(undefined);

    const result = await getEventGameType(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_GAME_TYPE_ID,
    );

    expect(result.error).toBe("Game type not found");
  });

  it("returns error when not a member", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(null as never);

    const result = await getEventGameType(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_GAME_TYPE_ID,
    );

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns game type on success", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );

    const result = await getEventGameType(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_GAME_TYPE_ID,
    );

    expect(result.data?.name).toBe("Ping Pong");
  });
});

describe("updateEventGameType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid id", async () => {
    const result = await updateEventGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: "invalid" },
      { category: GameCategory.HEAD_TO_HEAD, name: "Updated" },
    );

    expect(result.error).toBe("Validation failed");
  });

  it("returns error when game type not found", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(undefined);

    const result = await updateEventGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID },
      { category: GameCategory.HEAD_TO_HEAD, name: "Updated" },
    );

    expect(result.error).toBe("Game type not found");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await updateEventGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID },
      { category: GameCategory.HEAD_TO_HEAD, name: "Updated" },
    );

    expect(result.error).toBe("You don't have permission to edit game types");
  });

  it("returns error for duplicate name", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.checkEventGameTypeNameExists).mockResolvedValue(true);

    const result = await updateEventGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID },
      { category: GameCategory.HEAD_TO_HEAD, name: "Duplicate Name" },
    );

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A game type with this name already exists",
    );
  });

  it("returns success when updating", async () => {
    const updatedGameType = { ...mockGameType, name: "Updated Name" };
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.checkEventGameTypeNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.updateEventGameType).mockResolvedValue(
      updatedGameType as never,
    );

    const result = await updateEventGameType(
      TEST_IDS.USER_ID,
      { gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID },
      { category: GameCategory.HEAD_TO_HEAD, name: "Updated Name" },
    );

    expect(result.data?.name).toBe("Updated Name");
  });
});

describe("archiveEventGameType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await archiveEventGameType(TEST_IDS.USER_ID, {});

    expect(result.error).toBe("Validation failed");
  });

  it("returns error when game type not found", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(undefined);

    const result = await archiveEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe("Game type not found");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await archiveEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe(
      "You don't have permission to archive game types",
    );
  });

  it("returns success when archiving", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.archiveEventGameType).mockResolvedValue({
      ...mockGameType,
      isArchived: true,
    } as never);

    const result = await archiveEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBeUndefined();
  });
});

describe("unarchiveEventGameType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await unarchiveEventGameType(TEST_IDS.USER_ID, {});

    expect(result.error).toBe("Validation failed");
  });

  it("returns error when game type not found", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(undefined);

    const result = await unarchiveEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe("Game type not found");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await unarchiveEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe(
      "You don't have permission to unarchive game types",
    );
  });

  it("returns success when unarchiving", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue({
      ...mockGameType,
      isArchived: true,
    } as never);
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.unarchiveEventGameType).mockResolvedValue(
      mockGameType as never,
    );

    const result = await unarchiveEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBeUndefined();
  });
});

describe("deleteEventGameType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await deleteEventGameType(TEST_IDS.USER_ID, {});

    expect(result.error).toBe("Validation failed");
  });

  it("returns error when game type not found", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(undefined);

    const result = await deleteEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe("Game type not found");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await deleteEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe("You don't have permission to delete game types");
  });

  it("returns error when delete fails", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.deleteEventGameType).mockResolvedValue(false);

    const result = await deleteEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBe("Failed to delete game type");
  });

  it("returns success when deleting", async () => {
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.deleteEventGameType).mockResolvedValue(true);

    const result = await deleteEventGameType(TEST_IDS.USER_ID, {
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
    });

    expect(result.error).toBeUndefined();
  });
});
