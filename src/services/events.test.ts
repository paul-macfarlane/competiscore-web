import * as dbEvents from "@/db/events";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_EVENTS_PER_USER } from "./constants";
import {
  completeEvent,
  createEvent,
  deleteEvent,
  getEvent,
  getUserEvents,
  startEvent,
  updateEvent,
} from "./events";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((cb: (tx: object) => Promise<unknown>) => cb({})),
  db: {},
}));

vi.mock("@/db/events", () => ({
  createEvent: vi.fn(),
  getEventById: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getUserEvents: vi.fn(),
  checkEventNameExists: vi.fn(),
  countEventsByUser: vi.fn(),
  addEventParticipant: vi.fn(),
  getEventParticipant: vi.fn(),
  countEventGameTypes: vi.fn(),
  countEventTeams: vi.fn(),
}));

const mockEvent = {
  id: TEST_IDS.EVENT_ID,
  name: "Test Event",
  description: "A test event",
  logo: null,
  visibility: "private",
  scoringType: "team",
  status: EventStatus.DRAFT,
  startDate: null,
  completedAt: null,
  createdById: TEST_IDS.USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockActiveEvent = {
  ...mockEvent,
  status: EventStatus.ACTIVE,
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

describe("createEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for empty name", async () => {
    const result = await createEvent(TEST_IDS.USER_ID, { name: "" });
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error when user has too many events", async () => {
    vi.mocked(dbEvents.countEventsByUser).mockResolvedValue(
      MAX_EVENTS_PER_USER,
    );

    const result = await createEvent(TEST_IDS.USER_ID, {
      name: "New Event",
    });

    expect(result.error).toBe(
      `You can create at most ${MAX_EVENTS_PER_USER} events`,
    );
  });

  it("returns error when name already exists", async () => {
    vi.mocked(dbEvents.countEventsByUser).mockResolvedValue(0);
    vi.mocked(dbEvents.checkEventNameExists).mockResolvedValue(true);

    const result = await createEvent(TEST_IDS.USER_ID, {
      name: "Duplicate Event",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "You already have an event with this name",
    );
  });

  it("returns success with event data", async () => {
    vi.mocked(dbEvents.countEventsByUser).mockResolvedValue(0);
    vi.mocked(dbEvents.checkEventNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.createEvent).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.addEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );

    const result = await createEvent(TEST_IDS.USER_ID, {
      name: "Test Event",
    });

    expect(result.data?.name).toBe("Test Event");
    expect(result.data?.status).toBe(EventStatus.DRAFT);
  });
});

describe("getEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a member", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await getEvent(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns event with role on success", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);

    const result = await getEvent(TEST_IDS.USER_ID, TEST_IDS.EVENT_ID);

    expect(result.data?.name).toBe("Test Event");
    expect(result.data?.role).toBe(EventParticipantRole.ORGANIZER);
  });
});

describe("getUserEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user's events", async () => {
    const mockEvents = [{ ...mockEvent, role: EventParticipantRole.ORGANIZER }];
    vi.mocked(dbEvents.getUserEvents).mockResolvedValue(mockEvents as never);

    const result = await getUserEvents(TEST_IDS.USER_ID);

    expect(result.data).toEqual(mockEvents);
  });
});

describe("updateEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validation error for invalid id input", async () => {
    const result = await updateEvent(TEST_IDS.USER_ID, {}, { name: "New" });

    expect(result.error).toBe("Validation failed");
  });

  it("returns error when not a member", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await updateEvent(
      TEST_IDS.USER_ID,
      { eventId: TEST_IDS.EVENT_ID },
      { name: "Updated Name" },
    );

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await updateEvent(
      TEST_IDS.USER_ID,
      { eventId: TEST_IDS.EVENT_ID },
      { name: "Updated Name" },
    );

    expect(result.error).toBe("You don't have permission to edit this event");
  });

  it("returns error for duplicate name", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.checkEventNameExists).mockResolvedValue(true);

    const result = await updateEvent(
      TEST_IDS.USER_ID,
      { eventId: TEST_IDS.EVENT_ID },
      { name: "Duplicate Name" },
    );

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "You already have an event with this name",
    );
  });

  it("returns success on update", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.checkEventNameExists).mockResolvedValue(false);
    vi.mocked(dbEvents.updateEvent).mockResolvedValue({
      ...mockEvent,
      name: "Updated Name",
    } as never);

    const result = await updateEvent(
      TEST_IDS.USER_ID,
      { eventId: TEST_IDS.EVENT_ID },
      { name: "Updated Name" },
    );

    expect(result.data?.name).toBe("Updated Name");
  });
});

describe("deleteEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await deleteEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe("You don't have permission to delete this event");
  });

  it("returns success when deleting event", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.deleteEvent).mockResolvedValue(true as never);

    const result = await deleteEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.data?.deleted).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

describe("startEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when event is not draft", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );

    const result = await startEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe("Only draft events can be started");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await startEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe("You don't have permission to start this event");
  });

  it("returns error when no game types exist", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.countEventGameTypes).mockResolvedValue(0);
    vi.mocked(dbEvents.countEventTeams).mockResolvedValue(3);

    const result = await startEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe("Event must have at least 1 game type to start");
  });

  it("returns error when less than 2 teams", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.countEventGameTypes).mockResolvedValue(1);
    vi.mocked(dbEvents.countEventTeams).mockResolvedValue(1);

    const result = await startEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe("Event must have at least 2 teams to start");
  });

  it("returns success transitioning to active", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);
    vi.mocked(dbEvents.countEventGameTypes).mockResolvedValue(2);
    vi.mocked(dbEvents.countEventTeams).mockResolvedValue(3);
    vi.mocked(dbEvents.updateEvent).mockResolvedValue({
      ...mockEvent,
      status: EventStatus.ACTIVE,
    } as never);

    const result = await startEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.data?.started).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

describe("completeEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when event is not active", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(mockEvent as never);

    const result = await completeEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe("Only active events can be completed");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await completeEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.error).toBe(
      "You don't have permission to complete this event",
    );
  });

  it("returns success transitioning to completed", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.getEventById).mockResolvedValue(
      mockActiveEvent as never,
    );
    vi.mocked(dbEvents.updateEvent).mockResolvedValue({
      ...mockActiveEvent,
      status: EventStatus.COMPLETED,
    } as never);

    const result = await completeEvent(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
    });

    expect(result.data?.completed).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});
