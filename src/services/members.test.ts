import * as dbLeagueMembers from "@/db/league-members";
import * as dbUsers from "@/db/users";
import { LeagueMemberRole } from "@/lib/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLeagueMembers,
  removeMember,
  searchUsersForInvite,
  updateMemberRole,
} from "./members";

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
  getLeagueMembers: vi.fn(),
  deleteLeagueMember: vi.fn(),
  getMemberCountByRole: vi.fn(),
  updateMemberRole: vi.fn(),
}));

vi.mock("@/db/users", () => ({
  searchUsersByQuery: vi.fn(),
}));

const mockMember = {
  id: "member-123",
  userId: "user-123",
  leagueId: "league-123",
  role: LeagueMemberRole.EXECUTIVE,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockMemberWithUser = {
  ...mockMember,
  user: {
    id: "user-123",
    name: "Test User",
    username: "testuser",
    image: null,
  },
};

describe("members service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLeagueMembers", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getLeagueMembers("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns members list when authorized", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagueMembers.getLeagueMembers).mockResolvedValue([
        mockMemberWithUser,
      ]);

      const result = await getLeagueMembers("league-123", "user-123");

      expect(result.data).toEqual([mockMemberWithUser]);
    });
  });

  describe("removeMember", () => {
    it("returns error when trying to remove self", async () => {
      const result = await removeMember("league-123", "user-123", "user-123");

      expect(result.error).toBe(
        "You cannot remove yourself. Use 'Leave League' instead.",
      );
    });

    it("returns error when requester is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await removeMember("league-123", "user-456", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when requester lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await removeMember("league-123", "user-456", "user-123");

      expect(result.error).toBe("You don't have permission to remove members");
    });

    it("returns error when trying to remove higher role", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce({
          ...mockMember,
          role: LeagueMemberRole.MANAGER,
        })
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
          role: LeagueMemberRole.EXECUTIVE,
        });

      const result = await removeMember("league-123", "user-456", "user-123");

      expect(result.error).toBe(
        "You cannot remove someone with an equal or higher role",
      );
    });

    it("successfully removes member with lower role", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce({
          ...mockMember,
          role: LeagueMemberRole.EXECUTIVE,
        })
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
          role: LeagueMemberRole.MEMBER,
        });
      vi.mocked(dbLeagueMembers.deleteLeagueMember).mockResolvedValue(true);

      const result = await removeMember("league-123", "user-456", "user-123");

      expect(result.data).toEqual({ removed: true });
    });
  });

  describe("updateMemberRole", () => {
    it("returns error when trying to change own role", async () => {
      const result = await updateMemberRole("user-123", {
        leagueId: "league-123",
        targetUserId: "user-123",
        role: LeagueMemberRole.MANAGER,
      });

      expect(result.error).toBe("You cannot change your own role");
    });

    it("returns error when requester lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MANAGER,
      });

      const result = await updateMemberRole("user-123", {
        leagueId: "league-123",
        targetUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe("You don't have permission to manage roles");
    });

    it("returns error when trying to modify equal role", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce({
          ...mockMember,
          role: LeagueMemberRole.EXECUTIVE,
        })
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
          role: LeagueMemberRole.EXECUTIVE,
        });

      const result = await updateMemberRole("user-123", {
        leagueId: "league-123",
        targetUserId: "user-456",
        role: LeagueMemberRole.MEMBER,
      });

      expect(result.error).toBe(
        "You cannot modify the role of someone with an equal or higher role",
      );
    });

    it("successfully updates role", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce({
          ...mockMember,
          role: LeagueMemberRole.EXECUTIVE,
        })
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
          role: LeagueMemberRole.MEMBER,
        });
      vi.mocked(dbLeagueMembers.updateMemberRole).mockResolvedValue({
        ...mockMember,
        userId: "user-456",
        role: LeagueMemberRole.MANAGER,
      });

      const result = await updateMemberRole("user-123", {
        leagueId: "league-123",
        targetUserId: "user-456",
        role: LeagueMemberRole.MANAGER,
      });

      expect(result.data).toEqual({ updated: true });
    });
  });

  describe("searchUsersForInvite", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await searchUsersForInvite(
        "league-123",
        "test",
        "user-123",
      );

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await searchUsersForInvite(
        "league-123",
        "test",
        "user-123",
      );

      expect(result.error).toBe("You don't have permission to invite members");
    });

    it("returns search results excluding current members", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: LeagueMemberRole.MANAGER,
      });
      vi.mocked(dbLeagueMembers.getLeagueMembers).mockResolvedValue([
        mockMemberWithUser,
      ]);
      vi.mocked(dbUsers.searchUsersByQuery).mockResolvedValue([
        { id: "user-789", name: "Other User", username: "other", image: null },
      ]);

      const result = await searchUsersForInvite(
        "league-123",
        "test",
        "user-123",
      );

      expect(result.data).toEqual([
        { id: "user-789", name: "Other User", username: "other", image: null },
      ]);
    });
  });
});
