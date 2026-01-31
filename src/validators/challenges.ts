import { z } from "zod";

import { uuidSchema } from "./common";

export const matchIdSchema = z.object({
  matchId: uuidSchema,
});

export type MatchIdInput = z.infer<typeof matchIdSchema>;
