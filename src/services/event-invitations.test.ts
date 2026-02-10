import * as dbEventInvitations from "@/db/event-invitations";
import * as dbEvents from "@/db/events";
import * as dbUsers from "@/db/users";
import { EventParticipantRole, InvitationStatus } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_EVENT_PARTICIPANTS } from "./constants";
import {
  acceptEventInvitation,
  generateEventInviteLink,
  getEventInviteLinkDetails,
  getEventPendingInvitations,
  getUserPendingEventInvitations,
  inviteUserToEvent,
} from "./event-invitations";
import { TEST_IDS } from "./test-helpers";

vi.mock("@/db/event-invitations", () => ({
  createEventInvitation: vi.fn(),
  getEventInvitationByToken: vi.fn(),
  getEventInvitationByTokenWithDetails: vi.fn(),
  getPendingEventInvitationsForUser: vi.fn(),
  getPendingEventInvitationsForEvent: vi.fn(),
  incrementEventInvitationUseCount: vi.fn(),
  checkExistingPendingEventInvitation: vi.fn(),
}));

vi.mock("@/db/events", () => ({
  getEventParticipant: vi.fn(),
  countEventParticipants: vi.fn(),
  addEventParticipant: vi.fn(),
}));

vi.mock("@/db/users", () => ({
  getUserById: vi.fn(),
}));

vi.mock("@/db/event-invitations", async () => {
  return {
    createEventInvitation: vi.fn(),
    getEventInvitationByToken: vi.fn(),
    getEventInvitationByTokenWithDetails: vi.fn(),
    getPendingEventInvitationsForUser: vi.fn(),
    getPendingEventInvitationsForEvent: vi.fn(),
    incrementEventInvitationUseCount: vi.fn(),
    checkExistingPendingEventInvitation: vi.fn(),
    acceptAllPendingEventInvitationsForEvent: vi.fn(),
  };
});

vi.mock("@/db/index", () => ({
  db: {},
  withTransaction: vi.fn((callback) => callback({})),
}));

vi.mock("./join-event", () => ({
  addUserToEvent: vi.fn(() => Promise.resolve({ data: { joined: true } })),
}));

const mockOrganizerMember = {
  id: TEST_IDS.EVENT_MEMBER_ID,
  eventId: TEST_IDS.EVENT_ID,
  userId: TEST_IDS.USER_ID,
  role: EventParticipantRole.ORGANIZER,
  joinedAt: new Date(),
};

const mockParticipantMember = {
  id: TEST_IDS.EVENT_MEMBER_ID,
  eventId: TEST_IDS.EVENT_ID,
  userId: TEST_IDS.USER_ID,
  role: EventParticipantRole.PARTICIPANT,
  joinedAt: new Date(),
};

const mockUser = {
  id: TEST_IDS.USER_ID_2,
  name: "Invitee",
  email: "invitee@test.com",
  emailVerified: true,
  username: "invitee",
  bio: null,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  isAdmin: false,
};

const mockInvitation = {
  id: TEST_IDS.EVENT_INVITATION_ID,
  eventId: TEST_IDS.EVENT_ID,
  inviterId: TEST_IDS.USER_ID,
  inviteeUserId: TEST_IDS.USER_ID_2,
  eventPlaceholderParticipantId: null,
  role: EventParticipantRole.PARTICIPANT,
  status: InvitationStatus.PENDING,
  token: null,
  maxUses: null,
  useCount: 0,
  createdAt: new Date(),
  expiresAt: null,
};

const mockInvitationWithDetails = {
  ...mockInvitation,
  event: {
    id: TEST_IDS.EVENT_ID,
    name: "Test Event",
    description: "A test event",
    logo: null,
  },
  inviter: {
    id: TEST_IDS.USER_ID,
    name: "Inviter",
    username: "inviter",
  },
  invitee: {
    id: TEST_IDS.USER_ID_2,
    name: "Invitee",
    username: "invitee",
  },
  placeholder: null,
};

describe("event-invitations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteUserToEvent", () => {
    it("returns validation error for invalid input", async () => {
      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: "not-a-uuid",
      });

      expect(result.error).toBe("Validation failed");
      expect(result.fieldErrors).toBeDefined();
    });

    it("returns error when not a member", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.error).toBe("You are not a participant in this event");
    });

    it("returns error when not organizer", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
        mockParticipantMember,
      );

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.error).toBe(
        "You don't have permission to invite participants",
      );
    });

    it("returns error when invitee not found", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
        mockOrganizerMember,
      );
      vi.mocked(dbUsers.getUserById).mockResolvedValue(undefined);

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.error).toBe("User not found");
    });

    it("returns error when invitee already a member", async () => {
      vi.mocked(dbEvents.getEventParticipant)
        .mockResolvedValueOnce(mockOrganizerMember)
        .mockResolvedValueOnce({
          ...mockParticipantMember,
          userId: TEST_IDS.USER_ID_2,
        });
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.error).toBe("User is already a participant in this event");
    });

    it("returns error when pending invitation exists", async () => {
      vi.mocked(dbEvents.getEventParticipant)
        .mockResolvedValueOnce(mockOrganizerMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);
      vi.mocked(
        dbEventInvitations.checkExistingPendingEventInvitation,
      ).mockResolvedValue(mockInvitation);

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.error).toBe(
        "User already has a pending invitation to this event",
      );
    });

    it("returns error when at member limit", async () => {
      vi.mocked(dbEvents.getEventParticipant)
        .mockResolvedValueOnce(mockOrganizerMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);
      vi.mocked(
        dbEventInvitations.checkExistingPendingEventInvitation,
      ).mockResolvedValue(undefined);
      vi.mocked(dbEvents.countEventParticipants).mockResolvedValue(
        MAX_EVENT_PARTICIPANTS,
      );

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.error).toBe(
        `This event has reached the maximum of ${MAX_EVENT_PARTICIPANTS} participants`,
      );
    });

    it("returns success with default participant role", async () => {
      vi.mocked(dbEvents.getEventParticipant)
        .mockResolvedValueOnce(mockOrganizerMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);
      vi.mocked(
        dbEventInvitations.checkExistingPendingEventInvitation,
      ).mockResolvedValue(undefined);
      vi.mocked(dbEvents.countEventParticipants).mockResolvedValue(5);
      vi.mocked(dbEventInvitations.createEventInvitation).mockResolvedValue(
        mockInvitation,
      );

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
      });

      expect(result.data).toEqual({
        invited: true,
        invitationId: TEST_IDS.EVENT_INVITATION_ID,
        eventId: TEST_IDS.EVENT_ID,
      });
    });

    it("returns success with explicit organizer role", async () => {
      const organizerInvitation = {
        ...mockInvitation,
        role: EventParticipantRole.ORGANIZER,
      };
      vi.mocked(dbEvents.getEventParticipant)
        .mockResolvedValueOnce(mockOrganizerMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);
      vi.mocked(
        dbEventInvitations.checkExistingPendingEventInvitation,
      ).mockResolvedValue(undefined);
      vi.mocked(dbEvents.countEventParticipants).mockResolvedValue(5);
      vi.mocked(dbEventInvitations.createEventInvitation).mockResolvedValue(
        organizerInvitation,
      );

      const result = await inviteUserToEvent(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
        inviteeUserId: TEST_IDS.USER_ID_2,
        role: EventParticipantRole.ORGANIZER,
      });

      expect(result.data).toEqual({
        invited: true,
        invitationId: TEST_IDS.EVENT_INVITATION_ID,
        eventId: TEST_IDS.EVENT_ID,
      });
    });
  });

  describe("generateEventInviteLink", () => {
    it("returns validation error for invalid input", async () => {
      const result = await generateEventInviteLink(TEST_IDS.USER_ID, {
        eventId: "not-a-uuid",
      });

      expect(result.error).toBe("Validation failed");
      expect(result.fieldErrors).toBeDefined();
    });

    it("returns error when not a member", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

      const result = await generateEventInviteLink(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
      });

      expect(result.error).toBe("You are not a participant in this event");
    });

    it("returns error when not organizer", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
        mockParticipantMember,
      );

      const result = await generateEventInviteLink(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
      });

      expect(result.error).toBe(
        "You don't have permission to invite participants",
      );
    });

    it("returns success with token", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
        mockOrganizerMember,
      );
      vi.mocked(dbEventInvitations.createEventInvitation).mockResolvedValue({
        ...mockInvitation,
        token: "test-token",
      });

      const result = await generateEventInviteLink(TEST_IDS.USER_ID, {
        eventId: TEST_IDS.EVENT_ID,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.token).toBeDefined();
      expect(result.data?.eventId).toBe(TEST_IDS.EVENT_ID);
    });
  });

  describe("getEventInviteLinkDetails", () => {
    it("returns error when token not found", async () => {
      vi.mocked(
        dbEventInvitations.getEventInvitationByTokenWithDetails,
      ).mockResolvedValue(undefined);

      const result = await getEventInviteLinkDetails("invalid-token");

      expect(result.error).toBe("Invite link not found or has expired");
    });

    it("returns invalid when status is not pending", async () => {
      vi.mocked(
        dbEventInvitations.getEventInvitationByTokenWithDetails,
      ).mockResolvedValue({
        ...mockInvitationWithDetails,
        status: InvitationStatus.ACCEPTED,
      });

      const result = await getEventInviteLinkDetails("used-token");

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.reason).toBe("This invite link is no longer active");
    });

    it("returns invalid when expired", async () => {
      vi.mocked(
        dbEventInvitations.getEventInvitationByTokenWithDetails,
      ).mockResolvedValue({
        ...mockInvitationWithDetails,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await getEventInviteLinkDetails("expired-token");

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.reason).toBe("This invite link has expired");
    });

    it("returns invalid when max uses reached", async () => {
      vi.mocked(
        dbEventInvitations.getEventInvitationByTokenWithDetails,
      ).mockResolvedValue({
        ...mockInvitationWithDetails,
        maxUses: 5,
        useCount: 5,
      });

      const result = await getEventInviteLinkDetails("maxed-token");

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.reason).toBe(
        "This invite link has reached its maximum uses",
      );
    });

    it("returns valid details", async () => {
      vi.mocked(
        dbEventInvitations.getEventInvitationByTokenWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);

      const result = await getEventInviteLinkDetails("valid-token");

      expect(result.data?.isValid).toBe(true);
      expect(result.data?.event.name).toBe("Test Event");
      expect(result.data?.role).toBe(EventParticipantRole.PARTICIPANT);
      expect(result.data?.reason).toBeUndefined();
    });
  });

  describe("acceptEventInvitation", () => {
    it("returns validation error for empty token", async () => {
      const result = await acceptEventInvitation(TEST_IDS.USER_ID_2, {
        token: "",
      });

      expect(result.error).toBe("Validation failed");
      expect(result.fieldErrors).toBeDefined();
    });

    it("returns error when token not found", async () => {
      vi.mocked(dbEventInvitations.getEventInvitationByToken).mockResolvedValue(
        undefined,
      );

      const result = await acceptEventInvitation(TEST_IDS.USER_ID_2, {
        token: "invalid-token",
      });

      expect(result.error).toBe("Invite link not found");
    });

    it("returns error when invitation not active", async () => {
      vi.mocked(dbEventInvitations.getEventInvitationByToken).mockResolvedValue(
        {
          ...mockInvitation,
          token: "used-token",
          status: InvitationStatus.ACCEPTED,
        },
      );

      const result = await acceptEventInvitation(TEST_IDS.USER_ID_2, {
        token: "used-token",
      });

      expect(result.error).toBe("This invite link is no longer active");
    });

    it("returns error when expired", async () => {
      vi.mocked(dbEventInvitations.getEventInvitationByToken).mockResolvedValue(
        {
          ...mockInvitation,
          token: "expired-token",
          expiresAt: new Date(Date.now() - 1000),
        },
      );

      const result = await acceptEventInvitation(TEST_IDS.USER_ID_2, {
        token: "expired-token",
      });

      expect(result.error).toBe("This invite link has expired");
    });

    it("returns error when max uses reached", async () => {
      vi.mocked(dbEventInvitations.getEventInvitationByToken).mockResolvedValue(
        {
          ...mockInvitation,
          token: "maxed-token",
          maxUses: 5,
          useCount: 5,
        },
      );

      const result = await acceptEventInvitation(TEST_IDS.USER_ID_2, {
        token: "maxed-token",
      });

      expect(result.error).toBe(
        "This invite link has reached its maximum uses",
      );
    });

    it("returns success", async () => {
      vi.mocked(dbEventInvitations.getEventInvitationByToken).mockResolvedValue(
        {
          ...mockInvitation,
          token: "valid-token",
        },
      );

      const result = await acceptEventInvitation(TEST_IDS.USER_ID_2, {
        token: "valid-token",
      });

      expect(result.data).toEqual({
        joined: true,
        eventId: TEST_IDS.EVENT_ID,
      });
    });
  });

  describe("getUserPendingEventInvitations", () => {
    it("returns user's pending invitations", async () => {
      vi.mocked(
        dbEventInvitations.getPendingEventInvitationsForUser,
      ).mockResolvedValue([mockInvitationWithDetails]);

      const result = await getUserPendingEventInvitations(TEST_IDS.USER_ID_2);

      expect(result.data).toEqual([mockInvitationWithDetails]);
    });
  });

  describe("getEventPendingInvitations", () => {
    it("returns error when not a member", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(undefined);

      const result = await getEventPendingInvitations(
        TEST_IDS.EVENT_ID,
        TEST_IDS.USER_ID,
      );

      expect(result.error).toBe("You are not a participant in this event");
    });

    it("returns error when not organizer", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
        mockParticipantMember,
      );

      const result = await getEventPendingInvitations(
        TEST_IDS.EVENT_ID,
        TEST_IDS.USER_ID,
      );

      expect(result.error).toBe(
        "You don't have permission to view invitations",
      );
    });

    it("returns pending invitations", async () => {
      vi.mocked(dbEvents.getEventParticipant).mockResolvedValue(
        mockOrganizerMember,
      );
      vi.mocked(
        dbEventInvitations.getPendingEventInvitationsForEvent,
      ).mockResolvedValue([mockInvitationWithDetails]);

      const result = await getEventPendingInvitations(
        TEST_IDS.EVENT_ID,
        TEST_IDS.USER_ID,
      );

      expect(result.data).toEqual([mockInvitationWithDetails]);
    });
  });
});
