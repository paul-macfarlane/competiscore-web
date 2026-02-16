import {
  EventTeamMemberWithDetails,
  EventTeamWithMembers,
  addEventTeamMember as dbAddEventTeamMember,
  checkEventTeamNameExists as dbCheckEventTeamNameExists,
  countEventTeamMembers as dbCountEventTeamMembers,
  countEventTeams as dbCountEventTeams,
  createEventTeam as dbCreateEventTeam,
  deleteEventTeam as dbDeleteEventTeam,
  getEventById as dbGetEventById,
  getEventParticipant as dbGetEventParticipant,
  getEventPlaceholderById as dbGetEventPlaceholderById,
  getEventTeamById as dbGetEventTeamById,
  getEventTeamMemberById as dbGetEventTeamMemberById,
  getEventTeamMembers as dbGetEventTeamMembers,
  getEventTeams as dbGetEventTeams,
  getTeamForPlaceholder as dbGetTeamForPlaceholder,
  getTeamForUser as dbGetTeamForUser,
  removeEventTeamMember as dbRemoveEventTeamMember,
  updateEventTeam as dbUpdateEventTeam,
} from "@/db/events";
import { EventStatus } from "@/lib/shared/constants";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { MAX_EVENT_TEAMS, MAX_EVENT_TEAM_MEMBERS } from "@/services/constants";
import {
  addEventTeamParticipantSchema,
  createEventTeamSchema,
  eventTeamIdSchema,
  removeEventTeamParticipantSchema,
  updateEventTeamSchema,
} from "@/validators/events";

import { ServiceResult, formatZodErrors } from "./shared";

export async function createEventTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ eventId: string; team: EventTeamWithMembers }>> {
  const parsed = createEventTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { eventId, name, logo, color } = parsed.data;

  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_TEAMS)) {
    return { error: "You don't have permission to manage teams" };
  }

  const nameExists = await dbCheckEventTeamNameExists(eventId, name);
  if (nameExists) {
    return {
      error: "Validation failed",
      fieldErrors: { name: "A team with this name already exists" },
    };
  }

  const teamCount = await dbCountEventTeams(eventId);
  if (teamCount >= MAX_EVENT_TEAMS) {
    return { error: `Event can have at most ${MAX_EVENT_TEAMS} teams` };
  }

  const team = await dbCreateEventTeam({
    eventId,
    name,
    logo: logo || null,
    color: color || null,
  });

  return { data: { eventId, team: { ...team, memberCount: 0 } } };
}

export async function getEventTeams(
  userId: string,
  eventId: string,
): Promise<ServiceResult<EventTeamWithMembers[]>> {
  const participation = await dbGetEventParticipant(eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const teams = await dbGetEventTeams(eventId);
  return { data: teams };
}

export async function getEventTeam(
  userId: string,
  teamId: string,
): Promise<ServiceResult<EventTeamWithMembers & { eventId: string }>> {
  const team = await dbGetEventTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const participation = await dbGetEventParticipant(team.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const members = await dbGetEventTeamMembers(teamId);
  return {
    data: {
      ...team,
      memberCount: members.length,
      eventId: team.eventId,
    },
  };
}

export async function updateEventTeam(
  userId: string,
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<{ eventId: string; team: EventTeamWithMembers }>> {
  const idParsed = eventTeamIdSchema.safeParse(idInput);
  if (!idParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(idParsed.error),
    };
  }

  const dataParsed = updateEventTeamSchema.safeParse(dataInput);
  if (!dataParsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(dataParsed.error),
    };
  }

  const team = await dbGetEventTeamById(idParsed.data.eventTeamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const participation = await dbGetEventParticipant(team.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_TEAMS)) {
    return { error: "You don't have permission to manage teams" };
  }

  if (dataParsed.data.name) {
    const nameExists = await dbCheckEventTeamNameExists(
      team.eventId,
      dataParsed.data.name,
      idParsed.data.eventTeamId,
    );
    if (nameExists) {
      return {
        error: "Validation failed",
        fieldErrors: { name: "A team with this name already exists" },
      };
    }
  }

  const updated = await dbUpdateEventTeam(idParsed.data.eventTeamId, {
    name: dataParsed.data.name,
    logo: dataParsed.data.logo,
    color: dataParsed.data.color,
  });
  if (!updated) {
    return { error: "Failed to update team" };
  }

  const memberCount = await dbCountEventTeamMembers(idParsed.data.eventTeamId);

  return {
    data: { eventId: team.eventId, team: { ...updated, memberCount } },
  };
}

export async function deleteEventTeam(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const parsed = eventTeamIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const team = await dbGetEventTeamById(parsed.data.eventTeamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const participation = await dbGetEventParticipant(team.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_TEAMS)) {
    return { error: "You don't have permission to manage teams" };
  }

  const event = await dbGetEventById(team.eventId);
  if (!event) {
    return { error: "Event not found" };
  }
  if (event.status !== EventStatus.DRAFT) {
    return { error: "Teams can only be deleted before the event starts" };
  }

  const deleted = await dbDeleteEventTeam(parsed.data.eventTeamId);
  if (!deleted) {
    return { error: "Failed to delete team" };
  }

  return { data: { deleted: true, eventId: team.eventId } };
}

export async function addEventTeamMember(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ added: boolean; eventId: string }>> {
  const parsed = addEventTeamParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const team = await dbGetEventTeamById(parsed.data.eventTeamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const participation = await dbGetEventParticipant(team.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_TEAMS)) {
    return { error: "You don't have permission to manage teams" };
  }

  const memberCount = await dbCountEventTeamMembers(parsed.data.eventTeamId);
  if (memberCount >= MAX_EVENT_TEAM_MEMBERS) {
    return {
      error: `Team can have at most ${MAX_EVENT_TEAM_MEMBERS} participants`,
    };
  }

  if (parsed.data.userId) {
    const userParticipation = await dbGetEventParticipant(
      team.eventId,
      parsed.data.userId,
    );
    if (!userParticipation) {
      return { error: "User is not a participant in this event" };
    }
    const existingTeam = await dbGetTeamForUser(
      team.eventId,
      parsed.data.userId,
    );
    if (existingTeam) {
      return {
        error: `This participant is already on team "${existingTeam.name}"`,
      };
    }
  }

  if (parsed.data.eventPlaceholderParticipantId) {
    const placeholder = await dbGetEventPlaceholderById(
      parsed.data.eventPlaceholderParticipantId,
    );
    if (!placeholder || placeholder.eventId !== team.eventId) {
      return { error: "Placeholder is not a participant in this event" };
    }
    const existingTeam = await dbGetTeamForPlaceholder(
      team.eventId,
      parsed.data.eventPlaceholderParticipantId,
    );
    if (existingTeam) {
      return {
        error: `This placeholder is already on team "${existingTeam.name}"`,
      };
    }
  }

  await dbAddEventTeamMember({
    eventTeamId: parsed.data.eventTeamId,
    userId: parsed.data.userId || null,
    eventPlaceholderParticipantId:
      parsed.data.eventPlaceholderParticipantId || null,
  });

  return { data: { added: true, eventId: team.eventId } };
}

export async function removeEventTeamMember(
  userId: string,
  input: unknown,
): Promise<ServiceResult<{ removed: boolean; eventId: string }>> {
  const parsed = removeEventTeamParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const teamMember = await dbGetEventTeamMemberById(
    parsed.data.eventTeamParticipantId,
  );
  if (!teamMember) {
    return { error: "Team participant not found" };
  }

  const team = await dbGetEventTeamById(teamMember.eventTeamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const participation = await dbGetEventParticipant(team.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  if (!canPerformEventAction(participation.role, EventAction.MANAGE_TEAMS)) {
    return { error: "You don't have permission to manage teams" };
  }

  const event = await dbGetEventById(team.eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== EventStatus.DRAFT) {
    return {
      error:
        "Participants can only be removed from teams before the event starts",
    };
  }

  const removed = await dbRemoveEventTeamMember(
    parsed.data.eventTeamParticipantId,
  );
  if (!removed) {
    return { error: "Failed to remove team participant" };
  }

  return { data: { removed: true, eventId: team.eventId } };
}

export async function getEventTeamMembers(
  userId: string,
  teamId: string,
): Promise<ServiceResult<EventTeamMemberWithDetails[]>> {
  const team = await dbGetEventTeamById(teamId);
  if (!team) {
    return { error: "Team not found" };
  }

  const participation = await dbGetEventParticipant(team.eventId, userId);
  if (!participation) {
    return { error: "You are not a participant in this event" };
  }

  const members = await dbGetEventTeamMembers(teamId);
  return { data: members };
}
