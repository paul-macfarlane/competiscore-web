import { z } from "zod";

export const getEloStandingsSchema = z.object({
  gameTypeId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getParticipantEloHistorySchema = z.object({
  gameTypeId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  placeholderMemberId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
