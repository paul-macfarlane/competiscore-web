import * as dbEvents from "@/db/events";
import { EventParticipantRole } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEventActivity, getEventLeaderboard } from "./event-leaderboards";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  getEventActivity: vi.fn(),
  getEventLeaderboard: vi.fn(),
  getEventParticipant: vi.fn(),
  getEventParticipants: vi.fn(),
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
