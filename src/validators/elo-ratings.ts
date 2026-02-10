import { z } from "zod";

export const getEloStandingsSchema = z.object({
  gameTypeId: z.uuid(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getParticipantEloHistorySchema = z.object({
  gameTypeId: z.uuid(),
  userId: z.string().min(1).optional(),
  teamId: z.uuid().optional(),
  placeholderMemberId: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
