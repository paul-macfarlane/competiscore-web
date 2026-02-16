import { acceptAllPendingEventInvitationsForEvent } from "@/db/event-invitations";
import {
  countEventParticipants,
  addEventParticipant as dbAddEventParticipant,
  getEventParticipant,
} from "@/db/events";
import { type DBOrTx, db, withTransaction } from "@/db/index";
import { EventParticipantRole } from "@/lib/shared/constants";
import { MAX_EVENT_PARTICIPANTS } from "@/services/constants";

import { ServiceResult } from "./shared";

export async function addUserToEvent(
  userId: string,
  eventId: string,
  role: EventParticipantRole,
  dbOrTx: DBOrTx = db,
): Promise<ServiceResult<{ joined: boolean }>> {
  const existingParticipation = await getEventParticipant(
    eventId,
    userId,
    dbOrTx,
  );
  if (existingParticipation) {
    return { error: "You are already a participant in this event" };
  }

  const participantCount = await countEventParticipants(eventId, dbOrTx);
  if (participantCount >= MAX_EVENT_PARTICIPANTS) {
    return {
      error: `This event has reached the maximum of ${MAX_EVENT_PARTICIPANTS} participants`,
    };
  }

  const processJoin = async (tx: DBOrTx) => {
    await dbAddEventParticipant({ eventId, userId, role }, tx);
    await acceptAllPendingEventInvitationsForEvent(eventId, userId, tx);

    return { data: { joined: true } };
  };

  if (dbOrTx === db) {
    return withTransaction(processJoin);
  }
  return processJoin(dbOrTx);
}
