import * as dbLeagueMembers from "@/db/league-members";
import * as dbLeagues from "@/db/leagues";
import * as dbTeamInvitations from "@/db/team-invitations";
import * as dbTeams from "@/db/teams";
import * as dbUsers from "@/db/users";
import {
  InvitationStatus,
  LeagueMemberRole,
  LeagueVisibility,
  TeamMemberRole,
} from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as joinLeague from "./join-league";
import {
  acceptTeamInvitation,
  cancelTeamInvitation,
  declineTeamInvitation,
  generateTeamInviteLink,
  getTeamInviteLinkDetails,
  getTeamPendingInvitations,
  getUserPendingTeamInvitations,
  inviteTeamMember,
  joinTeamViaInviteLink,
} from "./team-invitations";

vi.mock("@/db/team-invitations");
vi.mock("@/db/teams");
vi.mock("@/db/league-members");
vi.mock("@/db/leagues");
vi.mock("@/db/users");
vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((callback) => callback({})),
}));
vi.mock("./join-league");

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

const mockTeam = {
  id: "team-123",
  leagueId: "league-123",
  name: "The Champions",
  description: "Best team",
  logo: null,
  isArchived: false,
  createdById: "user-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLeagueMember = {
  id: "member-123",
  userId: "user-123",
  leagueId: "league-123",
  role: LeagueMemberRole.MEMBER,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockTeamMember = {
  id: "team-member-123",
  teamId: "team-123",
  userId: "user-123",
  placeholderMemberId: null,
  role: TeamMemberRole.MANAGER,
  joinedAt: new Date(),
  leftAt: null,
};

const mockInvitation = {
  id: "inv-123",
  teamId: "team-123",
  inviterId: "user-123",
  inviteeUserId: "user-456",
  role: TeamMemberRole.MEMBER,
  status: InvitationStatus.PENDING,
  token: null,
  maxUses: null,
  useCount: 0,
  createdAt: new Date(),
  expiresAt: null,
};

const mockInvitationWithDetails = {
  ...mockInvitation,
  team: {
    id: "team-123",
    name: "The Champions",
    logo: null,
    league: {
      id: "league-123",
      name: "Test League",
      logo: null,
    },
  },
  inviter: {
    id: "user-123",
    name: "Inviter",
    username: "inviter",
  },
  invitee: {
    id: "user-456",
    name: "Invitee",
    username: "invitee",
  },
};

const mockUser = {
  id: "user-456",
  name: "Invitee",
  email: "invitee@test.com",
  emailVerified: true,
  username: "invitee",
  bio: null,
  image: null,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("team-invitations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteTeamMember", () => {
    it("returns error when team not found", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(undefined);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe("Team not found");
    });

    it("returns error when inviter is not a league member", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe("You are not a member of this league");
    });

    it("returns error when inviter lacks permission", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe(
        "You don't have permission to invite members to this team",
      );
    });

    it("returns error when invitee not found", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
        mockTeamMember,
      );
      vi.mocked(dbUsers.getUserById).mockResolvedValue(undefined);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe("User not found");
    });

    it("returns error when invitee is not a league member", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember)
        .mockResolvedValueOnce(mockLeagueMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
        mockTeamMember,
      );
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe("User is not a member of this league");
    });

    it("returns error when invitee is already a team member", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId)
        .mockResolvedValueOnce(mockTeamMember)
        .mockResolvedValueOnce({ ...mockTeamMember, userId: "user-456" });
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe("User is already a member of this team");
    });

    it("returns error when invitation already exists", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId)
        .mockResolvedValueOnce(mockTeamMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);
      vi.mocked(
        dbTeamInvitations.checkExistingPendingTeamInvitation,
      ).mockResolvedValue(mockInvitation);

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.error).toBe(
        "User already has a pending invitation to this team",
      );
    });

    it("successfully creates invitation", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId)
        .mockResolvedValueOnce(mockTeamMember)
        .mockResolvedValueOnce(undefined);
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);
      vi.mocked(
        dbTeamInvitations.checkExistingPendingTeamInvitation,
      ).mockResolvedValue(undefined);
      vi.mocked(dbTeamInvitations.createTeamInvitation).mockResolvedValue(
        mockInvitation,
      );

      const result = await inviteTeamMember("user-123", {
        teamId: "team-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
      });

      expect(result.data).toEqual({
        invited: true,
        invitationId: "inv-123",
      });
      expect(dbTeamInvitations.createTeamInvitation).toHaveBeenCalledWith({
        teamId: "team-123",
        inviterId: "user-123",
        inviteeUserId: "user-456",
        role: TeamMemberRole.MEMBER,
        status: InvitationStatus.PENDING,
      });
    });
  });

  describe("generateTeamInviteLink", () => {
    it("successfully generates invite link", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
        mockTeamMember,
      );
      vi.mocked(dbTeamInvitations.createTeamInvitation).mockResolvedValue({
        ...mockInvitation,
        token: "test-token",
      });

      const result = await generateTeamInviteLink("user-123", {
        teamId: "team-123",
        role: TeamMemberRole.MEMBER,
        expiresInDays: 7,
        maxUses: 10,
      });

      expect(result.data?.token).toBeDefined();
      expect(result.data?.invitationId).toBe("inv-123");
    });
  });

  describe("acceptTeamInvitation", () => {
    it("returns error when invitation not found", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(undefined);

      const result = await acceptTeamInvitation("inv-123", "user-456");

      expect(result.error).toBe("Invitation not found");
    });

    it("returns error when invitation is not for the user", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);

      const result = await acceptTeamInvitation("inv-123", "wrong-user");

      expect(result.error).toBe("This invitation is not for you");
    });

    it("returns error when invitation is expired", async () => {
      const expiredInvitation = {
        ...mockInvitationWithDetails,
        expiresAt: new Date(Date.now() - 1000),
      };
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(expiredInvitation);

      const result = await acceptTeamInvitation("inv-123", "user-456");

      expect(result.error).toBe("This invitation has expired");
    });

    it("returns error when user is already a team member", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
        mockTeamMember,
      );

      const result = await acceptTeamInvitation("inv-123", "user-456");

      expect(result.error).toBe("You are already a member of this team");
    });

    it("successfully accepts invitation", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.createTeamMember).mockResolvedValue(mockTeamMember);

      const result = await acceptTeamInvitation("inv-123", "user-456");

      expect(result.data).toEqual({ joined: true });
      expect(dbTeams.createTeamMember).toHaveBeenCalled();
      expect(dbTeamInvitations.updateTeamInvitationStatus).toHaveBeenCalledWith(
        "inv-123",
        InvitationStatus.ACCEPTED,
      );
    });
  });

  describe("declineTeamInvitation", () => {
    it("successfully declines invitation", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);

      const result = await declineTeamInvitation("inv-123", "user-456");

      expect(result.data).toEqual({ declined: true });
      expect(dbTeamInvitations.updateTeamInvitationStatus).toHaveBeenCalledWith(
        "inv-123",
        InvitationStatus.DECLINED,
      );
    });
  });

  describe("joinTeamViaInviteLink", () => {
    const mockLinkInvitation = {
      ...mockInvitation,
      token: "test-token",
      inviteeUserId: null,
    };

    const mockLinkInvitationWithDetails = {
      ...mockLinkInvitation,
      team: mockInvitationWithDetails.team,
      inviter: mockInvitationWithDetails.inviter,
      invitee: null,
    };

    it("returns error when invite link not found", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByTokenWithDetails,
      ).mockResolvedValue(undefined);

      const result = await joinTeamViaInviteLink("test-token", "user-456");

      expect(result.error).toBe("Invite link not found");
    });

    it("returns error when team is archived", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByTokenWithDetails,
      ).mockResolvedValue(mockLinkInvitationWithDetails);
      vi.mocked(dbTeams.getTeamById).mockResolvedValue({
        ...mockTeam,
        isArchived: true,
      });

      const result = await joinTeamViaInviteLink("test-token", "user-456");

      expect(result.error).toBe("This team has been archived");
    });

    it("successfully joins team and league", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByTokenWithDetails,
      ).mockResolvedValue(mockLinkInvitationWithDetails);
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);
      vi.mocked(joinLeague.addUserToLeague).mockResolvedValue({
        data: { joined: true },
      });
      vi.mocked(dbTeams.createTeamMember).mockResolvedValue(mockTeamMember);

      const result = await joinTeamViaInviteLink("test-token", "user-456");

      expect(result.data).toEqual({
        joined: true,
        teamId: "team-123",
        leagueId: "league-123",
        joinedLeague: true,
      });
      expect(joinLeague.addUserToLeague).toHaveBeenCalled();
    });

    it("successfully joins team when already league member", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByTokenWithDetails,
      ).mockResolvedValue(mockLinkInvitationWithDetails);
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagues.getLeagueById).mockResolvedValue(mockLeague);
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.createTeamMember).mockResolvedValue(mockTeamMember);

      const result = await joinTeamViaInviteLink("test-token", "user-456");

      expect(result.data).toEqual({
        joined: true,
        teamId: "team-123",
        leagueId: "league-123",
        joinedLeague: false,
      });
      expect(joinLeague.addUserToLeague).not.toHaveBeenCalled();
    });
  });

  describe("getTeamInviteLinkDetails", () => {
    it("returns link details with validity check", async () => {
      const linkInvitation = {
        ...mockInvitation,
        token: "test-token",
        inviteeUserId: null,
      };

      const linkInvitationWithDetails = {
        ...linkInvitation,
        team: mockInvitationWithDetails.team,
        inviter: mockInvitationWithDetails.inviter,
        invitee: null,
      };

      vi.mocked(
        dbTeamInvitations.getTeamInvitationByTokenWithDetails,
      ).mockResolvedValue(linkInvitationWithDetails);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );

      const result = await getTeamInviteLinkDetails("test-token", "user-456");

      expect(result.data?.isValid).toBe(true);
      expect(result.data?.team.id).toBe("team-123");
      expect(result.data?.league.id).toBe("league-123");
      expect(result.data?.userIsLeagueMember).toBe(true);
    });
  });

  describe("cancelTeamInvitation", () => {
    it("successfully cancels invitation", async () => {
      vi.mocked(
        dbTeamInvitations.getTeamInvitationByIdWithDetails,
      ).mockResolvedValue(mockInvitationWithDetails);
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
        mockTeamMember,
      );
      vi.mocked(dbTeamInvitations.deleteTeamInvitation).mockResolvedValue(true);

      const result = await cancelTeamInvitation("inv-123", "user-123");

      expect(result.data).toEqual({ cancelled: true });
    });
  });

  describe("getUserPendingTeamInvitations", () => {
    it("returns user pending invitations", async () => {
      vi.mocked(
        dbTeamInvitations.getPendingTeamInvitationsForUser,
      ).mockResolvedValue([mockInvitationWithDetails]);

      const result = await getUserPendingTeamInvitations("user-456");

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe("inv-123");
    });
  });

  describe("getTeamPendingInvitations", () => {
    it("returns team pending invitations", async () => {
      vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
      vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
        mockLeagueMember,
      );
      vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
        mockTeamMember,
      );
      vi.mocked(
        dbTeamInvitations.getPendingTeamInvitationsForTeam,
      ).mockResolvedValue([mockInvitationWithDetails]);

      const result = await getTeamPendingInvitations("team-123", "user-123");

      expect(result.data).toHaveLength(1);
    });
  });
});
