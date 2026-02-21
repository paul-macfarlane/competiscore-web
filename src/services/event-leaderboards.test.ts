import * as dbEvents from "@/db/events";
import { EventParticipantRole, GameCategory } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getEventActivity,
  getEventHighScoreLeaderboard,
  getEventLeaderboard,
} from "./event-leaderboards";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  getEventActivity: vi.fn(),
  getEventGameTypeById: vi.fn(),
  getEventHighScoreIndividualLeaderboard: vi.fn(),
  getEventLeaderboard: vi.fn(),
  getEventParticipant: vi.fn(),
  getEventParticipants: vi.fn(),
  getHighScoreSessionById: vi.fn(),
}));

vi.mock("@/db/users", () => ({
  searchUsersByQuery: vi.fn(),
}));

const mockOrganizerMember = {
  id: TEST_IDS.EVENT_MEMBER_ID,
  eventId: TEST_IDS.EVENT_ID,
  userId: TEST_IDS.USER_ID,
  role: EventParticipantRole.ORGANIZER,
  joinedAt: new Date(),
};

describe("getEventLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a member", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await getEventLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_ID,
    );

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns leaderboard data", async () => {
    const mockLeaderboard = [
      {
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        teamName: "Team Alpha",
        teamLogo: null,
        totalPoints: 10,
      },
    ];
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventLeaderboard).mockResolvedValue(
      mockLeaderboard as never,
    );

    const result = await getEventLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_ID,
    );

    expect(result.data).toEqual(mockLeaderboard);
  });
});

describe("getEventActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a member", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await getEventActivity(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns activity data", async () => {
    const mockActivityResult = { items: [], totalCount: 0 };
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventActivity).mockResolvedValue(
      mockActivityResult as never,
    );

    const result = await getEventActivity(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.data?.items).toEqual([]);
    expect(result.data?.totalCount).toBe(0);
  });
});

const mockSession = {
  id: TEST_IDS.EVENT_SESSION_ID,
  eventId: TEST_IDS.EVENT_ID,
  eventGameTypeId: TEST_IDS.EVENT_GAME_TYPE_ID,
  name: "Round 1",
  description: null,
  status: "open" as const,
  placementPointConfig: null,
  openedById: TEST_IDS.USER_ID,
  closedById: null,
  openedAt: new Date(),
  closedAt: null,
  createdAt: new Date(),
};

const mockHighScoreGameType = {
  id: TEST_IDS.EVENT_GAME_TYPE_ID,
  eventId: TEST_IDS.EVENT_ID,
  name: "Darts",
  category: GameCategory.HIGH_SCORE,
  config: JSON.stringify({
    scoreOrder: "highest_wins",
    scoreDescription: "Points",
    participantType: "individual",
  }),
  isArchived: false,
  createdAt: new Date(),
};

describe("getEventHighScoreLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when session not found", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(undefined);

    const result = await getEventHighScoreLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_SESSION_ID,
    );

    expect(result.error).toBe("Session not found");
  });

  it("returns error when user is not a participant", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await getEventHighScoreLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_SESSION_ID,
    );

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when game type not found", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(undefined);

    const result = await getEventHighScoreLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_SESSION_ID,
    );

    expect(result.error).toBe("Game type not found in this event");
  });

  it("returns error when game type is not HIGH_SCORE category", async () => {
    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue({
      ...mockHighScoreGameType,
      category: GameCategory.HEAD_TO_HEAD,
    } as never);

    const result = await getEventHighScoreLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_SESSION_ID,
    );

    expect(result.error).toBe("This game type is not a high score game type");
  });

  it("returns leaderboard data scoped to session", async () => {
    const mockLeaderboardResult = {
      entries: [
        {
          rank: 1,
          user: {
            id: TEST_IDS.USER_ID,
            name: "Alice",
            username: "alice",
            image: null,
          },
          placeholderParticipant: null,
          teamName: null,
          teamColor: null,
          bestScore: 100,
          submissionCount: 2,
          scoreHistory: [
            { score: 100, achievedAt: new Date() },
            { score: 80, achievedAt: new Date() },
          ],
        },
      ],
      total: 1,
    };

    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      mockSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockHighScoreGameType as never,
    );
    vi.mocked(
      dbEvents.getEventHighScoreIndividualLeaderboard,
    ).mockResolvedValue(mockLeaderboardResult as never);

    const result = await getEventHighScoreLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_SESSION_ID,
    );

    expect(result.data).toBeDefined();
    expect(result.data!.entries).toEqual(mockLeaderboardResult.entries);
    expect(result.data!.total).toBe(1);
    expect(result.data!.sessionId).toBe(TEST_IDS.EVENT_SESSION_ID);
    expect(result.data!.eventId).toBe(TEST_IDS.EVENT_ID);
    expect(result.data!.gameTypeId).toBe(TEST_IDS.EVENT_GAME_TYPE_ID);
    expect(result.data!.isOpen).toBe(true);
  });

  it("returns isOpen false for closed sessions", async () => {
    const closedSession = { ...mockSession, status: "closed" as const };

    vi.mocked(dbEvents.getHighScoreSessionById).mockResolvedValue(
      closedSession as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventGameTypeById).mockResolvedValue(
      mockHighScoreGameType as never,
    );
    vi.mocked(
      dbEvents.getEventHighScoreIndividualLeaderboard,
    ).mockResolvedValue({ entries: [], total: 0 } as never);

    const result = await getEventHighScoreLeaderboard(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_SESSION_ID,
    );

    expect(result.data).toBeDefined();
    expect(result.data!.isOpen).toBe(false);
  });
});
