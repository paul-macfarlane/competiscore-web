import { z } from "zod";

import { uuidSchema } from "./common";

export const invitationIdSchema = z.object({
  invitationId: uuidSchema,
});

export const joinViaTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const cancelInvitationSchema = z.object({
  invitationId: uuidSchema,
  leagueId: uuidSchema,
});
