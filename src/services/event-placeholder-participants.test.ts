import * as dbEvents from "@/db/events";
import { EventParticipantRole } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_EVENT_PLACEHOLDER_PARTICIPANTS } from "./constants";
import { createEventPlaceholder } from "./event-placeholder-participants";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/events", () => ({
  countEventPlaceholders: vi.fn(),
  createEventPlaceholder: vi.fn(),
  getEventParticipant: vi.fn(),
  getEventPlaceholderById: vi.fn(),
  getEventPlaceholders: vi.fn(),
  getRetiredEventPlaceholders: vi.fn(),
  hasEventPlaceholderActivity: vi.fn(),
  restoreEventPlaceholder: vi.fn(),
  retireEventPlaceholder: vi.fn(),
  updateEventPlaceholder: vi.fn(),
  deleteEventPlaceholder: vi.fn(),
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

const mockPlaceholder = {
  id: TEST_IDS.EVENT_PLACEHOLDER_ID,
  eventId: TEST_IDS.EVENT_ID,
  displayName: "Guest Player",
  linkedUserId: null,
  isRetired: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createEventPlaceholder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not organizer", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockParticipantMember as never,
    );

    const result = await createEventPlaceholder(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      displayName: "Guest",
    });

    expect(result.error).toBe(
      "You don't have permission to manage placeholders",
    );
  });

  it("returns error when at placeholder limit", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.countEventPlaceholders).mockResolvedValue(
      MAX_EVENT_PLACEHOLDER_PARTICIPANTS,
    );

    const result = await createEventPlaceholder(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      displayName: "Guest",
    });

    expect(result.error).toBe(
      "Event can have at most " +
        MAX_EVENT_PLACEHOLDER_PARTICIPANTS +
        " placeholder participants",
    );
  });

  it("returns success when creating a placeholder", async () => {
    vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
      mockOrganizerMember as never,
    );
    vi.mocked(dbEvents.countEventPlaceholders).mockResolvedValue(0);
    vi.mocked(dbEvents.createEventPlaceholder).mockResolvedValue(
      mockPlaceholder as never,
    );

    const result = await createEventPlaceholder(TEST_IDS.USER_ID, {
      eventId: TEST_IDS.EVENT_ID,
      displayName: "Guest Player",
    });

    expect(result.data?.displayName).toBe("Guest Player");
  });
});
