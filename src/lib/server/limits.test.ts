import * as dbLeagueMembers from "@/db/league-members";
import * as dbLimitOverrides from "@/db/limit-overrides";
import {
  MAX_LEAGUES_PER_USER,
  MAX_MEMBERS_PER_LEAGUE,
} from "@/services/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canLeagueAddMember,
  canUserJoinAnotherLeague,
  getEffectiveLeagueMemberLimit,
  getEffectiveUserLeagueLimit,
  getLeagueMemberLimitInfo,
  getUserLeagueLimitInfo,
} from "./limits";

vi.mock("@/db/limit-overrides", () => ({
  getLimitOverrideForUser: vi.fn(),
  getLimitOverrideForLeague: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  getUserLeagueCount: vi.fn(),
  getMemberCount: vi.fn(),
}));

describe("limits library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEffectiveUserLeagueLimit", () => {
    it("returns default limit when no override exists", async () => {
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue(
        undefined,
      );

      const result = await getEffectiveUserLeagueLimit("user-123");

      expect(result).toBe(MAX_LEAGUES_PER_USER);
    });

    it("returns override limit when override exists", async () => {
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue({
        id: "override-1",
        limitType: "max_leagues_per_user",
        userId: "user-123",
        leagueId: null,
        limitValue: 10,
        createdBy: "admin-1",
        createdAt: new Date(),
        reason: null,
      });

      const result = await getEffectiveUserLeagueLimit("user-123");

      expect(result).toBe(10);
    });

    it("returns null (unlimited) when override has null limitValue", async () => {
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue({
        id: "override-1",
        limitType: "max_leagues_per_user",
        userId: "user-123",
        leagueId: null,
        limitValue: null,
        createdBy: "admin-1",
        createdAt: new Date(),
        reason: null,
      });

      const result = await getEffectiveUserLeagueLimit("user-123");

      expect(result).toBeNull();
    });
  });

  describe("getEffectiveLeagueMemberLimit", () => {
    it("returns default limit when no override exists", async () => {
      vi.mocked(dbLimitOverrides.getLimitOverrideForLeague).mockResolvedValue(
        undefined,
      );

      const result = await getEffectiveLeagueMemberLimit("league-123");

      expect(result).toBe(MAX_MEMBERS_PER_LEAGUE);
    });

    it("returns override limit when override exists", async () => {
      vi.mocked(dbLimitOverrides.getLimitOverrideForLeague).mockResolvedValue({
        id: "override-1",
        limitType: "max_members_per_league",
        userId: null,
        leagueId: "league-123",
        limitValue: 50,
        createdBy: "admin-1",
        createdAt: new Date(),
        reason: null,
      });

      const result = await getEffectiveLeagueMemberLimit("league-123");

      expect(result).toBe(50);
    });
  });

  describe("getUserLeagueLimitInfo", () => {
    it("returns correct info when under limit", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(1);
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue(
        undefined,
      );

      const result = await getUserLeagueLimitInfo("user-123");

      expect(result).toEqual({
        current: 1,
        max: MAX_LEAGUES_PER_USER,
        isAtLimit: false,
        isNearLimit: false,
      });
    });

    it("returns isNearLimit when one below limit", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(
        MAX_LEAGUES_PER_USER - 1,
      );
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue(
        undefined,
      );

      const result = await getUserLeagueLimitInfo("user-123");

      expect(result.isNearLimit).toBe(true);
      expect(result.isAtLimit).toBe(false);
    });

    it("returns isAtLimit when at limit", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(
        MAX_LEAGUES_PER_USER,
      );
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue(
        undefined,
      );

      const result = await getUserLeagueLimitInfo("user-123");

      expect(result.isAtLimit).toBe(true);
      expect(result.isNearLimit).toBe(false);
    });

    it("returns unlimited info when max is null", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(100);
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue({
        id: "override-1",
        limitType: "max_leagues_per_user",
        userId: "user-123",
        leagueId: null,
        limitValue: null,
        createdBy: "admin-1",
        createdAt: new Date(),
        reason: null,
      });

      const result = await getUserLeagueLimitInfo("user-123");

      expect(result).toEqual({
        current: 100,
        max: null,
        isAtLimit: false,
        isNearLimit: false,
      });
    });
  });

  describe("getLeagueMemberLimitInfo", () => {
    it("returns correct info when under limit", async () => {
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(5);
      vi.mocked(dbLimitOverrides.getLimitOverrideForLeague).mockResolvedValue(
        undefined,
      );

      const result = await getLeagueMemberLimitInfo("league-123");

      expect(result).toEqual({
        current: 5,
        max: MAX_MEMBERS_PER_LEAGUE,
        isAtLimit: false,
        isNearLimit: false,
      });
    });

    it("returns isAtLimit when at limit", async () => {
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(
        MAX_MEMBERS_PER_LEAGUE,
      );
      vi.mocked(dbLimitOverrides.getLimitOverrideForLeague).mockResolvedValue(
        undefined,
      );

      const result = await getLeagueMemberLimitInfo("league-123");

      expect(result.isAtLimit).toBe(true);
    });
  });

  describe("canUserJoinAnotherLeague", () => {
    it("returns allowed when under limit", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(1);
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue(
        undefined,
      );

      const result = await canUserJoinAnotherLeague("user-123");

      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("returns not allowed when at limit", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(
        MAX_LEAGUES_PER_USER,
      );
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue(
        undefined,
      );

      const result = await canUserJoinAnotherLeague("user-123");

      expect(result.allowed).toBe(false);
      expect(result.message).toBe(
        `You can only be a member of ${MAX_LEAGUES_PER_USER} leagues`,
      );
    });

    it("returns allowed when unlimited", async () => {
      vi.mocked(dbLeagueMembers.getUserLeagueCount).mockResolvedValue(100);
      vi.mocked(dbLimitOverrides.getLimitOverrideForUser).mockResolvedValue({
        id: "override-1",
        limitType: "max_leagues_per_user",
        userId: "user-123",
        leagueId: null,
        limitValue: null,
        createdBy: "admin-1",
        createdAt: new Date(),
        reason: null,
      });

      const result = await canUserJoinAnotherLeague("user-123");

      expect(result.allowed).toBe(true);
    });
  });

  describe("canLeagueAddMember", () => {
    it("returns allowed when under limit", async () => {
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(5);
      vi.mocked(dbLimitOverrides.getLimitOverrideForLeague).mockResolvedValue(
        undefined,
      );

      const result = await canLeagueAddMember("league-123");

      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("returns not allowed when at limit", async () => {
      vi.mocked(dbLeagueMembers.getMemberCount).mockResolvedValue(
        MAX_MEMBERS_PER_LEAGUE,
      );
      vi.mocked(dbLimitOverrides.getLimitOverrideForLeague).mockResolvedValue(
        undefined,
      );

      const result = await canLeagueAddMember("league-123");

      expect(result.allowed).toBe(false);
      expect(result.message).toBe(
        `This league has reached its maximum of ${MAX_MEMBERS_PER_LEAGUE} members`,
      );
    });
  });
});
