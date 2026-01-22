import { LEAGUE_LOGOS, LeagueVisibility } from "@/lib/constants";
import {
  LEAGUE_DESCRIPTION_MAX_LENGTH,
  LEAGUE_NAME_MAX_LENGTH,
} from "@/services/constants";
import { z } from "zod";

export const leagueNameSchema = z
  .string()
  .min(1, "League name is required")
  .max(
    LEAGUE_NAME_MAX_LENGTH,
    `League name must be at most ${LEAGUE_NAME_MAX_LENGTH} characters`,
  );

export const leagueDescriptionSchema = z
  .string()
  .min(1, "Description is required")
  .max(
    LEAGUE_DESCRIPTION_MAX_LENGTH,
    `Description must be at most ${LEAGUE_DESCRIPTION_MAX_LENGTH} characters`,
  );

export const leagueVisibilitySchema = z.enum([
  LeagueVisibility.PUBLIC,
  LeagueVisibility.PRIVATE,
]);

const VALID_LOGO_PATHS = LEAGUE_LOGOS.map(
  (logo) => `/league-logos/${logo}.svg`,
);

export const leagueLogoSchema = z
  .string()
  .refine((val) => val === "" || VALID_LOGO_PATHS.includes(val), {
    message: "Invalid logo selection",
  })
  .optional();

export const createLeagueFormSchema = z.object({
  name: leagueNameSchema,
  description: leagueDescriptionSchema,
  visibility: leagueVisibilitySchema,
  logo: leagueLogoSchema,
});

export type CreateLeagueFormValues = z.infer<typeof createLeagueFormSchema>;

export const updateLeagueFormSchema = z.object({
  name: leagueNameSchema.optional(),
  description: leagueDescriptionSchema.optional(),
  visibility: leagueVisibilitySchema.optional(),
  logo: leagueLogoSchema,
});

export type UpdateLeagueFormValues = z.infer<typeof updateLeagueFormSchema>;
