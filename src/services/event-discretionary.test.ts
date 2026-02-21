import * as dbEvents from "@/db/events";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDiscretionaryAward,
  deleteDiscretionaryAward,
  getDiscretionaryAwards,
  updateDiscretionaryAward,
} from "./event-discretionary";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  createDiscretionaryAward: vi.fn(),
  createEventPointEntries: vi.fn(),
  deleteDiscretionaryAward: vi.fn(),
  deleteEventPointEntriesForDiscretionaryAward: vi.fn(),
  getDiscretionaryAwardById: vi.fn(),
  getEventById: vi.fn(),
  getEventDiscretionaryAwards: vi.fn(),
  getEventParticipant: vi.fn(),
  updateDiscretionaryAward: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((cb) => cb({})),
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

const mockActiveEvent = {
  id: TEST_IDS.EVENT_ID,
  name: "Test Event",
  status: EventStatus.ACTIVE,
  createdById: TEST_IDS.USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDraftEvent = {
  ...mockActiveEvent,
  status: EventStatus.DRAFT,
};

const mockAward = {
  id: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID,
  eventId: TEST_IDS.EVENT_ID,
  name: "Cookie Bonus",
  description: "Bought cookies for everyone",
  points: 5,
  awardedAt: new Date(),
  createdByUserId: TEST_IDS.USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validCreateInput = {
  eventId: TEST_IDS.EVENT_ID,
  name: "Cookie Bonus",
  description: "Bought cookies for everyone",
  points: 5,
  recipients: [{ eventTeamId: TEST_IDS.EVENT_TEAM_ID }],
};

describe("createDiscretionaryAward", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await createDiscretionaryAward(TEST_IDS.USER_ID, {
      name: "",
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns validation error for missing recipients", async () => {
    const result = await createDiscretionaryAward(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      name: "Test",
      description: "Test",
      points: 5,
      recipients: [],
    });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when not a participant", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await createDiscretionaryAward(
      TEST_IDS.USER_ID,
      validCreateInput,
    );
    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await createDiscretionaryAward(
      TEST_IDS.USER_ID,
      validCreateInput,
    );
    expect(result.error).toBe(
      "You do not have permission to manage discretionary awards",
    );
  });

  it("returns error when event is not active", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockDraftEvent as never);

    const result = await createDiscretionaryAward(
      TEST_IDS.USER_ID,
      validCreateInput,
    );
    expect(result.error).toBe("Event must be active to create awards");
  });

  it("creates award with team recipients successfully", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.createDiscretionaryAward).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([]);

    const result = await createDiscretionaryAward(
      TEST_IDS.USER_ID,
      validCreateInput,
    );

    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe("Cookie Bonus");
    expect(result.data?.points).toBe(5);
  });

  it("creates award with explicit awardedAt", async () => {
    const customDate = new Date("2025-06-15T14:00:00Z");
    const awardWithDate = { ...mockAward, awardedAt: customDate };
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.createDiscretionaryAward).mockResolvedValue(
      awardWithDate as never,
    );
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([]);

    const result = await createDiscretionaryAward(TEST_IDS.USER_ID, {
      ...validCreateInput,
      awardedAt: "2025-06-15T14:00:00Z",
    });

    expect(result.data).toBeDefined();
    expect(result.data?.awardedAt).toEqual(customDate);
  });
});

describe("updateDiscretionaryAward", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid id", async () => {
    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: "not-uuid" },
      { name: "Updated" },
    );
    expect(result.error).toBe("Validation failed");
  });

  it("returns error when award not found", async () => {
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(undefined);

    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID },
      { name: "Updated" },
    );
    expect(result.error).toBe("Award not found");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID },
      { name: "Updated" },
    );
    expect(result.error).toBe(
      "You do not have permission to manage discretionary awards",
    );
  });

  it("returns error when event is not active", async () => {
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockDraftEvent as never);

    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID },
      { name: "Updated" },
    );
    expect(result.error).toBe("Event must be active to update awards");
  });

  it("updates award successfully", async () => {
    const updatedAward = { ...mockAward, name: "Updated Bonus" };
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.updateDiscretionaryAward).mockResolvedValue(
      updatedAward as never,
    );

    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID },
      { name: "Updated Bonus" },
    );

    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe("Updated Bonus");
  });

  it("updates awardedAt successfully", async () => {
    const newDate = new Date("2025-07-01T10:00:00Z");
    const updatedAward = { ...mockAward, awardedAt: newDate };
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.updateDiscretionaryAward).mockResolvedValue(
      updatedAward as never,
    );

    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID },
      { awardedAt: "2025-07-01T10:00:00Z" },
    );

    expect(result.data).toBeDefined();
    expect(result.data?.awardedAt).toEqual(newDate);
  });

  it("re-creates point entries when points change", async () => {
    const updatedAward = { ...mockAward, points: 10 };
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.updateDiscretionaryAward).mockResolvedValue(
      updatedAward as never,
    );
    vi.mocked(
      dbEvents.deleteEventPointEntriesForDiscretionaryAward,
    ).mockResolvedValue(undefined);
    vi.mocked(dbEvents.getEventDiscretionaryAwards).mockResolvedValue([
      {
        ...mockAward,
        createdBy: {
          id: TEST_IDS.USER_ID,
          name: "User",
          username: "user",
          image: null,
        },
        recipientTeams: [
          { id: TEST_IDS.EVENT_TEAM_ID, name: "Team A", color: "red" },
        ],
      },
    ]);
    vi.mocked(dbEvents.createEventPointEntries).mockResolvedValue([]);

    const result = await updateDiscretionaryAward(
      TEST_IDS.USER_ID,
      { awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID },
      { points: 10 },
    );

    expect(result.data).toBeDefined();
    expect(result.data?.points).toBe(10);
  });
});

describe("deleteDiscretionaryAward", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid input", async () => {
    const result = await deleteDiscretionaryAward(TEST_IDS.USER_ID, {
      awardId: "not-uuid",
    });
    expect(result.error).toBe("Validation failed");
  });

  it("returns error when award not found", async () => {
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(undefined);

    const result = await deleteDiscretionaryAward(TEST_IDS.USER_ID, {
      awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID,
    });
    expect(result.error).toBe("Award not found");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await deleteDiscretionaryAward(TEST_IDS.USER_ID, {
      awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID,
    });
    expect(result.error).toBe(
      "You do not have permission to manage discretionary awards",
    );
  });

  it("deletes award successfully", async () => {
    vi.mocked(dbEvents.getDiscretionaryAwardById).mockResolvedValue(
      mockAward as never,
    );
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.deleteDiscretionaryAward).mockResolvedValue(undefined);

    const result = await deleteDiscretionaryAward(TEST_IDS.USER_ID, {
      awardId: TEST_IDS.EVENT_DISCRETIONARY_AWARD_ID,
    });

    expect(result.data).toEqual({
      deleted: true,
      eventId: TEST_IDS.EVENT_ID,
    });
  });
});

describe("getDiscretionaryAwards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a participant", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await getDiscretionaryAwards(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_ID,
    );
    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns awards successfully", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventDiscretionaryAwards).mockResolvedValue([
      {
        ...mockAward,
        createdBy: {
          id: TEST_IDS.USER_ID,
          name: "User",
          username: "user",
          image: null,
        },
        recipientTeams: [
          { id: TEST_IDS.EVENT_TEAM_ID, name: "Team A", color: "red" },
        ],
      },
    ]);

    const result = await getDiscretionaryAwards(
      TEST_IDS.USER_ID,
      TEST_IDS.EVENT_ID,
    );

    expect(result.data).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe("Cookie Bonus");
    expect(result.data?.[0].recipientTeams).toHaveLength(1);
  });
});
