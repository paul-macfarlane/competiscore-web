import { z } from "zod";

import { uuidSchema } from "./common";

export const placeholderIdSchema = z.object({
  placeholderId: uuidSchema,
  leagueId: uuidSchema,
});
