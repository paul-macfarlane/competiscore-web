import * as dbEvents from "@/db/events";
import {
  EventParticipantRole,
  EventStatus,
  GameCategory,
} from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordEventFFAMatch, recordEventH2HMatch } from "./event-matches";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((cb: (tx: object) => Promise<unknown>) => cb({})),
  db: {},
}));

vi.mock("@/db/events", () => ({
  createEventMatch: vi.fn(),
  createEventMatchParticipants: vi.fn(),
  createEventPointEntries: vi.fn(),
  createEventPointEntryParticipants: vi.fn(),
  getEventById: vi.fn(),
  getEventGameTypeById: vi.fn(),
  getEventParticipant: vi.fn(),
  getTeamForUser: vi.fn(),
  getTeamForPlaceholder: vi.fn(),
}));

const mockActiveEvent = {
  id: TEST_IDS.EVENT_ID,
  name: "Test Event",
  status: EventStatus.ACTIVE,
  createdById: TEST_IDS.USER_ID,
};

const mockDraftEvent = {
  ...mockActiveEvent,
  status: EventStatus.DRAFT,
};

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
  category: GameCategory.HEAD_TO_HEAD,
  config: JSON.stringify({
    scoringType: "win_loss",
    drawsAllowed: false,
    participantType: "individual",
    minPlayersPerSide: 1,
    maxPlayersPerSide: 1,
  }),
  isArchived: false,
};

const mockFFAGameType = {
  ...mockGameType,
  name: "Mario Kart",
  category: GameCategory.FREE_FOR_ALL,
  config: JSON.stringify({
    scoringType: "ranked_finish",
    participantType: "individual",
  }),
};

const mockMatch = {
  id: TEST_IDS.EVENT_MATCH_ID,
  eventId: TEST_IDS.EVENT_ID,
  eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
  playedAt: new Date(),
  recorderId: TEST_IDS.USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTeam1 = {
  id: TEST_IDS.EVENT_TEAM_ID,
  eventId: TEST_IDS.EVENT_ID,
  name: "Team Alpha",
  logo: null,
  createdAt: new Date(),
};

const mockTeam2 = {
  id: TEST_IDS.EVENT_TEAM_ID_2,
  eventId: TEST_IDS.EVENT_ID,
  name: "Team Beta",
  logo: null,
  createdAt: new Date(),
};

describe("recordEventH2HMatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when event is not active", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockDraftEvent as never);

    const result = await recordEventH2HMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      side1Participants: [{ userId: TEST_IDS.USER_ID }],
      side2Participants: [{ userId: TEST_IDS.USER_ID_2 }],
      winningSide: "side1",
      winPoints: 3,
      lossPoints: 0,
    });

    expect(result.error).toBe("Matches can only be recorded for active events");
  });

  it("returns error when participant records match they're not involved in", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );

    const result = await recordEventH2HMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      side1Participants: [{ userId: TEST_IDS.USER_ID_2 }],
      side2Participants: [{ userId: TEST_IDS.USER_ID_3 }],
      winningSide: "side1",
      winPoints: 3,
      lossPoints: 0,
    });

    expect(result.error).toBe("You can only record matches you're involved in");
  });

  it("returns error when game type is not H2H", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockFFAGameType as never,
    );

    const result = await recordEventH2HMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      side1Participants: [{ userId: TEST_IDS.USER_ID }],
      side2Participants: [{ userId: TEST_IDS.USER_ID_2 }],
      winningSide: "side1",
      winPoints: 3,
      lossPoints: 0,
    });

    expect(result.error).toBe(
      "This game type is not configured for head-to-head matches",
    );
  });

  it("returns error when participant is not on a team", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(undefined);

    const result = await recordEventH2HMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      side1Participants: [{ userId: TEST_IDS.USER_ID }],
      side2Participants: [{ userId: TEST_IDS.USER_ID_2 }],
      winningSide: "side1",
      winPoints: 3,
      lossPoints: 0,
    });

    expect(result.error).toBe("Participant is not on a team");
  });

  it("returns success creating match with individual participants", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getTeamForUser)
      .mockResolvedValueOnce(mockTeam1 as never)
      .mockResolvedValueOnce(mockTeam2 as never);
    vi.mocked(dbEvents.createEventMatch).mockResolvedValue(mockMatch as never);
    vi.mocked(dbEvents.createEventMatchParticipants).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([
      { id: "pe-1" },
      { id: "pe-2" },
    ] as never);

    const result = await recordEventH2HMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      side1Participants: [{ userId: TEST_IDS.USER_ID }],
      side2Participants: [{ userId: TEST_IDS.USER_ID_2 }],
      winningSide: "side1",
      winPoints: 3,
      lossPoints: 0,
    });

    expect(result.data?.match.id).toBe(TEST_IDS.EVENT_MATCH_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("returns success with placeholder participants", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(mockTeam1 as never);
    vi.mocked(dbEvents.getTeamForPlaceholder).mockResolvedValue(
      mockTeam2 as never,
    );
    vi.mocked(dbEvents.createEventMatch).mockResolvedValue(mockMatch as never);
    vi.mocked(dbEvents.createEventMatchParticipants).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([
      { id: "pe-1" },
      { id: "pe-2" },
    ] as never);

    const result = await recordEventH2HMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      side1Participants: [{ userId: TEST_IDS.USER_ID }],
      side2Participants: [
        { eventPlaceholderParticipantId: TEST_IDS.EVENT_PLACEHOLDER_ID },
      ],
      winningSide: "side1",
      winPoints: 3,
      lossPoints: 0,
    });

    expect(result.data?.match.id).toBe(TEST_IDS.EVENT_MATCH_ID);
  });
});

describe("recordEventFFAMatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when event is not active", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockDraftEvent as never);

    const result = await recordEventFFAMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      participants: [
        { userId: TEST_IDS.USER_ID, rank: 1, points: 3 },
        { userId: TEST_IDS.USER_ID_2, rank: 2, points: 1 },
      ],
    });

    expect(result.error).toBe("Matches can only be recorded for active events");
  });

  it("returns error when game type is not FFA", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );

    const result = await recordEventFFAMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      participants: [
        { userId: TEST_IDS.USER_ID, rank: 1, points: 3 },
        { userId: TEST_IDS.USER_ID_2, rank: 2, points: 1 },
      ],
    });

    expect(result.error).toBe(
      "This game type is not configured for free-for-all matches",
    );
  });

  it("returns error when participant is not on a team", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockFFAGameType as never,
    );
    vi.mocked(dbEvents.getTeamForUser)
      .mockResolvedValueOnce(mockTeam1 as never)
      .mockResolvedValueOnce(undefined);

    const result = await recordEventFFAMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      participants: [
        { userId: TEST_IDS.USER_ID, rank: 1, points: 3 },
        { userId: TEST_IDS.USER_ID_2, rank: 2, points: 1 },
      ],
    });

    expect(result.error).toBe("Participant is not on a team");
  });

  it("returns success creating match with individual participants", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockFFAGameType as never,
    );
    vi.mocked(dbEvents.getTeamForUser)
      .mockResolvedValueOnce(mockTeam1 as never)
      .mockResolvedValueOnce(mockTeam2 as never);
    vi.mocked(dbEvents.createEventMatch).mockResolvedValue(mockMatch as never);
    vi.mocked(dbEvents.createEventMatchParticipants).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([
      { id: "pe-1" },
      { id: "pe-2" },
    ] as never);

    const result = await recordEventFFAMatch(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      playedAt: new Date(Date.now() - 1000),
      participants: [
        { userId: TEST_IDS.USER_ID, rank: 1, points: 3 },
        { userId: TEST_IDS.USER_ID_2, rank: 2, points: 1 },
      ],
    });

    expect(result.data?.match.id).toBe(TEST_IDS.EVENT_MATCH_ID);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});
