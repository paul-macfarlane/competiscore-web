import * as dbLeagueMembers from "@/db/league-members";
import * as dbModerationActions from "@/db/moderation-actions";
import * as dbReports from "@/db/reports";
import {
  LeagueMemberRole,
  ModerationActionType,
  ReportReason,
} from "@/lib/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acknowledgeModerationAction,
  createReport,
  getMemberModerationHistory,
  getOwnModerationHistory,
  getOwnReportCount,
  getOwnSubmittedReports,
  getOwnWarningCount,
  getPendingReportCount,
  getPendingReports,
  getReportDetail,
  getSuspendedMembers,
  liftSuspension,
  takeModerationAction,
} from "./moderation";

vi.mock("@/db", () => ({
  withTransaction: vi.fn((callback) => callback({})),
}));

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
  isMemberSuspended: vi.fn(),
  suspendMember: vi.fn(),
  deleteLeagueMember: vi.fn(),
  getSuspendedMembers: vi.fn(),
  unsuspendMember: vi.fn(),
}));

vi.mock("@/db/reports", () => ({
  createReport: vi.fn(),
  getReportWithUsersById: vi.fn(),
  getPendingReportsByLeague: vi.fn(),
  getPendingReportCount: vi.fn(),
  hasExistingPendingReport: vi.fn(),
  updateReportStatus: vi.fn(),
  getReportsByReporter: vi.fn(),
}));

vi.mock("@/db/moderation-actions", () => ({
  createModerationAction: vi.fn(),
  createStandaloneModerationAction: vi.fn(),
  getModerationHistoryByUser: vi.fn(),
  getWarningsByUser: vi.fn(),
  acknowledgeModerationAction: vi.fn(),
}));

const mockMember = {
  id: "member-123",
  userId: "user-123",
  leagueId: "league-123",
  role: LeagueMemberRole.MEMBER,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockManager = {
  ...mockMember,
  id: "manager-123",
  userId: "manager-user-123",
  role: LeagueMemberRole.MANAGER,
};

const mockReport = {
  id: "report-123",
  reporterId: "user-123",
  reportedUserId: "user-456",
  leagueId: "league-123",
  reason: ReportReason.HARASSMENT,
  description: "Test description",
  evidence: null,
  status: "pending" as const,
  createdAt: new Date(),
};

const mockReportWithUsers = {
  ...mockReport,
  reporter: {
    id: "user-123",
    name: "Reporter User",
    username: "reporter",
    image: null,
  },
  reportedUser: {
    id: "user-456",
    name: "Reported User",
    username: "reported",
    image: null,
  },
};

describe("moderation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReport", () => {
    it("returns error for self-reporting", async () => {
      const result = await createReport("user-123", {
        reportedUserId: "user-123",
        leagueId: "league-123",
        reason: ReportReason.HARASSMENT,
        description: "Test description with enough length",
      });

      expect(result.error).toBe("You cannot report yourself");
    });

    it("returns error when reporter is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await createReport("user-123", {
        reportedUserId: "user-456",
        leagueId: "league-123",
        reason: ReportReason.HARASSMENT,
        description: "Test description with enough length",
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when reporter is suspended", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagueMembers.isMemberSuspended).mockResolvedValue(true);

      const result = await createReport("user-123", {
        reportedUserId: "user-456",
        leagueId: "league-123",
        reason: ReportReason.HARASSMENT,
        description: "Test description with enough length",
      });

      expect(result.error).toBe("You cannot report members while suspended");
    });

    it("returns error when reported user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbLeagueMembers.isMemberSuspended).mockResolvedValue(false);

      const result = await createReport("user-123", {
        reportedUserId: "user-456",
        leagueId: "league-123",
        reason: ReportReason.HARASSMENT,
        description: "Test description with enough length",
      });

      expect(result.error).toBe(
        "The user you are trying to report is not a league member",
      );
    });

    it("returns error when duplicate pending report exists", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagueMembers.isMemberSuspended).mockResolvedValue(false);
      vi.mocked(dbReports.hasExistingPendingReport).mockResolvedValue(true);

      const result = await createReport("user-123", {
        reportedUserId: "user-456",
        leagueId: "league-123",
        reason: ReportReason.HARASSMENT,
        description: "Test description with enough length",
      });

      expect(result.error).toBe(
        "You already have a pending report against this member",
      );
    });

    it("successfully creates report", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbLeagueMembers.isMemberSuspended).mockResolvedValue(false);
      vi.mocked(dbReports.hasExistingPendingReport).mockResolvedValue(false);
      vi.mocked(dbReports.createReport).mockResolvedValue(mockReport);

      const result = await createReport("user-123", {
        reportedUserId: "user-456",
        leagueId: "league-123",
        reason: ReportReason.HARASSMENT,
        description: "Test description with enough length",
      });

      expect(result.data).toEqual({ created: true });
    });
  });

  describe("getPendingReports", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getPendingReports("user-123", "league-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await getPendingReports("user-123", "league-123");

      expect(result.error).toBe("You don't have permission to view reports");
    });

    it("returns pending reports for authorized user", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);
      vi.mocked(dbReports.getPendingReportsByLeague).mockResolvedValue([
        mockReportWithUsers,
      ]);

      const result = await getPendingReports("manager-user-123", "league-123");

      expect(result.data).toEqual([mockReportWithUsers]);
    });
  });

  describe("getPendingReportCount", () => {
    it("returns 0 when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await getPendingReportCount("user-123", "league-123");

      expect(result.data).toBe(0);
    });

    it("returns count for authorized user", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);
      vi.mocked(dbReports.getPendingReportCount).mockResolvedValue(5);

      const result = await getPendingReportCount(
        "manager-user-123",
        "league-123",
      );

      expect(result.data).toBe(5);
    });
  });

  describe("takeModerationAction", () => {
    it("returns error when report not found", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(undefined);

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Test reason text",
      });

      expect(result.error).toBe("Report not found");
    });

    it("returns error when report already resolved", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue({
        ...mockReportWithUsers,
        status: "resolved",
      });

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Test reason text",
      });

      expect(result.error).toBe("This report has already been resolved");
    });

    it("returns error when moderator is not a member", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Test reason text",
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when moderator lacks permission", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await takeModerationAction("user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Test reason text",
      });

      expect(result.error).toBe(
        "You don't have permission to moderate members",
      );
    });

    it("returns error when moderating own report", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue({
        ...mockReportWithUsers,
        reporterId: "manager-user-123",
      });
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Test reason text",
      });

      expect(result.error).toBe("You cannot moderate a report you submitted");
    });

    it("returns error when target has equal or higher role", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
          role: LeagueMemberRole.EXECUTIVE,
        });

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Test reason text",
      });

      expect(result.error).toBe(
        "You cannot take action against someone with an equal or higher role",
      );
    });

    it("successfully dismisses report", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);
      vi.mocked(dbModerationActions.createModerationAction).mockResolvedValue({
        id: "action-123",
        reportId: "report-123",
        moderatorId: "manager-user-123",
        targetUserId: "user-456",
        leagueId: "league-123",
        action: ModerationActionType.DISMISSED,
        reason: "No evidence",
        suspendedUntil: null,
        createdAt: new Date(),
      });
      vi.mocked(dbReports.updateReportStatus).mockResolvedValue({
        ...mockReport,
        status: "resolved",
      });

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.DISMISSED,
        reason: "No evidence provided",
      });

      expect(result.data).toEqual({ actionTaken: true });
    });

    it("successfully warns member", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);
      vi.mocked(dbModerationActions.createModerationAction).mockResolvedValue({
        id: "action-123",
        reportId: "report-123",
        moderatorId: "manager-user-123",
        targetUserId: "user-456",
        leagueId: "league-123",
        action: ModerationActionType.WARNED,
        reason: "Violated rules",
        suspendedUntil: null,
        createdAt: new Date(),
      });
      vi.mocked(dbReports.updateReportStatus).mockResolvedValue({
        ...mockReport,
        status: "resolved",
      });

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.WARNED,
        reason: "Violated rules warning",
      });

      expect(result.data).toEqual({ actionTaken: true });
    });

    it("successfully suspends member", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);
      vi.mocked(dbModerationActions.createModerationAction).mockResolvedValue({
        id: "action-123",
        reportId: "report-123",
        moderatorId: "manager-user-123",
        targetUserId: "user-456",
        leagueId: "league-123",
        action: ModerationActionType.SUSPENDED,
        reason: "Serious violation",
        suspendedUntil: new Date(),
        createdAt: new Date(),
      });
      vi.mocked(dbReports.updateReportStatus).mockResolvedValue({
        ...mockReport,
        status: "resolved",
      });
      vi.mocked(dbLeagueMembers.suspendMember).mockResolvedValue({
        ...mockMember,
        suspendedUntil: new Date(),
      });

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.SUSPENDED,
        reason: "Serious violation here",
        suspensionDays: 7,
      });

      expect(result.data).toEqual({ actionTaken: true });
    });

    it("successfully removes member", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);
      vi.mocked(dbModerationActions.createModerationAction).mockResolvedValue({
        id: "action-123",
        reportId: "report-123",
        moderatorId: "manager-user-123",
        targetUserId: "user-456",
        leagueId: "league-123",
        action: ModerationActionType.REMOVED,
        reason: "Repeated violations",
        suspendedUntil: null,
        createdAt: new Date(),
      });
      vi.mocked(dbReports.updateReportStatus).mockResolvedValue({
        ...mockReport,
        status: "resolved",
      });
      vi.mocked(dbLeagueMembers.deleteLeagueMember).mockResolvedValue(true);

      const result = await takeModerationAction("manager-user-123", {
        reportId: "report-123",
        action: ModerationActionType.REMOVED,
        reason: "Repeated violations now",
      });

      expect(result.data).toEqual({ actionTaken: true });
    });
  });

  describe("getReportDetail", () => {
    it("returns error when report not found", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(undefined);

      const result = await getReportDetail("user-123", "report-123");

      expect(result.error).toBe("Report not found");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await getReportDetail("user-123", "report-123");

      expect(result.error).toBe("You don't have permission to view reports");
    });

    it("returns report details for authorized user", async () => {
      vi.mocked(dbReports.getReportWithUsersById).mockResolvedValue(
        mockReportWithUsers,
      );
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);
      vi.mocked(
        dbModerationActions.getModerationHistoryByUser,
      ).mockResolvedValue([]);

      const result = await getReportDetail("manager-user-123", "report-123");

      expect(result.data).toEqual({
        report: mockReportWithUsers,
        targetHistory: [],
      });
    });
  });

  describe("getOwnModerationHistory", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getOwnModerationHistory("user-123", "league-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns warnings and suspension status", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue({
        ...mockMember,
        suspendedUntil: futureDate,
      });
      vi.mocked(dbModerationActions.getWarningsByUser).mockResolvedValue([]);

      const result = await getOwnModerationHistory("user-123", "league-123");

      expect(result.data?.warnings).toEqual([]);
      expect(result.data?.suspendedUntil).toEqual(futureDate);
    });
  });

  describe("getMemberModerationHistory", () => {
    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await getMemberModerationHistory(
        "user-123",
        "user-456",
        "league-123",
      );

      expect(result.error).toBe(
        "You don't have permission to view moderation history",
      );
    });

    it("returns history for authorized user", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);
      vi.mocked(
        dbModerationActions.getModerationHistoryByUser,
      ).mockResolvedValue([]);

      const result = await getMemberModerationHistory(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.data).toEqual([]);
    });
  });

  describe("getOwnSubmittedReports", () => {
    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getOwnSubmittedReports("user-123", "league-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns submitted reports for member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
      vi.mocked(dbReports.getReportsByReporter).mockResolvedValue([
        mockReportWithUsers,
      ]);

      const result = await getOwnSubmittedReports("user-123", "league-123");

      expect(result.data).toEqual([mockReportWithUsers]);
    });
  });

  describe("getOwnReportCount", () => {
    it("returns count of submitted reports", async () => {
      vi.mocked(dbReports.getReportsByReporter).mockResolvedValue([
        mockReportWithUsers,
        mockReportWithUsers,
      ]);

      const result = await getOwnReportCount("user-123", "league-123");

      expect(result.data).toBe(2);
    });

    it("returns 0 when no reports", async () => {
      vi.mocked(dbReports.getReportsByReporter).mockResolvedValue([]);

      const result = await getOwnReportCount("user-123", "league-123");

      expect(result.data).toBe(0);
    });
  });

  describe("getOwnWarningCount", () => {
    it("returns count of warnings", async () => {
      const mockWarning = {
        id: "action-123",
        reportId: "report-123",
        moderatorId: "manager-user-123",
        targetUserId: "user-123",
        leagueId: "league-123",
        action: ModerationActionType.WARNED,
        reason: "Warning reason",
        suspendedUntil: null,
        acknowledgedAt: null,
        createdAt: new Date(),
        moderator: {
          id: "manager-user-123",
          name: "Manager",
          username: "manager",
          image: null,
        },
      };

      vi.mocked(dbModerationActions.getWarningsByUser).mockResolvedValue([
        mockWarning,
        mockWarning,
      ]);

      const result = await getOwnWarningCount("user-123", "league-123");

      expect(result.data).toBe(2);
    });

    it("returns 0 when no warnings", async () => {
      vi.mocked(dbModerationActions.getWarningsByUser).mockResolvedValue([]);

      const result = await getOwnWarningCount("user-123", "league-123");

      expect(result.data).toBe(0);
    });
  });

  describe("acknowledgeModerationAction", () => {
    it("returns error when action not found", async () => {
      vi.mocked(
        dbModerationActions.acknowledgeModerationAction,
      ).mockResolvedValue(false);

      const result = await acknowledgeModerationAction(
        "user-123",
        "action-123",
      );

      expect(result.error).toBe(
        "Moderation action not found or already acknowledged",
      );
    });

    it("successfully acknowledges action", async () => {
      vi.mocked(
        dbModerationActions.acknowledgeModerationAction,
      ).mockResolvedValue(true);

      const result = await acknowledgeModerationAction(
        "user-123",
        "action-123",
      );

      expect(result.data).toEqual({ acknowledged: true });
    });
  });

  describe("getSuspendedMembers", () => {
    const mockSuspendedMember = {
      ...mockMember,
      suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: {
        id: "user-456",
        name: "Suspended User",
        username: "suspended",
        image: null,
      },
    };

    it("returns error when user is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await getSuspendedMembers("user-123", "league-123");

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when user lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await getSuspendedMembers("user-123", "league-123");

      expect(result.error).toBe(
        "You don't have permission to view suspended members",
      );
    });

    it("returns suspended members for authorized user", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockManager);
      vi.mocked(dbLeagueMembers.getSuspendedMembers).mockResolvedValue([
        mockSuspendedMember,
      ]);

      const result = await getSuspendedMembers(
        "manager-user-123",
        "league-123",
      );

      expect(result.data).toEqual([mockSuspendedMember]);
    });
  });

  describe("liftSuspension", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const suspendedMember = {
      ...mockMember,
      userId: "user-456",
      suspendedUntil: futureDate,
    };

    it("returns error when moderator is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await liftSuspension(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when moderator lacks permission", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

      const result = await liftSuspension("user-123", "user-456", "league-123");

      expect(result.error).toBe(
        "You don't have permission to lift suspensions",
      );
    });

    it("returns error when target is not a member", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(undefined);

      const result = await liftSuspension(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.error).toBe("The member is no longer part of this league");
    });

    it("returns error when target is not suspended", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);

      const result = await liftSuspension(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.error).toBe("This member is not currently suspended");
    });

    it("returns error when suspension already expired", async () => {
      const pastDate = new Date(Date.now() - 1000);
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce({
          ...mockMember,
          userId: "user-456",
          suspendedUntil: pastDate,
        });

      const result = await liftSuspension(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.error).toBe("This member is not currently suspended");
    });

    it("returns error when target has equal or higher role", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce({
          ...suspendedMember,
          role: LeagueMemberRole.EXECUTIVE,
        });

      const result = await liftSuspension(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.error).toBe(
        "You cannot lift the suspension of someone with an equal or higher role",
      );
    });

    it("successfully lifts suspension", async () => {
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(suspendedMember);
      vi.mocked(dbLeagueMembers.unsuspendMember).mockResolvedValue({
        ...suspendedMember,
        suspendedUntil: null,
      });
      vi.mocked(
        dbModerationActions.createStandaloneModerationAction,
      ).mockResolvedValue({
        id: "action-123",
        reportId: null,
        moderatorId: "manager-user-123",
        targetUserId: "user-456",
        leagueId: "league-123",
        action: ModerationActionType.SUSPENSION_LIFTED,
        reason: "Suspension lifted early by moderator",
        suspendedUntil: null,
        acknowledgedAt: null,
        createdAt: new Date(),
      });

      const result = await liftSuspension(
        "manager-user-123",
        "user-456",
        "league-123",
      );

      expect(result.data).toEqual({ lifted: true });
    });
  });
});
