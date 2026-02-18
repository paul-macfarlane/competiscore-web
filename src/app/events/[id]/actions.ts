"use server";

import type { EventTeamWithMembers } from "@/db/events";
import {
  Event,
  EventDiscretionaryAward,
  EventGameType,
  EventHighScoreEntry,
  EventHighScoreSession,
  EventMatch,
  EventTournament,
  EventTournamentParticipant,
} from "@/db/schema";
import { auth } from "@/lib/server/auth";
import {
  createDiscretionaryAward,
  deleteDiscretionaryAward,
  updateDiscretionaryAward,
} from "@/services/event-discretionary";
import {
  archiveEventGameType,
  createEventGameType,
  deleteEventGameType,
  unarchiveEventGameType,
  updateEventGameType,
} from "@/services/event-game-types";
import {
  closeHighScoreSession,
  deleteHighScoreEntry,
  deleteHighScoreSession,
  openHighScoreSession,
  reopenHighScoreSession,
  submitEventHighScore,
  updateHighScoreSession,
} from "@/services/event-high-scores";
import {
  acceptEventInvitation,
  cancelEventInvitation,
  generateEventInviteLink,
  inviteUserToEvent,
} from "@/services/event-invitations";
import {
  deleteEventMatch,
  recordEventFFAMatch,
  recordEventH2HMatch,
} from "@/services/event-matches";
import {
  addEventParticipant,
  demoteToParticipant,
  promoteToOrganizer,
  removeEventParticipant,
} from "@/services/event-participants";
import {
  addEventTeamMember,
  createEventTeam,
  deleteEventTeam,
  removeEventTeamMember,
  updateEventTeam,
} from "@/services/event-teams";
import {
  addEventTournamentParticipant,
  addEventTournamentPartnership,
  createEventTournament,
  deleteEventTournament,
  forfeitEventTournamentMatch,
  generateEventBracket,
  generateNextEventSwissRound,
  recordEventTournamentMatchResult,
  removeEventTournamentParticipant,
  setEventParticipantSeeds,
  undoEventTournamentMatchResult,
  updateEventTournament,
} from "@/services/event-tournaments";
import {
  archiveEvent,
  completeEvent,
  deleteEvent,
  leaveEvent,
  reopenEvent,
  startEvent,
  unarchiveEvent,
  updateEvent,
} from "@/services/events";
import { ServiceResult } from "@/services/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user.id ?? null;
}

// Event CRUD

export async function updateEventAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<Event>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await updateEvent(userId, idInput, dataInput);
  if (result.data) {
    revalidatePath(`/events/${result.data.id}`);
  }
  return result;
}

export async function deleteEventAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteEvent(userId, input);
  if (result.data) {
    revalidatePath("/events");
  }
  return result;
}

export async function startEventAction(
  input: unknown,
): Promise<ServiceResult<{ started: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await startEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function completeEventAction(
  input: unknown,
): Promise<ServiceResult<{ completed: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await completeEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function reopenEventAction(
  input: unknown,
): Promise<ServiceResult<{ reopened: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await reopenEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function archiveEventAction(
  input: unknown,
): Promise<ServiceResult<{ archived: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await archiveEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
    revalidatePath("/events");
  }
  return result;
}

export async function unarchiveEventAction(
  input: unknown,
): Promise<ServiceResult<{ unarchived: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await unarchiveEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
    revalidatePath("/events");
  }
  return result;
}

export async function leaveEventAction(
  input: unknown,
): Promise<ServiceResult<{ left: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await leaveEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
    revalidatePath("/events");
  }
  return result;
}

// Participants

export async function addEventParticipantAction(
  input: unknown,
): Promise<ServiceResult<{ added: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await addEventParticipant(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function removeEventParticipantAction(
  input: unknown,
): Promise<ServiceResult<{ removed: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await removeEventParticipant(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
    revalidatePath("/events");
  }
  return result;
}

export async function promoteToOrganizerAction(
  input: unknown,
): Promise<ServiceResult<{ promoted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await promoteToOrganizer(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function demoteToParticipantAction(
  input: unknown,
): Promise<ServiceResult<{ demoted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await demoteToParticipant(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

// Game Types

export async function createEventGameTypeAction(
  input: unknown,
): Promise<ServiceResult<EventGameType>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await createEventGameType(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function updateEventGameTypeAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<EventGameType>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await updateEventGameType(userId, idInput, dataInput);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function archiveEventGameTypeAction(
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await archiveEventGameType(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function unarchiveEventGameTypeAction(
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await unarchiveEventGameType(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteEventGameTypeAction(
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteEventGameType(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

// Teams

export async function createEventTeamAction(
  input: unknown,
): Promise<ServiceResult<{ eventId: string; team: EventTeamWithMembers }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await createEventTeam(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function updateEventTeamAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<{ eventId: string; team: EventTeamWithMembers }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await updateEventTeam(userId, idInput, dataInput);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteEventTeamAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteEventTeam(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function addEventTeamMemberAction(
  input: unknown,
): Promise<ServiceResult<{ added: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await addEventTeamMember(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function removeEventTeamMemberAction(
  input: unknown,
): Promise<ServiceResult<{ removed: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await removeEventTeamMember(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

// Match Recording

export async function recordEventH2HMatchAction(
  input: unknown,
): Promise<ServiceResult<{ match: EventMatch; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await recordEventH2HMatch(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function recordEventFFAMatchAction(
  input: unknown,
): Promise<ServiceResult<{ match: EventMatch; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await recordEventFFAMatch(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteEventMatchAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteEventMatch(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

// High Score Sessions

export async function openHighScoreSessionAction(
  input: unknown,
): Promise<ServiceResult<EventHighScoreSession>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await openHighScoreSession(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function submitEventHighScoreAction(
  input: unknown,
): Promise<ServiceResult<EventHighScoreEntry>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await submitEventHighScore(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteHighScoreEntryAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteHighScoreEntry(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function updateHighScoreSessionAction(
  input: unknown,
): Promise<ServiceResult<EventHighScoreSession>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await updateHighScoreSession(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function closeHighScoreSessionAction(
  input: unknown,
): Promise<ServiceResult<{ closed: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await closeHighScoreSession(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function reopenHighScoreSessionAction(
  input: unknown,
): Promise<ServiceResult<{ reopened: true; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await reopenHighScoreSession(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteHighScoreSessionAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: true; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteHighScoreSession(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

// Invitations

export async function inviteUserToEventAction(
  input: unknown,
): Promise<
  ServiceResult<{ invited: boolean; invitationId: string; eventId: string }>
> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await inviteUserToEvent(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function generateEventInviteLinkAction(
  input: unknown,
): Promise<
  ServiceResult<{ token: string; invitationId: string; eventId: string }>
> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  return generateEventInviteLink(userId, input);
}

export async function cancelEventInvitationAction(
  input: unknown,
): Promise<ServiceResult<{ cancelled: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await cancelEventInvitation(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function acceptEventInvitationAction(
  input: unknown,
): Promise<ServiceResult<{ joined: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await acceptEventInvitation(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
    revalidatePath("/events");
  }
  return result;
}

// Tournaments

export async function createEventTournamentAction(
  input: unknown,
): Promise<ServiceResult<EventTournament>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await createEventTournament(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function updateEventTournamentAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<EventTournament>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await updateEventTournament(userId, idInput, dataInput);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteEventTournamentAction(
  input: unknown,
): Promise<ServiceResult<{ eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteEventTournament(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function addEventTournamentParticipantAction(
  input: unknown,
): Promise<ServiceResult<EventTournamentParticipant>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  return addEventTournamentParticipant(userId, input);
}

export async function addEventTournamentPartnershipAction(
  input: unknown,
): Promise<ServiceResult<EventTournamentParticipant>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await addEventTournamentPartnership(userId, input);
  if (result.data) {
    revalidatePath(`/events`);
  }
  return result;
}

export async function removeEventTournamentParticipantAction(
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await removeEventTournamentParticipant(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function setEventParticipantSeedsAction(
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await setEventParticipantSeeds(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function generateEventBracketAction(
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await generateEventBracket(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function recordEventTournamentMatchResultAction(
  input: unknown,
): Promise<
  ServiceResult<{
    eventMatchId: string;
    eventTournamentId: string;
    eventId: string;
  }>
> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await recordEventTournamentMatchResult(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function forfeitEventTournamentMatchAction(
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await forfeitEventTournamentMatch(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function undoEventTournamentMatchResultAction(
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await undoEventTournamentMatchResult(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function generateNextEventSwissRoundAction(
  input: unknown,
): Promise<ServiceResult<{ eventTournamentId: string; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await generateNextEventSwissRound(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

// Discretionary Awards

export async function createDiscretionaryAwardAction(
  input: unknown,
): Promise<ServiceResult<EventDiscretionaryAward>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await createDiscretionaryAward(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function updateDiscretionaryAwardAction(
  idInput: unknown,
  dataInput: unknown,
): Promise<ServiceResult<EventDiscretionaryAward>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await updateDiscretionaryAward(userId, idInput, dataInput);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}

export async function deleteDiscretionaryAwardAction(
  input: unknown,
): Promise<ServiceResult<{ deleted: boolean; eventId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized" };

  const result = await deleteDiscretionaryAward(userId, input);
  if (result.data) {
    revalidatePath(`/events/${result.data.eventId}`);
  }
  return result;
}
