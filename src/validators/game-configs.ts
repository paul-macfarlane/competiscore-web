import {
  ParticipantType,
  ScoreOrder,
  ScoringType,
} from "@/lib/shared/constants";
import { RULES_MAX_LENGTH } from "@/services/constants";
import { z } from "zod";

const rulesSchema = z
  .string()
  .max(RULES_MAX_LENGTH, `Rules must be at most ${RULES_MAX_LENGTH} characters`)
  .optional()
  .or(z.literal(""));

export const h2hConfigSchema = z.object({
  scoringType: z.enum([ScoringType.WIN_LOSS, ScoringType.SCORE_BASED]),
  scoreDescription: z.string().max(50).optional(),
  scoreOrder: z
    .enum([ScoreOrder.HIGHEST_WINS, ScoreOrder.LOWEST_WINS])
    .optional(),
  drawsAllowed: z.boolean(),
  participantType: z.enum([ParticipantType.INDIVIDUAL, ParticipantType.TEAM]),
  minPlayersPerSide: z.number().int().min(1).max(10),
  maxPlayersPerSide: z.number().int().min(1).max(10),
  rules: rulesSchema,
});

export const ffaConfigSchema = z.object({
  scoringType: z.enum([ScoringType.RANKED_FINISH, ScoringType.SCORE_BASED]),
  scoreOrder: z.enum([ScoreOrder.HIGHEST_WINS, ScoreOrder.LOWEST_WINS]),
  scoreDescription: z.string().max(50).optional(),
  participantType: z.enum([ParticipantType.INDIVIDUAL, ParticipantType.TEAM]),
  minPlayers: z.number().int().min(2).max(50),
  maxPlayers: z.number().int().min(2).max(50),
  rules: rulesSchema,
});

export const highScoreConfigSchema = z.object({
  scoreOrder: z.enum([ScoreOrder.HIGHEST_WINS, ScoreOrder.LOWEST_WINS]),
  scoreDescription: z.string().min(1).max(50),
  participantType: z.enum([ParticipantType.INDIVIDUAL, ParticipantType.TEAM]),
  groupSize: z.number().int().min(1).max(10).optional(),
  rules: rulesSchema,
});

export const gameConfigSchema = z.union([
  h2hConfigSchema,
  ffaConfigSchema,
  highScoreConfigSchema,
]);

export type H2HConfigInput = z.input<typeof h2hConfigSchema>;
export type FFAConfigInput = z.input<typeof ffaConfigSchema>;
export type HighScoreConfigInput = z.input<typeof highScoreConfigSchema>;
export type GameConfigInput = z.input<typeof gameConfigSchema>;
