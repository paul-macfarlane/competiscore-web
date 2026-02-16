import * as dbEvents from "@/db/events";
import { EventParticipantRole } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_EVENT_PARTICIPANTS } from "./constants";
import {
  addEventParticipant,
  promoteToOrganizer,
  removeEventParticipant,
} from "./event-participants";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  addEventParticipant: vi.fn(),
  countEventParticipants: vi.fn(),
  getEventParticipant: vi.fn(),
  getEventParticipants: vi.fn(),
  removeEventParticipant: vi.fn(),
  updateEventParticipantRole: vi.fn(),
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

describe("addEventParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not a member", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

    const result = await addEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe("You are not a participant in this event");
  });

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await addEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe(
      "You don't have permission to manage participants",
    );
  });

  it("returns error when at member limit", async () => {
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce(undefined);
    vi.mocked(dbEvents.countEventParticipants).mockResolvedValue(
      MAX_EVENT_PARTICIPANTS,
    );

    const result = await addEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe(
      "Event can have at most " + MAX_EVENT_PARTICIPANTS + " participants",
    );
  });

  it("returns success when adding a member", async () => {
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce(undefined);
    vi.mocked(dbEvents.countEventParticipants).mockResolvedValue(5);
    vi.mocked(dbEvents.addEventParticipant).mockResolvedValue(
      undefined as never,
    );

    const result = await addEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.data?.added).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

describe("removeEventParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await removeEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe(
      "You don't have permission to manage participants",
    );
  });

  it("returns error when trying to remove self", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );

    const result = await removeEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID,
    });

    expect(result.error).toBe("You cannot remove yourself");
  });

  it("returns success when removing a member", async () => {
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce({
        ...mockParticipantMember,
        userId: TEST_IDS.USER_ID_2,
      } as never);
    vi.mocked(dbEvents.removeEventParticipant).mockResolvedValue(true as never);

    const result = await removeEventParticipant(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.data?.removed).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});

describe("promoteToOrganizer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await promoteToOrganizer(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe(
      "You don't have permission to promote participants",
    );
  });

  it("returns error when target is already organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce({
        ...mockOrganizerMember,
        userId: TEST_IDS.USER_ID_2,
      } as never);

    const result = await promoteToOrganizer(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.error).toBe("User is already an organizer");
  });

  it("returns success when promoting a participant", async () => {
    vi.mocked(dbEvents.getEventParticipant)
      .mockResolvedValueOnce(mockOrganizerMember as never)
      .mockResolvedValueOnce({
        ...mockParticipantMember,
        userId: TEST_IDS.USER_ID_2,
      } as never);
    vi.mocked(dbEvents.updateEventParticipantRole).mockResolvedValue(
      undefined as never,
    );

    const result = await promoteToOrganizer(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      userId: TEST_IDS.USER_ID_2,
    });

    expect(result.data?.promoted).toBe(true);
    expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
  });
});
