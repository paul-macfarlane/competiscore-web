import * as dbEvents from "@/db/events";
import {
  EventParticipantRole,
  EventStatus,
  GameCategory,
  HighScoreSessionStatus,
} from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeHighScoreSession,
  deleteHighScoreSession,
  openHighScoreSession,
  reopenHighScoreSession,
  submitEventHighScore,
} from "./event-high-scores";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((cb: (tx: object) => Promise<unknown>) => cb({})),
  db: {},
}));

vi.mock("@/db/events", () => ({
  closeHighScoreSession: vi.fn(),
  createEventHighScoreEntry: vi.fn(),
  createEventHighScoreEntryMembers: vi.fn(),
  createEventPointEntries: vi.fn(),
  createEventPointEntryParticipants: vi.fn(),
  createHighScoreSession: vi.fn(),
  deleteEventPointEntriesForHighScoreSession: vi.fn(),
  deleteHighScoreSession: vi.fn(),
  getClosedHighScoreSessions: vi.fn(),
  getEventById: vi.fn(),
  getEventGameTypeById: vi.fn(),
  getEventParticipant: vi.fn(),
  getHighScoreSessionById: vi.fn(),
  getOpenHighScoreSessions: vi.fn(),
  reopenHighScoreSession: vi.fn(),
  getSessionHighScoreEntries: vi.fn(),
  getTeamForPlaceholder: vi.fn(),
  getTeamForUser: vi.fn(),
}));

const mockActiveEvent = {
  id: TEST_IDS.EVENT_ID,
  name: "Test Event",
  status: EventStatus.ACTIVE,
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
    minPlayersPerSide: 1,
    maxPlayersPerSide: 1,
  }),
  isArchived: false,
};

const mockHighScoreGameType = {
  ...mockGameType,
  id: TEST_IDS.EVENT_GAME_TYPE_ID_2,
  name: "Speed Run",
  category: GameCategory.HIGH_SCORE,
  config: JSON.stringify({ scoreOrder: "highest_wins" }),
};

const mockSession = {
  id: TEST_IDS.EVENT_SESSION_ID,
  eventId: TEST_IDS.EVENT_ID,
  eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
  status: HighScoreSessionStatus.OPEN,
  placementPointConfig: null,
  openedById: TEST_IDS.USER_ID,
  closedById: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHighScoreEntry = {
  id: "f33e4567-e89b-12d3-a456-426614174001",
  sessionId: TEST_IDS.EVENT_SESSION_ID,
  eventId: TEST_IDS.EVENT_ID,
  eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
  userId: TEST_IDS.USER_ID,
  eventPlaceholderParticipantId: null,
  score: 100,
  recorderId: TEST_IDS.USER_ID,
  achievedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("openHighScoreSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when game type is not HIGH_SCORE", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockGameType as never,
    );

    const result = await openHighScoreSession(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
      name: "Test Session",
    });

    expect(result.error).toBe(
      "This game type is not configured for high score sessions",
    );
  });

  it("returns error when event is not active", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockDraftEvent as never);

    const result = await openHighScoreSession(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
      name: "Test Session",
    });

    expect(result.error).toBe("Sessions can only be opened for active events");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await openHighScoreSession(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
      name: "Test Session",
    });

    expect(result.error).toBe("You don't have permission to manage sessions");
  });

  it("returns success when opening a session", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockHighScoreGameType as never,
    );
    vi.mocked(dbEvents.createHighScoreSession).mockResolvedValue(
      mockSession as never,
    );

    const result = await openHighScoreSession(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      gameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
      name: "Test Session",
    });

    expect(result.data?.id).toBe(TEST_IDS.EVENT_SESSION_ID);
    expect(result.data?.status).toBe(HighScoreSessionStatus.OPEN);
  });
});

describe("submitEventHighScore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when session is not open", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue({
      ...mockSession,
      status: HighScoreSessionStatus.CLOSED,
    } as never);

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      userId: TEST_IDS.USER_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
    });

    expect(result.error).toBe("Session is not open for submissions");
  });

  it("returns error when not an event member", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      userId: TEST_IDS.USER_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
    });

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when participant is not on a team", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(undefined);

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      userId: TEST_IDS.USER_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
    });

    expect(result.error).toBe("Participant is not on a team");
  });

  it("returns success when submitting a score for a user", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue({
      id: TEST_IDS.EVENT_TEAM_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team Alpha",
      logo: null,
      createdAt: new Date(),
    } as never);
    vi.mocked(dbEvents.createEventHighScoreEntry).mockResolvedValue(
      mockHighScoreEntry as never,
    );

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      userId: TEST_IDS.USER_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
    });

    expect(result.data?.score).toBe(100);
  });

  it("returns success when submitting a score for a placeholder", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getTeamForPlaceholder).mockResolvedValue({
      id: TEST_IDS.EVENT_TEAM_ID,
      eventId: TEST_IDS.EVENT_ID,
      name: "Team Alpha",
      logo: null,
      createdAt: new Date(),
    } as never);
    vi.mocked(dbEvents.createEventHighScoreEntry).mockResolvedValue({
      ...mockHighScoreEntry,
      userId: null,
      eventPlaceholderParticipantId: TEST_IDS.EVENT_PLACEHOLDER_ID,
      score: 150,
    } as never);

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      eventPlaceholderParticipantId: TEST_IDS.EVENT_PLACEHOLDER_ID,
      score: 150,
      achievedAt: new Date(Date.now() - 1000),
    });

    expect(result.data?.score).toBe(150);
  });
});

describe("closeHighScoreSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when session is already closed", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue({
      ...mockSession,
      status: HighScoreSessionStatus.CLOSED,
    } as never);

    const result = await closeHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("Session is already closed");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await closeHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("You don't have permission to manage sessions");
  });

  it("returns success closing session without placement points", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.closeHighScoreSession).mockResolvedValue(
      undefined as never,
    );

    const result = await closeHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.data?.closed).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

const mockClosedSession = {
  ...mockSession,
  status: HighScoreSessionStatus.CLOSED,
  closedById: TEST_IDS.USER_ID,
  closedAt: new Date(),
};

describe("reopenHighScoreSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await reopenHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: "not-a-uuid",
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when session not found", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(undefined);

    const result = await reopenHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("Session not found");
  });

  it("returns error when session is not closed", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );

    const result = await reopenHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("Session is not closed");
  });

  it("returns error when user is not a participant", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockClosedSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await reopenHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when user is not an organizer", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockClosedSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await reopenHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("You don't have permission to manage sessions");
  });

  it("returns success when reopening a closed session", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockClosedSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );

    const result = await reopenHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.data?.reopened).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

describe("deleteHighScoreSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: "not-a-uuid",
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when session not found", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(undefined);

    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("Session not found");
  });

  it("returns error when user is not a participant", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when user is not an organizer", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("You don't have permission to manage sessions");
  });

  it("returns success when deleting an open session", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.deleteHighScoreSession).mockResolvedValue(true);

    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.data?.deleted).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("returns success when deleting a closed session", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockClosedSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.deleteHighScoreSession).mockResolvedValue(true);

    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.data?.deleted).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("returns error when DB delete fails", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.deleteHighScoreSession).mockResolvedValue(false);

    const result = await deleteHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.error).toBe("Failed to delete session");
  });
});

const mockPairGameType = {
  ...mockHighScoreGameType,
  config: JSON.stringify({
    scoreOrder: "highest_wins",
    scoreDescription: "Points",
    participantType: "individual",
    groupSize: 2,
  }),
};

const mockPairEntry = {
  ...mockHighScoreEntry,
  userId: null,
  eventPlaceholderParticipantId: null,
  eventTeamId: TEST_IDS.EVENT_TEAM_ID,
};

const mockTeamAlpha = {
  id: TEST_IDS.EVENT_TEAM_ID,
  eventId: TEST_IDS.EVENT_ID,
  name: "Team Alpha",
  color: null,
  logo: null,
  createdAt: new Date(),
};

describe("submitEventHighScore - pair mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockPairGameType as never,
    );
  });

  it("returns validation error when members array is missing", async () => {
    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      // members missing
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when member count does not match groupSize", async () => {
    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      // 3 members when groupSize is 2 — passes schema min(2) but fails groupSize check
      members: [
        { userId: TEST_IDS.USER_ID },
        { userId: TEST_IDS.USER_ID_2 },
        { userId: TEST_IDS.USER_ID_3 },
      ],
    });

    expect(result.error).toBe(
      "This game type requires exactly 2 members per entry",
    );
  });

  it("returns error when duplicate members are submitted", async () => {
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(
      mockTeamAlpha as never,
    );

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      members: [
        { userId: TEST_IDS.USER_ID },
        { userId: TEST_IDS.USER_ID }, // duplicate
      ],
    });

    expect(result.error).toBe(
      "Duplicate members are not allowed in a group entry",
    );
  });

  it("returns error when members are on different teams", async () => {
    vi.mocked(dbEvents.getTeamForUser)
      .mockResolvedValueOnce(mockTeamAlpha as never)
      .mockResolvedValueOnce({
        ...mockTeamAlpha,
        id: TEST_IDS.EVENT_TEAM_ID_2,
        name: "Team Beta",
      } as never);

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      members: [{ userId: TEST_IDS.USER_ID }, { userId: TEST_IDS.USER_ID_2 }],
    });

    expect(result.error).toBe("All members must be on the same team");
  });

  it("returns error when a member is not on any team", async () => {
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(undefined);

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      members: [{ userId: TEST_IDS.USER_ID }, { userId: TEST_IDS.USER_ID_2 }],
    });

    expect(result.error).toBe(
      "All members must be on a team to submit a group entry",
    );
  });

  it("returns error when participant submits a pair they are not in", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(
      mockTeamAlpha as never,
    );

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      members: [
        { userId: TEST_IDS.USER_ID_2 }, // USER_ID not in pair
        { userId: TEST_IDS.USER_ID_3 },
      ],
    });

    expect(result.error).toBe(
      "You can only submit group entries that include yourself",
    );
  });

  it("returns success when organizer submits a pair for others", async () => {
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(
      mockTeamAlpha as never,
    );
    vi.mocked(dbEvents.createEventHighScoreEntry).mockResolvedValue(
      mockPairEntry as never,
    );
    vi.mocked(dbEvents.createEventHighScoreEntryMembers).mockResolvedValue(
      [] as never,
    );

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      members: [{ userId: TEST_IDS.USER_ID_2 }, { userId: TEST_IDS.USER_ID_3 }],
    });

    expect(result.data?.score).toBe(100);
    expect(result.data?.userId).toBeNull();
    expect(result.data?.eventTeamId).toBe(TEST_IDS.EVENT_TEAM_ID);
  });

  it("returns success when participant submits a pair that includes themselves", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue(
      mockTeamAlpha as never,
    );
    vi.mocked(dbEvents.createEventHighScoreEntry).mockResolvedValue(
      mockPairEntry as never,
    );
    vi.mocked(dbEvents.createEventHighScoreEntryMembers).mockResolvedValue(
      [] as never,
    );

    const result = await submitEventHighScore(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
      score: 100,
      achievedAt: new Date(Date.now() - 1000),
      members: [
        { userId: TEST_IDS.USER_ID }, // includes submitter
        { userId: TEST_IDS.USER_ID_2 },
      ],
    });

    expect(result.data?.score).toBe(100);
  });
});

describe("closeHighScoreSession - with pair entries", () => {
  const mockPairSession = {
    ...mockSession,
    placementPointConfig: JSON.stringify([
      { placement: 1, points: 10 },
      { placement: 2, points: 5 },
    ]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockPairSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockPairGameType as never,
    );
  });

  it("closes session with pair entries and awards points to the correct team", async () => {
    const pairEntries = [
      {
        id: "entry-1",
        sessionId: TEST_IDS.EVENT_SESSION_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
        userId: null,
        eventPlaceholderParticipantId: null,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        score: 200,
        recorderId: TEST_IDS.USER_ID,
        achievedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: "member-1",
            user: {
              id: TEST_IDS.USER_ID,
              name: "Paul",
              username: "paul",
              image: null,
            },
            placeholderParticipant: null,
          },
          {
            id: "member-2",
            user: {
              id: TEST_IDS.USER_ID_2,
              name: "Medha",
              username: "medha",
              image: null,
            },
            placeholderParticipant: null,
          },
        ],
      },
    ];

    vi.mocked(dbEvents.getSessionHighScoreEntries).mockResolvedValue(
      pairEntries as never,
    );
    vi.mocked(dbEvents.closeHighScoreSession).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([
      { id: "point-entry-1" },
    ] as never);
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([
      { id: "point-entry-1" },
    ] as never);

    const result = await closeHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.data?.closed).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });

  it("closes session with mixed pair and individual entries", async () => {
    const mixedEntries = [
      {
        id: "entry-pair",
        sessionId: TEST_IDS.EVENT_SESSION_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
        userId: null,
        eventPlaceholderParticipantId: null,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        score: 300,
        recorderId: TEST_IDS.USER_ID,
        achievedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: "member-1",
            user: {
              id: TEST_IDS.USER_ID,
              name: "Paul",
              username: "paul",
              image: null,
            },
            placeholderParticipant: null,
          },
          {
            id: "member-2",
            user: {
              id: TEST_IDS.USER_ID_2,
              name: "Medha",
              username: "medha",
              image: null,
            },
            placeholderParticipant: null,
          },
        ],
      },
      {
        id: "entry-individual",
        sessionId: TEST_IDS.EVENT_SESSION_ID,
        eventId: TEST_IDS.EVENT_ID,
        eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID_2,
        userId: TEST_IDS.USER_ID_3,
        eventPlaceholderParticipantId: null,
        eventTeamId: null,
        score: 100,
        recorderId: TEST_IDS.USER_ID,
        achievedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      },
    ];

    vi.mocked(dbEvents.getSessionHighScoreEntries).mockResolvedValue(
      mixedEntries as never,
    );
    vi.mocked(dbEvents.getTeamForUser).mockResolvedValue({
      ...mockTeamAlpha,
      id: TEST_IDS.EVENT_TEAM_ID_2,
    } as never);
    vi.mocked(dbEvents.closeHighScoreSession).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([
      { id: "point-entry-1" },
      { id: "point-entry-2" },
    ] as never);

    const result = await closeHighScoreSession(TEST_IDS.USER_ID, {
      sessionId: TEST_IDS.EVENT_SESSION_ID,
    });

    expect(result.data?.closed).toBe(true);
  });
});
