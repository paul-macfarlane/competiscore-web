import * as dbLeagueMembers from "@/db/league-members";
import * as dbPlaceholderMembers from "@/db/placeholder-members";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPlaceholder,
  getPlaceholders,
  getRetiredPlaceholders,
  restorePlaceholder,
  retirePlaceholder,
  updatePlaceholder,
} from "./placeholder-members";

vi.mock("@/db/placeholder-members");
vi.mock("@/db/league-members");

const mockLeagueMember = {
  id: "member-123",
  userId: "user-123",
  leagueId: "league-123",
  role: LeagueMemberRole.MANAGER,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockPlaceholder = {
  id: "placeholder-123",
  leagueId: "league-123",
  displayName: "John Placeholder",
  linkedUserId: null,
  createdAt: new Date(),
  retiredAt: null,
};

describe("placeholder-members service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPlaceholder", () => {
    it("returns error when user is not a league member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await createPlaceholder("user-123", {
        leagueId: "league-123",
        displayName: "John Placeholder",
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockLeagueMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await createPlaceholder("user-123", {
        leagueId: "league-123",
        displayName: "John Placeholder",
      });

      expect(result.error).toBe(
        "You don't have permission to create placeholder members",
      );
    });

    it("successfully creates placeholder", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbPlaceholderMembers.createPlaceholderMember).mockResolvedValue(
        mockPlaceholder,
      );

      const result = await createPlaceholder("user-123", {
        leagueId: "league-123",
        displayName: "John Placeholder",
      });

      expect(result.data).toEqual(mockPlaceholder);
      expect(dbPlaceholderMembers.createPlaceholderMember).toHaveBeenCalledWith(
        {
          leagueId: "league-123",
          displayName: "John Placeholder",
        },
      );
    });

    it("returns validation error for invalid input", async () => {
      const result = await createPlaceholder("user-123", {
        leagueId: "league-123",
        displayName: "",
      });

      expect(result.error).toBe("Validation failed");
      expect(result.fieldErrors).toBeDefined();
    });
  });

  describe("getPlaceholders", () => {
    it("returns error when user is not a league member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getPlaceholders("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("successfully returns placeholders for any league member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockLeagueMember,
        role: LeagueMemberRole.MEMBER,
      });
      vi.mocked(
        dbPlaceholderMembers.getActivePlaceholderMembersByLeague,
      ).mockResolvedValue([mockPlaceholder]);

      const result = await getPlaceholders("league-123", "user-123");

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual(mockPlaceholder);
    });

    it("successfully returns placeholders for managers", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(
        dbPlaceholderMembers.getActivePlaceholderMembersByLeague,
      ).mockResolvedValue([mockPlaceholder]);

      const result = await getPlaceholders("league-123", "user-123");

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual(mockPlaceholder);
    });
  });

  describe("updatePlaceholder", () => {
    it("returns error when placeholder not found", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(undefined);

      const result = await updatePlaceholder("user-123", {
        placeholderId: "placeholder-123",
        displayName: "Updated Name",
      });

      expect(result.error).toBe("Placeholder member not found");
    });

    it("returns error when user is not a league member", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await updatePlaceholder("user-123", {
        placeholderId: "placeholder-123",
        displayName: "Updated Name",
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockLeagueMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await updatePlaceholder("user-123", {
        placeholderId: "placeholder-123",
        displayName: "Updated Name",
      });

      expect(result.error).toBe(
        "You don't have permission to manage placeholder members",
      );
    });

    it("successfully updates placeholder", async () => {
      const updatedPlaceholder = {
        ...mockPlaceholder,
        displayName: "Updated Name",
      };

      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbPlaceholderMembers.updatePlaceholderMember).mockResolvedValue(
        updatedPlaceholder,
      );

      const result = await updatePlaceholder("user-123", {
        placeholderId: "placeholder-123",
        displayName: "Updated Name",
      });

      expect(result.data).toEqual(updatedPlaceholder);
      expect(dbPlaceholderMembers.updatePlaceholderMember).toHaveBeenCalledWith(
        "placeholder-123",
        {
          displayName: "Updated Name",
        },
      );
    });

    it("returns error when update fails", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbPlaceholderMembers.updatePlaceholderMember).mockResolvedValue(
        undefined,
      );

      const result = await updatePlaceholder("user-123", {
        placeholderId: "placeholder-123",
        displayName: "Updated Name",
      });

      expect(result.error).toBe("Failed to update placeholder member");
    });
  });

  describe("retirePlaceholder", () => {
    it("returns error when placeholder not found", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(undefined);

      const result = await retirePlaceholder("placeholder-123", "user-123");

      expect(result.error).toBe("Placeholder member not found");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockLeagueMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await retirePlaceholder("placeholder-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to retire placeholder members",
      );
    });

    it("successfully retires placeholder", async () => {
      const retiredPlaceholder = {
        ...mockPlaceholder,
        retiredAt: new Date(),
      };

      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbPlaceholderMembers.retirePlaceholderMember).mockResolvedValue(
        retiredPlaceholder,
      );

      const result = await retirePlaceholder("placeholder-123", "user-123");

      expect(result.data).toEqual({ retired: true });
      expect(dbPlaceholderMembers.retirePlaceholderMember).toHaveBeenCalledWith(
        "placeholder-123",
      );
    });

    it("returns error when retire fails", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbPlaceholderMembers.retirePlaceholderMember).mockResolvedValue(
        undefined,
      );

      const result = await retirePlaceholder("placeholder-123", "user-123");

      expect(result.error).toBe("Failed to retire placeholder member");
    });
  });

  describe("getRetiredPlaceholders", () => {
    it("returns error when user is not a league member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getRetiredPlaceholders("league-123", "user-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockLeagueMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await getRetiredPlaceholders("league-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to view retired placeholders",
      );
    });

    it("successfully returns retired placeholders", async () => {
      const retiredPlaceholder = {
        ...mockPlaceholder,
        retiredAt: new Date(),
      };

      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(
        dbPlaceholderMembers.getRetiredPlaceholderMembersByLeague,
      ).mockResolvedValue([retiredPlaceholder]);

      const result = await getRetiredPlaceholders("league-123", "user-123");

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual(retiredPlaceholder);
    });
  });

  describe("restorePlaceholder", () => {
    it("returns error when placeholder not found", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(undefined);

      const result = await restorePlaceholder("placeholder-123", "user-123");

      expect(result.error).toBe("Placeholder member not found");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockLeagueMember,
        role: LeagueMemberRole.MEMBER,
      });

      const result = await restorePlaceholder("placeholder-123", "user-123");

      expect(result.error).toBe(
        "You don't have permission to restore placeholder members",
      );
    });

    it("successfully restores placeholder", async () => {
      const restoredPlaceholder = {
        ...mockPlaceholder,
        retiredAt: null,
      };

      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(
        dbPlaceholderMembers.restorePlaceholderMember,
      ).mockResolvedValue(restoredPlaceholder);

      const result = await restorePlaceholder("placeholder-123", "user-123");

      expect(result.data).toEqual({ restored: true });
      expect(
        dbPlaceholderMembers.restorePlaceholderMember,
      ).toHaveBeenCalledWith("placeholder-123");
    });

    it("returns error when restore fails", async () => {
      vi.mocked(
        dbPlaceholderMembers.getPlaceholderMemberById,
      ).mockResolvedValue(mockPlaceholder);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(
        dbPlaceholderMembers.restorePlaceholderMember,
      ).mockResolvedValue(undefined);

      const result = await restorePlaceholder("placeholder-123", "user-123");

      expect(result.error).toBe("Failed to restore placeholder member");
    });
  });
});
