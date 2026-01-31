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
  archiveTeamSchema,
  createTeamFormSchema,
  deleteTeamSchema,
  leaveTeamSchema,
  teamIdSchema,
  teamMemberIdSchema,
  unarchiveTeamSchema,
  updateTeamFormSchema,
} from "@/validators/teams";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<Team>> {
  const parsed = createTeamFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { leagueId } = parsed.data;

  const membership = await getLeagueMember(userId, leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  if (!canPerformAction(membership.role, LeagueAction.CREATE_TEAMS)) {
    return { error: "You do not have permission to create teams" };
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
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<Team>> {
  const idParsed = teamIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateTeamFormSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const { teamId } = idParsed.data;

  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (
    !teamMember ||
    !canPerformTeamAction(teamMember.role, TeamAction.EDIT_TEAM)
  ) {
    return { error: "You do not have permission to edit this team" };
  }

  if (dataParsed.data.name) {
    const nameExists = await dbCheckTeamNameExists(
      team.leagueId,
      dataParsed.data.name,
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
    name: dataParsed.data.name,
    description: dataParsed.data.description,
    logo: dataParsed.data.logo,
  });

  if (!updated) {
    return { error: "Failed to update team" };
  }

  return { data: updated };
}

export async function archiveTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = archiveTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamId } = parsed.data;

  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (
    !teamMember ||
    !canPerformTeamAction(teamMember.role, TeamAction.ARCHIVE_TEAM)
  ) {
    return { error: "You do not have permission to archive this team" };
  }

  await dbArchiveTeam(teamId);
  return { data: undefined };
}

export async function unarchiveTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = unarchiveTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamId } = parsed.data;

  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (
    !teamMember ||
    !canPerformTeamAction(teamMember.role, TeamAction.UNARCHIVE_TEAM)
  ) {
    return { error: "You do not have permission to unarchive this team" };
  }

  await dbUnarchiveTeam(teamId);
  return { data: undefined };
}

export async function deleteTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = deleteTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamId } = parsed.data;

  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const teamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (
    !teamMember ||
    !canPerformTeamAction(teamMember.role, TeamAction.DELETE_TEAM)
  ) {
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
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<TeamMember>> {
  const idParsed = teamIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = addTeamMemberSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const { teamId } = idParsed.data;

  const team = await dbGetTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const membership = await getLeagueMember(userId, team.leagueId);
  if (!membership) {
    return { error: "You are not a member of this league" };
  }

  const actingTeamMember = await dbGetTeamMemberByUserId(teamId, userId);
  if (
    !actingTeamMember ||
    !canPerformTeamAction(actingTeamMember.role, TeamAction.ADD_MEMBERS)
  ) {
    return { error: "You do not have permission to add members to this team" };
  }

  if (dataParsed.data.userId) {
    const targetMembership = await getLeagueMember(
      dataParsed.data.userId,
      team.leagueId,
    );
    if (!targetMembership) {
      return { error: "User is not a member of this league" };
    }

    const existingMember = await dbGetTeamMemberByUserId(
      teamId,
      dataParsed.data.userId,
    );
    if (existingMember) {
      return { error: "User is already a member of this team" };
    }
  }

  if (dataParsed.data.placeholderMemberId) {
    const existingMember = await dbGetTeamMemberByPlaceholderId(
      teamId,
      dataParsed.data.placeholderMemberId,
    );
    if (existingMember) {
      return { error: "Placeholder member is already a member of this team" };
    }
  }

  const newMember = await dbCreateTeamMember({
    teamId,
    userId: dataParsed.data.userId || null,
    placeholderMemberId: dataParsed.data.placeholderMemberId || null,
  });

  return { data: newMember };
}

export async function removeTeamMember(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = teamMemberIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamMemberId } = parsed.data;

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
  if (
    !actingTeamMember ||
    !canPerformTeamAction(actingTeamMember.role, TeamAction.REMOVE_MEMBERS)
  ) {
    return {
      error: "You do not have permission to remove members from this team",
    };
  }

  await dbRemoveTeamMember(teamMemberId);
  return { data: undefined };
}

export async function leaveTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<void>> {
  const parsed = leaveTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { teamId } = parsed.data;

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
