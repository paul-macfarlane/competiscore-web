import {
  getEnrichedEventPointEntries,
  getEventLeaderboard,
  getEventParticipant,
} from "@/db/events";
import type { EnrichedPointEntry, EventLeaderboardEntry } from "@/db/events";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEventMetrics } from "./event-metrics";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  getEventParticipant: vi.fn(),
  getEnrichedEventPointEntries: vi.fn(),
  getEventLeaderboard: vi.fn(),
}));

function makeEntry(
  overrides: Partial<EnrichedPointEntry> & { id: string },
): EnrichedPointEntry {
  return {
    eventId: TEST_IDS.EVENT_ID,
    category: "h2h_match",
    outcome: "win",
    points: 3,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    eventTeamId: TEST_IDS.EVENT_TEAM_ID,
    teamName: "Team A",
    teamColor: "red",
    participants: [
      {
        userId: TEST_IDS.USER_ID,
        userName: "User 1",
        userUsername: "user1",
        userImage: null,
        eventPlaceholderParticipantId: null,
        placeholderDisplayName: null,
      },
    ],
    eventMatchId: TEST_IDS.EVENT_MATCH_ID,
    eventHighScoreSessionId: null,
    eventTournamentId: null,
    eventDiscretionaryAwardId: null,
    ...overrides,
  };
}

function makeLeaderboardEntry(
  overrides: Partial<EventLeaderboardEntry>,
): EventLeaderboardEntry {
  return {
    eventTeamId: TEST_IDS.EVENT_TEAM_ID,
    teamName: "Team A",
    teamLogo: null,
    teamColor: "red",
    totalPoints: 0,
    rank: 1,
    ...overrides,
  };
}

describe("getEventMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not a participant", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue(undefined);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.error).toBe("You are not a participant in this event");
    expect(result.data).toBeUndefined();
  });

  it("returns empty metrics when no point entries exist", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });
    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue([]);
    vi.mocked(getEventLeaderboard).mockResolvedValue([
      makeLeaderboardEntry({}),
    ]);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.data).toBeDefined();
    expect(result.data!.log).toHaveLength(0);
    expect(result.data!.cumulativeTimeline).toHaveLength(0);
    expect(result.data!.teamContributions).toHaveLength(0);
    expect(result.data!.individualContributions).toHaveLength(0);
    expect(result.data!.categoryBreakdowns).toHaveLength(0);
  });

  it("correctly builds cumulative timeline with running totals", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        points: 3,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        createdAt: new Date("2025-01-01T00:00:00Z"),
      }),
      makeEntry({
        id: "entry-2",
        points: 2,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID_2,
        teamName: "Team B",
        teamColor: "blue",
        createdAt: new Date("2025-01-01T01:00:00Z"),
      }),
      makeEntry({
        id: "entry-3",
        points: 1,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        createdAt: new Date("2025-01-01T02:00:00Z"),
      }),
    ];

    const leaderboard = [
      makeLeaderboardEntry({
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        teamName: "Team A",
        totalPoints: 4,
        rank: 1,
      }),
      makeLeaderboardEntry({
        eventTeamId: TEST_IDS.EVENT_TEAM_ID_2,
        teamName: "Team B",
        teamColor: "blue",
        totalPoints: 2,
        rank: 2,
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue(leaderboard);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.data).toBeDefined();
    const timeline = result.data!.cumulativeTimeline;
    expect(timeline).toHaveLength(3);

    // After first entry: Team A = 3, Team B = 0
    expect(timeline[0][TEST_IDS.EVENT_TEAM_ID]).toBe(3);
    expect(timeline[0][TEST_IDS.EVENT_TEAM_ID_2]).toBe(0);

    // After second entry: Team A = 3, Team B = 2
    expect(timeline[1][TEST_IDS.EVENT_TEAM_ID]).toBe(3);
    expect(timeline[1][TEST_IDS.EVENT_TEAM_ID_2]).toBe(2);

    // After third entry: Team A = 4, Team B = 2
    expect(timeline[2][TEST_IDS.EVENT_TEAM_ID]).toBe(4);
    expect(timeline[2][TEST_IDS.EVENT_TEAM_ID_2]).toBe(2);
  });

  it("correctly groups team contributions", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        points: 3,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      }),
      makeEntry({
        id: "entry-2",
        points: 5,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      }),
      makeEntry({
        id: "entry-3",
        points: 2,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID_2,
        teamName: "Team B",
        teamColor: "blue",
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue([
      makeLeaderboardEntry({
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        totalPoints: 8,
      }),
      makeLeaderboardEntry({
        eventTeamId: TEST_IDS.EVENT_TEAM_ID_2,
        teamName: "Team B",
        totalPoints: 2,
        rank: 2,
      }),
    ]);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    const contributions = result.data!.teamContributions;
    expect(contributions).toHaveLength(2);

    const teamA = contributions.find(
      (c) => c.teamId === TEST_IDS.EVENT_TEAM_ID,
    );
    expect(teamA!.totalPoints).toBe(8);

    const teamB = contributions.find(
      (c) => c.teamId === TEST_IDS.EVENT_TEAM_ID_2,
    );
    expect(teamB!.totalPoints).toBe(2);
  });

  it("correctly groups individual contributions per team", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        points: 3,
        participants: [
          {
            userId: TEST_IDS.USER_ID,
            userName: "Alice",
            userUsername: "alice",
            userImage: null,
            eventPlaceholderParticipantId: null,
            placeholderDisplayName: null,
          },
        ],
      }),
      makeEntry({
        id: "entry-2",
        points: 5,
        participants: [
          {
            userId: TEST_IDS.USER_ID_2,
            userName: "Bob",
            userUsername: "bob",
            userImage: null,
            eventPlaceholderParticipantId: null,
            placeholderDisplayName: null,
          },
        ],
      }),
      makeEntry({
        id: "entry-3",
        points: 2,
        participants: [
          {
            userId: TEST_IDS.USER_ID,
            userName: "Alice",
            userUsername: "alice",
            userImage: null,
            eventPlaceholderParticipantId: null,
            placeholderDisplayName: null,
          },
        ],
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue([
      makeLeaderboardEntry({}),
    ]);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    const individual = result.data!.individualContributions;
    expect(individual).toHaveLength(1);

    const team = individual[0];
    expect(team.contributors).toHaveLength(2);

    const alice = team.contributors.find((c) => c.name === "Alice");
    expect(alice!.points).toBe(5);

    const bob = team.contributors.find((c) => c.name === "Bob");
    expect(bob!.points).toBe(5);
  });

  it("skips entries without individual info in individual contributions", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        points: 3,
        participants: [
          {
            userId: TEST_IDS.USER_ID,
            userName: "Alice",
            userUsername: "alice",
            userImage: null,
            eventPlaceholderParticipantId: null,
            placeholderDisplayName: null,
          },
        ],
      }),
      makeEntry({
        id: "entry-2",
        points: 5,
        participants: [],
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue([
      makeLeaderboardEntry({}),
    ]);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    const individual = result.data!.individualContributions;
    expect(individual).toHaveLength(1);
    expect(individual[0].contributors).toHaveLength(1);
    expect(individual[0].contributors[0].name).toBe("Alice");
    expect(individual[0].contributors[0].points).toBe(3);
  });

  it("correctly groups category breakdowns per team", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        points: 3,
        category: "h2h_match",
      }),
      makeEntry({
        id: "entry-2",
        points: 5,
        category: "tournament",
      }),
      makeEntry({
        id: "entry-3",
        points: 2,
        category: "h2h_match",
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue([
      makeLeaderboardEntry({}),
    ]);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    const breakdowns = result.data!.categoryBreakdowns;
    expect(breakdowns).toHaveLength(1);

    const team = breakdowns[0];
    expect(team.categories).toHaveLength(2);

    const h2h = team.categories.find((c) => c.category === "h2h_match");
    expect(h2h!.points).toBe(5);

    const tournament = team.categories.find((c) => c.category === "tournament");
    expect(tournament!.points).toBe(5);
  });

  it("log entries are in reverse chronological order", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        eventMatchId: "match-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      }),
      makeEntry({
        id: "entry-2",
        eventMatchId: "match-2",
        createdAt: new Date("2025-01-02T00:00:00Z"),
      }),
      makeEntry({
        id: "entry-3",
        eventMatchId: "match-3",
        createdAt: new Date("2025-01-03T00:00:00Z"),
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue([
      makeLeaderboardEntry({}),
    ]);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    const log = result.data!.log;
    expect(log[0].id).toBe("entry-3");
    expect(log[1].id).toBe("entry-2");
    expect(log[2].id).toBe("entry-1");
  });

  it("handles entries where some teams have no scores yet", async () => {
    vi.mocked(getEventParticipant).mockResolvedValue({
      id: TEST_IDS.EVENT_MEMBER_ID,
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
      role: "participant",
      joinedAt: new Date(),
    });

    const entries: EnrichedPointEntry[] = [
      makeEntry({
        id: "entry-1",
        points: 3,
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
      }),
    ];

    const leaderboard = [
      makeLeaderboardEntry({
        eventTeamId: TEST_IDS.EVENT_TEAM_ID,
        totalPoints: 3,
        rank: 1,
      }),
      makeLeaderboardEntry({
        eventTeamId: TEST_IDS.EVENT_TEAM_ID_2,
        teamName: "Team B",
        totalPoints: 0,
        rank: 2,
      }),
    ];

    vi.mocked(getEnrichedEventPointEntries).mockResolvedValue(entries);
    vi.mocked(getEventLeaderboard).mockResolvedValue(leaderboard);

    const result = await getEventMetrics(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    const timeline = result.data!.cumulativeTimeline;
    expect(timeline).toHaveLength(1);
    // Team B should still appear with 0 points in the timeline
    expect(timeline[0][TEST_IDS.EVENT_TEAM_ID]).toBe(3);
    expect(timeline[0][TEST_IDS.EVENT_TEAM_ID_2]).toBe(0);
  });
});
