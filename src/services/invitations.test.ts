import * as dbInvitations from "@/db/invitations";
import * as dbLeagueMembers from "@/db/league-members";
import * as dbLeagues from "@/db/leagues";
import * as dbUsers from "@/db/users";
import {
  InvitationStatus,
  LeagueMemberRole,
  LeagueVisibility,
} from "@/lib/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_LEAGUES_PER_USER } from "./constants";
import {
  acceptInvitation,
  cancelInvitation,
  declineInvitation,
  generateInviteLink,
  getInviteLinkDetails,
  getLeaguePendingInvitations,
  getUserPendingInvitations,
  inviteUser,
  joinViaInviteLink,
} from "./invitations";

vi.mock("@/db/invitations", () => ({
  createInvitation: vi.fn(),
  getInvitationById: vi.fn(),
  getInvitationByIdWithDetails: vi.fn(),
  getInvitationByToken: vi.fn(),
  getInvitationByTokenWithDetails: vi.fn(),
  getPendingInvitationsForUser: vi.fn(),
  getPendingInvitationsForLeague: vi.fn(),
  updateInvitationStatus: vi.fn(),
  incrementInvitationUseCount: vi.fn(),
  deleteInvitation: vi.fn(),
  checkExistingPendingInvitation: vi.fn(),
  acceptAllPendingInvitationsForLeague: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
  getMemberCount: vi.fn(),
  getUserLeagueCount: vi.fn(),
  createLeagueMember: vi.fn(),
}));

vi.mock("@/db/leagues", () => ({
  getLeagueById: vi.fn(),
}));

vi.mock("@/db/users", () => ({
  getUserById: vi.fn(),
}));

const mockLeague = {
  id: "league-123",
  name: "Test League",
  description: "A test league",
  visibility: LeagueVisibility.PUBLIC,
  logo: null,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMember = {
  id: "member-123",
  userId: "user-123",
  leagueId: "league-123",
  role: LeagueMemberRole.MANAGER,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockInvitation = {
  id: "inv-123",
  leagueId: "league-123",
  inviterId: "user-123",
  inviteeUserId: "user-456",
  inviteeEmail: null,
  role: LeagueMemberRole.MEMBER,
  status: InvitationStatus.PENDING,
  token: null,
  maxUses: null,
  useCount: 0,
  createdAt: new Date(),
  expiresAt: null,
};

const mockInvitationWithDetails = {
  ...mockInvitation,
  league: {
    id: "league-123",
    name: "Test League",
    description: "A test league",
    logo: null,
  },
  inviter: {
    id: "user-123",
    name: "Inviter",
    username: "inviter",
  },
  invitee: null,
};

describe("invitations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteUser", () => {
    it("returns error when inviter is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when inviter lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe("You don't have permission to invite members");
    });

    it("returns error when trying to invite with higher role", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MANAGER,
      });

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.EXECUTIVE,
      });

      expect(result.error).toBe(
        "You cannot invite someone with a higher role than yours",
      );
    });

    it("returns error when invitee not found", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(undefined);

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe("User not found");
    });

    it("returns error when invitee is already a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
        });
      vi.mocked(dbUsers.getUserById).mockResolvedValue({
        id: "user-456",
        name: "Invitee",
        email: "invitee@test.com",
        emailVerified: true,
        username: "invitee",
        bio: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe("User is already a member of this league");
    });

    it("returns error when invitation already exists", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue({
        id: "user-456",
        name: "Invitee",
        email: "invitee@test.com",
        emailVerified: true,
        username: "invitee",
        bio: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      vi.mocked(dbInvitations.checkExistingPendingInvitation).mockResolvedValue(
        mockInvitation,
      );

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe(
        "User already has a pending invitation to this league",
      );
    });

    it("successfully creates invitation", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue({
        id: "user-456",
        name: "Invitee",
        email: "invitee@test.com",
        emailVerified: true,
        username: "invitee",
        bio: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      vi.mocked(dbInvitations.checkExistingPendingInvitation).mockResolvedValue(
        undefined,
      );
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(5);
      vi.mocked(dbInvitations.createInvitation).mockResolvedValue(
        mockInvitation,
      );

      const result = await inviteUser("user-123", {
        leagueId: "league-123",
        inviteeUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.data).toEqual({
        invited: true,
        invitationId: mockInvitation.id,
      });
    });
  });

  describe("generateInviteLink", () => {
    it("returns error when inviter lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await generateInviteLink("user-123", {
        leagueId: "league-123",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe("You don't have permission to invite members");
    });

    it("successfully generates invite link", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbInvitations.createInvitation).mockResolvedValue({
        ...mockInvitation,
        token: "test-token",
      });

      const result = await generateInviteLink("user-123", {
        leagueId: "league-123",
        role: LeagueMemberRole.MEMBER,
        expiresInDays: 7,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.token).toBeDefined();
    });
  });

  describe("getInviteLinkDetails", () => {
    it("returns error when token not found", async () => {
      vi.mocked(
        dbInvitations.getInvitationByTokenWithDetails,
      ).mockResolvedValue(undefined);

      const result = await getInviteLinkDetails("invalid-token");

      expect(result.error).toBe("Invite link not found or has expired");
    });

    it("returns valid invite details", async () => {
      vi.mocked(
        dbInvitations.getInvitationByTokenWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);

      const result = await getInviteLinkDetails("valid-token");

      expect(result.data?.isValid).toBe(true);
      expect(result.data?.league.name).toBe("Test League");
    });

    it("returns invalid when invite is expired", async () => {
      const expiredInvitation = {
        ...mockInvitationWithDetails,
        expiresAt: new Date(Date.now() - 1000),
      };
      vi.mocked(
        dbInvitations.getInvitationByTokenWithDetails,
      ).mockResolvedValue(expiredInvitation);

      const result = await getInviteLinkDetails("expired-token");

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.reason).toBe("This invite link has expired");
    });
  });

  describe("acceptInvitation", () => {
    it("returns error when invitation not found", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        undefined,
      );

      const result = await acceptInvitation("inv-123", "user-456");

      expect(result.error).toBe("Invitation not found");
    });

    it("returns error when invitation is not for user", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );

      const result = await acceptInvitation("inv-123", "user-789");

      expect(result.error).toBe("This invitation is not for you");
    });

    it("returns error when user at league limit", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(
        MAX_LEAGUES_PER_USER,
      );

      const result = await acceptInvitation("inv-123", "user-456");

      expect(result.error).toBe(
        `You can only be a member of ${MAX_LEAGUES_PER_USER} leagues`,
      );
    });

    it("successfully accepts invitation", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(0);
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(5);
      vi.mocked(dbLeagueMembers.createLeagueMember).mockResolvedValue(
        mockMember,
      );
      vi.mocked(dbInvitations.updateInvitationStatus).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      const result = await acceptInvitation("inv-123", "user-456");

      expect(result.data).toEqual({ joined: true });
    });
  });

  describe("declineInvitation", () => {
    it("returns error when invitation is not for user", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );

      const result = await declineInvitation("inv-123", "user-789");

      expect(result.error).toBe("This invitation is not for you");
    });

    it("successfully declines invitation", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );
      vi.mocked(dbInvitations.updateInvitationStatus).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.DECLINED,
      });

      const result = await declineInvitation("inv-123", "user-456");

      expect(result.data).toEqual({ declined: true });
    });
  });

  describe("joinViaInviteLink", () => {
    it("returns error when token not found", async () => {
      vi.mocked(dbInvitations.getInvitationByToken).mockResolvedValue(
        undefined,
      );

      const result = await joinViaInviteLink("invalid-token", "user-456");

      expect(result.error).toBe("Invite link not found");
    });

    it("returns error when already a member", async () => {
      vi.mocked(dbInvitations.getInvitationByToken).mockResolvedValue({
        ...mockInvitation,
        token: "valid-token",
      });
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await joinViaInviteLink("valid-token", "user-456");

      expect(result.error).toBe("You are already a member of this league");
    });

    it("successfully joins via invite link", async () => {
      vi.mocked(dbInvitations.getInvitationByToken).mockResolvedValue({
        ...mockInvitation,
        token: "valid-token",
      });
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(0);
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(5);
      vi.mocked(dbLeagueMembers.createLeagueMember).mockResolvedValue(
        mockMember,
      );
      vi.mocked(dbInvitations.incrementInvitationUseCount).mockResolvedValue({
        ...mockInvitation,
        useCount: 1,
      });

      const result = await joinViaInviteLink("valid-token", "user-456");

      expect(result.data).toEqual({ joined: true, leagueId: "league-123" });
    });
  });

  describe("cancelInvitation", () => {
    it("returns error when requester lacks permission", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await cancelInvitation("inv-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to cancel invitations",
      );
    });

    it("successfully cancels invitation", async () => {
      vi.mocked(dbInvitations.getInvitationByIdWithDetails).mockResolvedValue(
        mockInvitationWithDetails,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbInvitations.deleteInvitation).mockResolvedValue(true);

      const result = await cancelInvitation("inv-123", "user-123");

      expect(result.data).toEqual({ cancelled: true });
    });
  });

  describe("getUserPendingInvitations", () => {
    it("returns pending invitations for user", async () => {
      vi.mocked(dbInvitations.getPendingInvitationsForUser).mockResolvedValue([
        mockInvitationWithDetails,
      ]);

      const result = await getUserPendingInvitations("user-456");

      expect(result.data).toEqual([mockInvitationWithDetails]);
    });
  });

  describe("getLeaguePendingInvitations", () => {
    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await getLeaguePendingInvitations(
        "league-123",
        "user-123",
      );

      expect(result.error).toBe(
        "You don't have permission to view invitations",
      );
    });

    it("returns pending invitations for league", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbInvitations.getPendingInvitationsForLeague).mockResolvedValue(
        [mockInvitationWithDetails],
      );

      const result = await getLeaguePendingInvitations(
        "league-123",
        "user-123",
      );

      expect(result.data).toEqual([mockInvitationWithDetails]);
    });
  });
});
