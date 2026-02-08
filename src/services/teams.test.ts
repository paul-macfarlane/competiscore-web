import * as dbIndex from "@/db/index";
import * as dbLeagueMembers from "@/db/league-members";
import * as dbTeams from "@/db/teams";
import { ICON_PATHS } from "@/lib/shared/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addTeamMember,
  archiveTeam,
  createTeam,
  deleteTeam,
  getLeagueTeams,
  getMyTeams,
  getTeam,
  leaveTeam,
  removeTeamMember,
  unarchiveTeam,
  updateTeam,
} from "./teams";

vi.mock("@/db/teams", () => ({
  createTeam: vi.fn(),
  getTeamById: vi.fn(),
  getTeamWithDetails: vi.fn(),
  getTeamsWithMemberCountByLeagueId: vi.fn(),
  getUserTeamsByLeagueId: vi.fn(),
  updateTeam: vi.fn(),
  archiveTeam: vi.fn(),
  unarchiveTeam: vi.fn(),
  deleteTeam: vi.fn(),
  checkTeamNameExists: vi.fn(),
  createTeamMember: vi.fn(),
  getTeamMemberById: vi.fn(),
  getTeamMemberByUserId: vi.fn(),
  getTeamMemberByPlaceholderId: vi.fn(),
  removeTeamMember: vi.fn(),
}));

vi.mock("@/db/league-members", () => ({
  getLeagueMember: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  withTransaction: vi.fn((callback) => callback({})),
}));

const LEAGUE_ID = "123e4567-e89b-12d3-a456-426614174000";
const TEAM_ID = "223e4567-e89b-12d3-a456-426614174000";
const USER_ID = "323e4567-e89b-12d3-a456-426614174000";
const USER_ID_2 = "423e4567-e89b-12d3-a456-426614174000";
const MEMBER_ID = "523e4567-e89b-12d3-a456-426614174000";
const TEAM_MEMBER_ID = "623e4567-e89b-12d3-a456-426614174000";
const TEAM_MEMBER_CREATOR_ID = "723e4567-e89b-12d3-a456-426614174000";
const PLACEHOLDER_ID = "823e4567-e89b-12d3-a456-426614174000";

const mockTeam = {
  id: TEAM_ID,
  leagueId: LEAGUE_ID,
  name: "The Champions",
  description: "Best team ever",
  logo: `${ICON_PATHS.TEAM_ICONS}/phoenix.svg`,
  isArchived: false,
  createdById: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTeamWithDetails = {
  ...mockTeam,
  createdBy: {
    id: USER_ID,
    name: "John Doe",
    username: "johndoe",
    image: null,
  },
  members: [],
};

const mockMember = {
  id: MEMBER_ID,
  userId: USER_ID,
  leagueId: LEAGUE_ID,
  role: "member" as const,
  joinedAt: new Date(),
  suspendedUntil: null,
};

const mockManagerMember = {
  ...mockMember,
  role: "manager" as const,
};

const mockTeamMember = {
  id: TEAM_MEMBER_ID,
  teamId: TEAM_ID,
  userId: USER_ID_2,
  placeholderMemberId: null,
  role: "member" as const,
  joinedAt: new Date(),
  leftAt: null,
};

const mockTeamManagerMember = {
  id: TEAM_MEMBER_CREATOR_ID,
  teamId: TEAM_ID,
  userId: USER_ID,
  placeholderMemberId: null,
  role: "manager" as const,
  joinedAt: new Date(),
  leftAt: null,
};

describe("createTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a team successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.checkTeamNameExists).mockResolvedValue(false);
    vi.mocked(dbTeams.createTeam).mockResolvedValue(mockTeam);
    vi.mocked(dbTeams.createTeamMember).mockResolvedValue(mockTeamMember);

    const result = await createTeam(USER_ID, {
      leagueId: LEAGUE_ID,
      name: "The Champions",
      description: "Best team ever",
      logo: `${ICON_PATHS.TEAM_ICONS}/phoenix.svg`,
    });

    expect(result.data).toEqual(mockTeam);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await createTeam(USER_ID, {
      leagueId: LEAGUE_ID,
      name: "The Champions",
    });

    expect(result.error).toBe("You are not a member of this league");
    expect(result.data).toBeUndefined();
  });

  it("should fail if name already exists", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.checkTeamNameExists).mockResolvedValue(true);

    const result = await createTeam(USER_ID, {
      leagueId: LEAGUE_ID,
      name: "The Champions",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A team with this name already exists",
    );
  });

  it("should fail with invalid input", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    const result = await createTeam(USER_ID, {
      leagueId: LEAGUE_ID,
      name: "",
    });

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors).toBeDefined();
  });

  it("should auto-add creator as team member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.checkTeamNameExists).mockResolvedValue(false);
    vi.mocked(dbTeams.createTeam).mockResolvedValue(mockTeam);
    vi.mocked(dbTeams.createTeamMember).mockResolvedValue(mockTeamMember);

    await createTeam(USER_ID, {
      leagueId: LEAGUE_ID,
      name: "The Champions",
    });

    expect(dbIndex.withTransaction).toHaveBeenCalled();
    expect(dbTeams.createTeamMember).toHaveBeenCalled();
  });
});

describe("getTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a team successfully", async () => {
    vi.mocked(dbTeams.getTeamWithDetails).mockResolvedValue(
      mockTeamWithDetails,
    );
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    const result = await getTeam(USER_ID, TEAM_ID);

    expect(result.data).toEqual(mockTeamWithDetails);
    expect(result.error).toBeUndefined();
  });

  it("should fail if team not found", async () => {
    vi.mocked(dbTeams.getTeamWithDetails).mockResolvedValue(undefined);

    const result = await getTeam(USER_ID, TEAM_ID);

    expect(result.error).toBe("Team not found");
    expect(result.data).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbTeams.getTeamWithDetails).mockResolvedValue(
      mockTeamWithDetails,
    );
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getTeam(USER_ID, TEAM_ID);

    expect(result.error).toBe("You are not a member of this league");
    expect(result.data).toBeUndefined();
  });
});

describe("getLeagueTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all teams for a league", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamsWithMemberCountByLeagueId).mockResolvedValue([
      { ...mockTeam, memberCount: 3 },
    ]);

    const result = await getLeagueTeams(USER_ID, LEAGUE_ID);

    expect(result.data).toEqual([{ ...mockTeam, memberCount: 3 }]);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getLeagueTeams(USER_ID, LEAGUE_ID);

    expect(result.error).toBe("You are not a member of this league");
    expect(result.data).toBeUndefined();
  });
});

describe("updateTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update a team as team manager", async () => {
    const updatedTeam = { ...mockTeam, name: "Updated Champions" };
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.checkTeamNameExists).mockResolvedValue(false);
    vi.mocked(dbTeams.updateTeam).mockResolvedValue(updatedTeam);

    const result = await updateTeam(
      USER_ID,
      { teamId: TEAM_ID },
      {
        name: "Updated Champions",
      },
    );

    expect(result.data).toEqual(updatedTeam);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a team manager (even if league manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await updateTeam(
      USER_ID,
      { teamId: TEAM_ID },
      {
        name: "Updated Champions",
      },
    );

    expect(result.error).toBe("You do not have permission to edit this team");
  });

  it("should fail if user is a regular team member (not manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);

    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue({
      ...mockTeamMember,
      userId: USER_ID,
    });

    const result = await updateTeam(
      USER_ID,
      { teamId: TEAM_ID },
      {
        name: "Updated",
      },
    );

    expect(result.error).toBe("You do not have permission to edit this team");
  });

  it("should fail if team not found", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(undefined);

    const result = await updateTeam(
      USER_ID,
      { teamId: TEAM_ID },
      {
        name: "Updated",
      },
    );

    expect(result.error).toBe("Team not found");
  });

  it("should fail if new name already exists", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.checkTeamNameExists).mockResolvedValue(true);

    const result = await updateTeam(
      USER_ID,
      { teamId: TEAM_ID },
      {
        name: "Existing Name",
      },
    );

    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name).toBe(
      "A team with this name already exists",
    );
  });
});

describe("archiveTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should archive a team as team manager", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.archiveTeam).mockResolvedValue({
      ...mockTeam,
      isArchived: true,
    });

    const result = await archiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBeUndefined();
  });

  it("should fail if user is a regular team member (not manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue({
      ...mockTeamMember,
      userId: USER_ID,
    });

    const result = await archiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe(
      "You do not have permission to archive this team",
    );
  });

  it("should fail if user is not a team manager (even if league manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await archiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe(
      "You do not have permission to archive this team",
    );
  });

  it("should fail if team not found", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(undefined);

    const result = await archiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("Team not found");
  });
});

describe("unarchiveTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should unarchive a team as team manager", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue({
      ...mockTeam,
      isArchived: true,
    });
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.unarchiveTeam).mockResolvedValue(mockTeam);

    const result = await unarchiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBeUndefined();
  });

  it("should fail if user is a regular team member (not manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue({
      ...mockTeam,
      isArchived: true,
    });
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue({
      ...mockTeamMember,
      userId: USER_ID,
    });

    const result = await unarchiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe(
      "You do not have permission to unarchive this team",
    );
  });

  it("should fail if user is not a team manager (even if league manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue({
      ...mockTeam,
      isArchived: true,
    });
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await unarchiveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe(
      "You do not have permission to unarchive this team",
    );
  });
});

describe("deleteTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a team as team manager", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.deleteTeam).mockResolvedValue(true);

    const result = await deleteTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBeUndefined();
  });

  it("should fail if user is a regular team member (not manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue({
      ...mockTeamMember,
      userId: USER_ID,
    });

    const result = await deleteTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("You do not have permission to delete this team");
  });

  it("should fail if user is not a team manager (even if league manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await deleteTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("You do not have permission to delete this team");
  });

  it("should fail if team not found", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(undefined);

    const result = await deleteTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("Team not found");
  });

  it("should fail if delete operation fails", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.deleteTeam).mockResolvedValue(false);

    const result = await deleteTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("Failed to delete team");
  });
});

describe("addTeamMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a user member as team manager", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember)
      .mockResolvedValueOnce(mockMember)
      .mockResolvedValueOnce(mockMember);
    // First call: check acting user's team membership (manager)
    // Second call: check if target user is already a team member
    vi.mocked(dbTeams.getTeamMemberByUserId)
      .mockResolvedValueOnce(mockTeamManagerMember)
      .mockResolvedValueOnce(undefined);
    vi.mocked(dbTeams.createTeamMember).mockResolvedValue(mockTeamMember);

    const result = await addTeamMember(
      USER_ID,
      { teamId: TEAM_ID },
      {
        userId: USER_ID_2,
      },
    );

    expect(result.data).toEqual(mockTeamMember);
    expect(result.error).toBeUndefined();
  });

  it("should add a placeholder member as team manager", async () => {
    const placeholderTeamMember = {
      ...mockTeamMember,
      userId: null,
      placeholderMemberId: PLACEHOLDER_ID,
    };
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByPlaceholderId).mockResolvedValue(
      undefined,
    );
    vi.mocked(dbTeams.createTeamMember).mockResolvedValue(
      placeholderTeamMember,
    );

    const result = await addTeamMember(
      USER_ID,
      { teamId: TEAM_ID },
      {
        placeholderMemberId: PLACEHOLDER_ID,
      },
    );

    expect(result.data).toEqual(placeholderTeamMember);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is a regular team member (not manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue({
      ...mockTeamMember,
      userId: USER_ID,
    });

    const result = await addTeamMember(
      USER_ID,
      { teamId: TEAM_ID },
      {
        userId: USER_ID_2,
      },
    );

    expect(result.error).toBe(
      "You do not have permission to add members to this team",
    );
  });

  it("should fail if user is not a team manager (even if league manager)", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await addTeamMember(
      USER_ID,
      { teamId: TEAM_ID },
      {
        userId: USER_ID_2,
      },
    );

    expect(result.error).toBe(
      "You do not have permission to add members to this team",
    );
  });

  it("should fail if target user is not a league member", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember)
      .mockResolvedValueOnce(mockMember)
      .mockResolvedValueOnce(undefined);
    vi.mocked(dbTeams.getTeamMemberByUserId)
      .mockResolvedValueOnce(mockTeamManagerMember)
      .mockResolvedValueOnce(undefined);

    const result = await addTeamMember(
      USER_ID,
      { teamId: TEAM_ID },
      {
        userId: USER_ID_2,
      },
    );

    expect(result.error).toBe("User is not a member of this league");
  });

  it("should fail if user is already a team member", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember)
      .mockResolvedValueOnce(mockMember)
      .mockResolvedValueOnce(mockMember);
    // First call: check acting user's team membership (manager)
    // Second call: check if target user is already a team member (returns existing)
    vi.mocked(dbTeams.getTeamMemberByUserId).mockReset();
    vi.mocked(dbTeams.getTeamMemberByUserId)
      .mockResolvedValueOnce(mockTeamManagerMember)
      .mockResolvedValueOnce(mockTeamMember);

    const result = await addTeamMember(
      USER_ID,
      { teamId: TEAM_ID },
      {
        userId: USER_ID_2,
      },
    );

    expect(result.error).toBe("User is already a member of this team");
  });

  it("should fail if neither userId nor placeholderMemberId provided", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(
      mockTeamManagerMember,
    );

    const result = await addTeamMember(USER_ID, { teamId: TEAM_ID }, {});

    expect(result.error).toBe("Validation failed");
  });
});

describe("removeTeamMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should remove a team member as team manager", async () => {
    vi.mocked(dbTeams.getTeamMemberById).mockResolvedValue(mockTeamMember);
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    // Acting user (USER_ID) is a team manager
    vi.mocked(dbTeams.getTeamMemberByUserId).mockImplementation(
      async (_teamId, userId) => {
        if (userId === USER_ID) return mockTeamManagerMember;
        return undefined;
      },
    );
    vi.mocked(dbTeams.removeTeamMember).mockResolvedValue({
      ...mockTeamMember,
      leftAt: new Date(),
    });

    const result = await removeTeamMember(USER_ID, {
      teamMemberId: TEAM_MEMBER_ID,
    });

    expect(result.error).toBeUndefined();
  });

  it("should fail if team member not found", async () => {
    vi.mocked(dbTeams.getTeamMemberById).mockResolvedValue(undefined);

    const result = await removeTeamMember(USER_ID, {
      teamMemberId: TEAM_MEMBER_ID,
    });

    expect(result.error).toBe("Team member not found");
  });

  it("should fail if user is a regular team member (not manager)", async () => {
    vi.mocked(dbTeams.getTeamMemberById).mockResolvedValue(mockTeamMember);
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue({
      ...mockTeamMember,
      userId: USER_ID,
    });

    const result = await removeTeamMember(USER_ID, {
      teamMemberId: TEAM_MEMBER_ID,
    });

    expect(result.error).toBe(
      "You do not have permission to remove members from this team",
    );
  });

  it("should fail if user is not a team manager (even if league manager)", async () => {
    vi.mocked(dbTeams.getTeamMemberById).mockResolvedValue(mockTeamMember);
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(
      mockManagerMember,
    );
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await removeTeamMember(USER_ID, {
      teamMemberId: TEAM_MEMBER_ID,
    });

    expect(result.error).toBe(
      "You do not have permission to remove members from this team",
    );
  });
});

describe("leaveTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should leave a team successfully", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(mockTeamMember);
    vi.mocked(dbTeams.removeTeamMember).mockResolvedValue({
      ...mockTeamMember,
      leftAt: new Date(),
    });

    const result = await leaveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBeUndefined();
  });

  it("should fail if team not found", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(undefined);

    const result = await leaveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("Team not found");
  });

  it("should fail if user is not a team member", async () => {
    vi.mocked(dbTeams.getTeamById).mockResolvedValue(mockTeam);
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getTeamMemberByUserId).mockResolvedValue(undefined);

    const result = await leaveTeam(USER_ID, { teamId: TEAM_ID });

    expect(result.error).toBe("You are not a member of this team");
  });
});

describe("getMyTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get user teams successfully", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(mockMember);
    vi.mocked(dbTeams.getUserTeamsByLeagueId).mockResolvedValue([mockTeam]);

    const result = await getMyTeams(USER_ID, LEAGUE_ID);

    expect(result.data).toEqual([mockTeam]);
    expect(result.error).toBeUndefined();
  });

  it("should fail if user is not a league member", async () => {
    vi.mocked(dbLeagueMembers.getLeagueMember).mockResolvedValue(undefined);

    const result = await getMyTeams(USER_ID, LEAGUE_ID);

    expect(result.error).toBe("You are not a member of this league");
  });
});
