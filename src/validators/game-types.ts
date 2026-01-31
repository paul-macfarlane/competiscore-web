import {
  GAME_TYPE_ICONS,
  GameCategory,
  ICON_PATHS,
} from "@/lib/shared/constants";
import {
  GAME_TYPE_DESCRIPTION_MAX_LENGTH,
  GAME_TYPE_NAME_MAX_LENGTH,
  RULES_MAX_LENGTH,
} from "@/services/constants";
import { z } from "zod";

import { uuidSchema } from "./common";
import {
  ffaConfigSchema,
  h2hConfigSchema,
  highScoreConfigSchema,
} from "./game-configs";

export const gameTypeNameSchema = z
  .string()
  .min(1, "Game type name is required")
  .max(
    GAME_TYPE_NAME_MAX_LENGTH,
    `Game type name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
  );

export const gameTypeDescriptionSchema = z
  .string()
  .max(
    GAME_TYPE_DESCRIPTION_MAX_LENGTH,
    `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
  )
  .optional();

const VALID_ICON_PATHS = GAME_TYPE_ICONS.map(
  (icon) => `${ICON_PATHS.GAME_TYPE_ICONS}/${icon}.svg`,
);

export const gameTypeLogoSchema = z
  .string()
  .refine((val) => val === "" || VALID_ICON_PATHS.includes(val), {
    message: "Invalid icon selection",
  })
  .optional();

export const gameTypeCategorySchema = z.enum([
  GameCategory.HEAD_TO_HEAD,
  GameCategory.FREE_FOR_ALL,
  GameCategory.HIGH_SCORE,
]);

const rulesSchema = z
  .string()
  .max(RULES_MAX_LENGTH, `Rules must be at most ${RULES_MAX_LENGTH} characters`)
  .optional()
  .or(z.literal(""));

export const createGameTypeFormSchema = z.discriminatedUnion("category", [
  z.object({
    name: gameTypeNameSchema,
    description: gameTypeDescriptionSchema,
    logo: gameTypeLogoSchema,
    category: z.literal(GameCategory.HEAD_TO_HEAD),
    config: h2hConfigSchema,
    leagueId: uuidSchema,
  }),
  z.object({
    name: gameTypeNameSchema,
    description: gameTypeDescriptionSchema,
    logo: gameTypeLogoSchema,
    category: z.literal(GameCategory.FREE_FOR_ALL),
    config: ffaConfigSchema,
    leagueId: uuidSchema,
  }),
  z.object({
    name: gameTypeNameSchema,
    description: gameTypeDescriptionSchema,
    logo: gameTypeLogoSchema,
    category: z.literal(GameCategory.HIGH_SCORE),
    config: highScoreConfigSchema,
    leagueId: uuidSchema,
  }),
]);

export type CreateGameTypeFormValues = z.infer<typeof createGameTypeFormSchema>;

// For updates, we only allow updating the rules field in config
const updateConfigSchema = z.object({
  rules: rulesSchema,
});

export const updateGameTypeFormSchema = z.discriminatedUnion("category", [
  z.object({
    category: z.literal(GameCategory.HEAD_TO_HEAD),
    name: gameTypeNameSchema.optional(),
    description: gameTypeDescriptionSchema,
    logo: gameTypeLogoSchema,
    config: updateConfigSchema.optional(),
  }),
  z.object({
    category: z.literal(GameCategory.FREE_FOR_ALL),
    name: gameTypeNameSchema.optional(),
    description: gameTypeDescriptionSchema,
    logo: gameTypeLogoSchema,
    config: updateConfigSchema.optional(),
  }),
  z.object({
    category: z.literal(GameCategory.HIGH_SCORE),
    name: gameTypeNameSchema.optional(),
    description: gameTypeDescriptionSchema,
    logo: gameTypeLogoSchema,
    config: updateConfigSchema.optional(),
  }),
]);

export type UpdateGameTypeFormValues = z.infer<typeof updateGameTypeFormSchema>;

export const gameTypeIdSchema = z.object({
  gameTypeId: uuidSchema,
});

export const createGameTypeActionSchema = z.object({
  leagueId: uuidSchema,
  input: createGameTypeFormSchema,
});

export const updateGameTypeActionSchema = z.object({
  gameTypeId: uuidSchema,
  input: updateGameTypeFormSchema,
});

export const archiveGameTypeSchema = z.object({
  gameTypeId: uuidSchema,
});

export const deleteGameTypeSchema = z.object({
  gameTypeId: uuidSchema,
});

export const unarchiveGameTypeSchema = z.object({
  gameTypeId: uuidSchema,
});
