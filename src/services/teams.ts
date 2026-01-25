import { withTransaction } from "@/db/index";
import { getLeagueMember } from "@/db/league-members";
import { Team, TeamMember } from "@/db/schema";
import {
  TeamWithDetails,
  TeamWithMemberCount,
  archiveTeam as dbArchiveTeam,
  checkTeamNameExists as dbCheckTeamNameExists,
  createTeam as dbCreateTeam,
  createTeamMember as dbCreateTeamMember,
  deleteTeam as dbDeleteTeam,
  getTeamById as dbGetTeamById,
  getTeamMemberById as dbGetTeamMemberById,
  getTeamMemberByPlaceholderId as dbGetTeamMemberByPlaceholderId,
  getTeamMemberByUserId as dbGetTeamMemberByUserId,
  getTeamWithDetails as dbGetTeamWithDetails,
  getTeamsWithMemberCountByLeagueId as dbGetTeamsWithMemberCountByLeagueId,
  getUserTeamsByLeagueId as dbGetUserTeamsByLeagueId,
  removeTeamMember as dbRemoveTeamMember,
  unarchiveTeam as dbUnarchiveTeam,
  updateTeam as dbUpdateTeam,
} from "@/db/teams";
import { TeamMemberRole } from "@/lib/shared/constants";
import {
  LeagueAction,
  TeamAction,
  canPerformAction,
  canPerformTeamAction,
} from "@/lib/shared/permissions";
import {
  addTeamMemberSchema,
  createTeamFormSchema,
  updateTeamFormSchema,
} from "@/validators/teams";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createTeam(
  userId: string,
  leagueId: string,
  input: unknown,
): Promise<ServiceResult<Team>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TEAMS)) {
    return { error: "You do not have permission to create teams" };
  }

  const parsed = createTeamFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const nameExists = await dbCheckTeamNameExists(leagueId, parsed.data.name);
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "A team with this name already exists" },
    };
  }

  const team = await withTransaction(async (tx) => {
    const newTeam = await dbCreateTeam(
      {
        leagueId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        logo: parsed.data.logo || null,
        createdById: userId,
      },
      tx,
    );

    await dbCreateTeamMember(
      {
        teamId: newTeam.id,
        userId,
        role: TeamMemberRole.MANAGER,
      },
      tx,
    );

    return newTeam;
  });

  return { data: team };
}

export async function getTeam(
  userId: string,
  teamId: string,
): Promise<ServiceResult<TeamWithDetails>> {
  const team = await dbGetTeamWithDetails(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  return { data: team };
}

export async function getLeagueTeams(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<TeamWithMemberCount[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teams = await dbGetTeamsWithMemberCountByLeagueId(leagueId);
  return { data: teams };
}

export async function updateTeam(
  userId: string,
  teamId: string,
  input: unknown,
): Promise<ServiceResult<Team>> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  const hasTeamPermission =
    teamMember && canPerformTeamAction(teamMember.role, TeamAction.EDIT_TEAM);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );
  if (!hasTeamPermission && !hasLeaguePermission) {
    return { error: "You do not have permission to edit this team" };
  }

  const parsed = updateTeamFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  if (parsed.data.name) {
    const nameExists = await dbCheckTeamNameExists(
      team.leagueId,
      parsed.data.name,
      teamId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "A team with this name already exists" },
      };
    }
  }

  const updated = await dbUpdateTeam(teamId, {
    name: parsed.data.name,
    description: parsed.data.description,
    logo: parsed.data.logo,
  });

  if (!updated) {
    return { error: "Failed to update team" };
  }

  return { data: updated };
}

export async function archiveTeam(
  userId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  const hasTeamPermission =
    teamMember &&
    canPerformTeamAction(teamMember.role, TeamAction.ARCHIVE_TEAM);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );
  if (!hasTeamPermission && !hasLeaguePermission) {
    return { error: "You do not have permission to archive this team" };
  }

  await dbArchiveTeam(teamId);
  return { data: undefined };
}

export async function unarchiveTeam(
  userId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  const hasTeamPermission =
    teamMember &&
    canPerformTeamAction(teamMember.role, TeamAction.UNARCHIVE_TEAM);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );
  if (!hasTeamPermission && !hasLeaguePermission) {
    return { error: "You do not have permission to unarchive this team" };
  }

  await dbUnarchiveTeam(teamId);
  return { data: undefined };
}

export async function deleteTeam(
  userId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  const hasTeamPermission =
    teamMember && canPerformTeamAction(teamMember.role, TeamAction.DELETE_TEAM);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );
  if (!hasTeamPermission && !hasLeaguePermission) {
    return { error: "You do not have permission to delete this team" };
  }

  const deleted = await dbDeleteTeam(teamId);
  if (!deleted) {
    return { error: "Failed to delete team" };
  }

  return { data: undefined };
}

export async function addTeamMember(
  userId: string,
  teamId: string,
  input: unknown,
): Promise<ServiceResult<TeamMember>> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const actingTeamMember = await dbGetTeamMemberByUserId(teamId, userId);
  const hasTeamPermission =
    actingTeamMember &&
    canPerformTeamAction(actingTeamMember.role, TeamAction.ADD_MEMBERS);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );
  if (!hasTeamPermission && !hasLeaguePermission) {
    return { error: "You do not have permission to add members to this team" };
  }

  const parsed = addTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  if (parsed.data.userId) {
    const targetMembership = await getLeagueMember(
      parsed.data.userId,
      team.leagueId,
    );
    if (!targetMembership) {
      return { error: "User is not a member of this league" };
    }

    const existingMember = await dbGetTeamMemberByUserId(
      teamId,
      parsed.data.userId,
    );
    if (existingMember) {
      return { error: "User is already a member of this team" };
    }
  }

  if (parsed.data.placeholderMemberId) {
    const existingMember = await dbGetTeamMemberByPlaceholderId(
      teamId,
      parsed.data.placeholderMemberId,
    );
    if (existingMember) {
      return { error: "Placeholder member is already a member of this team" };
    }
  }

  const newMember = await dbCreateTeamMember({
    teamId,
    userId: parsed.data.userId || null,
    placeholderMemberId: parsed.data.placeholderMemberId || null,
  });

  return { data: newMember };
}

export async function removeTeamMember(
  userId: string,
  teamMemberId: string,
): Promise<ServiceResult<void>> {
  const targetMember = await dbGetTeamMemberById(teamMemberId);
  if (!targetMember) {
    return { error: "Team member not found" };
  }

  const team = await dbGetTeamById(targetMember.teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const actingTeamMember = await dbGetTeamMemberByUserId(team.id, userId);
  const hasTeamPermission =
    actingTeamMember &&
    canPerformTeamAction(actingTeamMember.role, TeamAction.REMOVE_MEMBERS);
  const hasLeaguePermission = canPerformAction(
    membership.role,
    LeagueAction.MANAGE_TEAMS,
  );
  if (!hasTeamPermission && !hasLeaguePermission) {
    return {
      error: "You do not have permission to remove members from this team",
    };
  }

  await dbRemoveTeamMember(teamMemberId);
  return { data: undefined };
}

export async function leaveTeam(
  userId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (!teamMember) {
    return { error: "You are not a member of this team" };
  }

  await dbRemoveTeamMember(teamMember.id);
  return { data: undefined };
}

export async function getMyTeams(
  userId: string,
  leagueId: string,
): Promise<ServiceResult<Team[]>> {
  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teams = await dbGetUserTeamsByLeagueId(userId, leagueId);
  return { data: teams };
}
