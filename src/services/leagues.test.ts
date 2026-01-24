import * as dbLeagueMembers from "@/db/league-members";
import * as dbLeagues from "@/db/leagues";
import { LeagueVisibility } from "@/lib/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_LEAGUES_PER_USER, MAX_MEMBERS_PER_LEAGUE } from "./constants";
import {
  archiveLeague,
  createLeague,
  deleteLeague,
  getArchivedLeagueById,
  getArchivedLeagues,
  getLeagueById,
  getUserLeagues,
  joinPublicLeague,
  leaveLeague,
  searchPublicLeagues,
  unarchiveLeague,
  updateLeague,
} from "./leagues";

vi.mock("@/db/leagues", () => ({
  createLeague: vi.fn(),
  getLeagueById: vi.fn(),
  updateLeague: vi.fn(),
  archiveLeague: vi.fn(),
  unarchiveLeague: vi.fn(),
  deleteLeague: vi.fn(),
  searchPublicLeagues: vi.fn(),
  getLeagueWithMemberCount: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  createLeagueMember: vi.fn(),
  getLeagueMember: vi.fn(),
  getLeaguesByUserId: vi.fn(),
  getArchivedLeaguesByUserId: vi.fn(),
  getMemberCount: vi.fn(),
  getMemberCountByRole: vi.fn(),
  getUserLeagueCount: vi.fn(),
  deleteLeagueMember: vi.fn(),
}));

vi.mock("@/db/invitations", () => ({
  acceptAllPendingInvitationsForLeague: vi.fn(),
}));

vi.mock("@/db", () => ({
  withTransaction: vi.fn((callback) =>
    callback({
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    }),
  ),
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
  role: "executive" as const,
  joinedAt: new Date(),
  suspendedUntil: null,
};

describe("leagues service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLeague", () => {
    it("returns validation error for invalid input", async () => {
      const result = await createLeague("user-123", {
        name: "",
        description: "",
        visibility: LeagueVisibility.PUBLIC,
      });

      expect(result.error).toBe("Validation failed");
      expect(result.fieldErrors).toBeDefined();
    });

    it("returns error when user has reached league limit", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(
        MAX_LEAGUES_PER_USER,
      );

      const result = await createLeague("user-123", {
        name: "New League",
        description: "Description",
        visibility: LeagueVisibility.PUBLIC,
      });

      expect(result.error).toBe(
        `You can only be a member of ${MAX_LEAGUES_PER_USER} leagues`,
      );
    });
  });

  describe("getLeagueById", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getLeagueById("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when league not found", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueWithMemberCount).mockResolvedValue(
        undefined,
      );

      const result = await getLeagueById("league-123", "user-123");

      expect(result.error).toBe("League not found");
    });

    it("returns error when league is archived", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueWithMemberCount).mockResolvedValue({
        ...mockLeague,
        isArchived: true,
        memberCount: 1,
      });

      const result = await getLeagueById("league-123", "user-123");

      expect(result.error).toBe("This league has been archived");
    });

    it("returns league with member count", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueWithMemberCount).mockResolvedValue({
        ...mockLeague,
        memberCount: 5,
      });

      const result = await getLeagueById("league-123", "user-123");

      expect(result.data).toEqual({ ...mockLeague, memberCount: 5 });
    });
  });

  describe("updateLeague", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await updateLeague("user-123", {
        leagueId: "league-123",
        name: "Updated Name",
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user is not an executive", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: "member",
      });

      const result = await updateLeague("user-123", {
        leagueId: "league-123",
        name: "Updated Name",
      });

      expect(result.error).toBe(
        "You don't have permission to edit league settings",
      );
    });

    it("successfully updates league", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagues.updateLeague).mockResolvedValue({
        ...mockLeague,
        name: "Updated Name",
      });

      const result = await updateLeague("user-123", {
        leagueId: "league-123",
        name: "Updated Name",
      });

      expect(result.data?.name).toBe("Updated Name");
    });
  });

  describe("archiveLeague", () => {
    it("returns error when user is not an executive", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: "member",
      });

      const result = await archiveLeague("league-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to archive the league",
      );
    });

    it("successfully archives league", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagues.archiveLeague).mockResolvedValue({
        ...mockLeague,
        isArchived: true,
      });

      const result = await archiveLeague("league-123", "user-123");

      expect(result.data).toEqual({ archived: true });
    });
  });

  describe("deleteLeague", () => {
    it("returns error when user is not an executive", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: "member",
      });

      const result = await deleteLeague("league-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to delete the league",
      );
    });

    it("successfully deletes league", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagues.deleteLeague).mockResolvedValue(true);

      const result = await deleteLeague("league-123", "user-123");

      expect(result.data).toEqual({ deleted: true });
    });
  });

  describe("getUserLeagues", () => {
    it("returns user leagues", async () => {
      const mockLeagues = [
        { ...mockLeague, role: "executive" as const, memberCount: 5 },
      ];
      vi.mocked(dbLeagueMembers.getLeaguesByUserId).mockResolvedValue(
        mockLeagues,
      );

      const result = await getUserLeagues("user-123");

      expect(result.data).toEqual(mockLeagues);
    });
  });

  describe("searchPublicLeagues", () => {
    it("returns validation error for empty query", async () => {
      const result = await searchPublicLeagues("", "user-123");

      expect(result.error).toBe("Invalid search query");
    });

    it("returns search results with membership status", async () => {
      const mockResults = [{ ...mockLeague, memberCount: 5 }];
      vi.mocked(dbLeagues.searchPublicLeagues).mockResolvedValue(mockResults);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await searchPublicLeagues("test", "user-123");

      expect(result.data).toEqual([
        { ...mockLeague, memberCount: 5, isMember: false },
      ]);
    });
  });

  describe("joinPublicLeague", () => {
    it("returns error when already a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await joinPublicLeague("league-123", "user-123");

      expect(result.error).toBe("You are already a member of this league");
    });

    it("returns error when league is private", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue({
        ...mockLeague,
        visibility: LeagueVisibility.PRIVATE,
      });

      const result = await joinPublicLeague("league-123", "user-123");

      expect(result.error).toBe(
        "This league is private and requires an invitation",
      );
    });

    it("returns error when user at league limit", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(
        MAX_LEAGUES_PER_USER,
      );

      const result = await joinPublicLeague("league-123", "user-123");

      expect(result.error).toBe(
        `You can only be a member of ${MAX_LEAGUES_PER_USER} leagues`,
      );
    });

    it("returns error when league at member limit", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(0);
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(
        MAX_MEMBERS_PER_LEAGUE,
      );

      const result = await joinPublicLeague("league-123", "user-123");

      expect(result.error).toBe(
        `This league has reached its maximum of ${MAX_MEMBERS_PER_LEAGUE} members`,
      );
    });

    it("successfully joins league", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(0);
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(5);
      vi.mocked(dbLeagueMembers.createLeagueMember).mockResolvedValue(
        mockMember,
      );

      const result = await joinPublicLeague("league-123", "user-123");

      expect(result.data).toEqual({ joined: true });
    });
  });

  describe("leaveLeague", () => {
    it("returns error when not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await leaveLeague("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when sole executive tries to leave", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagueMembers.getMemberCountByRole).mockResolvedValue(1);

      const result = await leaveLeague("league-123", "user-123");

      expect(result.error).toBe(
        "You are the only executive. Please transfer the executive role to another member before leaving.",
      );
    });

    it("allows executive to leave when there are other executives", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagueMembers.getMemberCountByRole).mockResolvedValue(2);
      vi.mocked(dbLeagueMembers.deleteLeagueMember).mockResolvedValue(true);

      const result = await leaveLeague("league-123", "user-123");

      expect(result.data).toEqual({ left: true });
    });

    it("allows regular member to leave", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: "member",
      });
      vi.mocked(dbLeagueMembers.deleteLeagueMember).mockResolvedValue(true);

      const result = await leaveLeague("league-123", "user-123");

      expect(result.data).toEqual({ left: true });
    });
  });

  describe("getArchivedLeagues", () => {
    it("returns archived leagues for user", async () => {
      const mockArchivedLeagues = [
        {
          ...mockLeague,
          isArchived: true,
          role: "executive" as const,
          memberCount: 5,
        },
      ];
      vi.mocked(dbLeagueMembers.getArchivedLeaguesByUserId).mockResolvedValue(
        mockArchivedLeagues,
      );

      const result = await getArchivedLeagues("user-123");

      expect(result.data).toEqual(mockArchivedLeagues);
    });

    it("returns empty array when no archived leagues", async () => {
      vi.mocked(dbLeagueMembers.getArchivedLeaguesByUserId).mockResolvedValue(
        [],
      );

      const result = await getArchivedLeagues("user-123");

      expect(result.data).toEqual([]);
    });
  });

  describe("getArchivedLeagueById", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getArchivedLeagueById("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user is not an executive", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: "member",
      });

      const result = await getArchivedLeagueById("league-123", "user-123");

      expect(result.error).toBe("Only executives can view archived leagues");
    });

    it("returns error when league is not archived", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueWithMemberCount).mockResolvedValue({
        ...mockLeague,
        isArchived: false,
        memberCount: 5,
      });

      const result = await getArchivedLeagueById("league-123", "user-123");

      expect(result.error).toBe("This league is not archived");
    });

    it("returns archived league with member count", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueWithMemberCount).mockResolvedValue({
        ...mockLeague,
        isArchived: true,
        memberCount: 5,
      });

      const result = await getArchivedLeagueById("league-123", "user-123");

      expect(result.data).toEqual({
        ...mockLeague,
        isArchived: true,
        memberCount: 5,
      });
    });
  });

  describe("unarchiveLeague", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await unarchiveLeague("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user is not an executive", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        role: "member",
      });

      const result = await unarchiveLeague("league-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to unarchive the league",
      );
    });

    it("returns error when league is not archived", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);

      const result = await unarchiveLeague("league-123", "user-123");

      expect(result.error).toBe("League is not archived");
    });

    it("successfully unarchives league", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue({
        ...mockLeague,
        isArchived: true,
      });
      vi.mocked(dbLeagues.unarchiveLeague).mockResolvedValue({
        ...mockLeague,
        isArchived: false,
      });

      const result = await unarchiveLeague("league-123", "user-123");

      expect(result.data).toEqual({ unarchived: true });
    });
  });
});
