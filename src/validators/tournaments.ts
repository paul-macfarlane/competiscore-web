import { ICON_PATHS, TOURNAMENT_ICONS } from "@/lib/shared/constants";
import {
  MAX_TOURNAMENT_PARTICIPANTS,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { z } from "zod";

import { uuidSchema } from "./common";

const VALID_TOURNAMENT_ICON_PATHS = TOURNAMENT_ICONS.map(
  (icon) => `${ICON_PATHS.TOURNAMENT_ICONS}/${icon}.svg`,
);

export const tournamentLogoSchema = z
  .string()
  .refine((val) => val === "" || VALID_TOURNAMENT_ICON_PATHS.includes(val), {
    message: "Invalid icon selection",
  })
  .optional();

export const tournamentIdSchema = z.object({
  tournamentId: uuidSchema,
});

export type TournamentIdInput = z.infer<typeof tournamentIdSchema>;

export const createTournamentSchema = z.object({
  leagueId: uuidSchema,
  gameTypeId: uuidSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(
      TOURNAMENT_NAME_MAX_LENGTH,
      `Name must be ${TOURNAMENT_NAME_MAX_LENGTH} characters or less`,
    ),
  description: z
    .string()
    .max(
      TOURNAMENT_DESCRIPTION_MAX_LENGTH,
      `Description must be ${TOURNAMENT_DESCRIPTION_MAX_LENGTH} characters or less`,
    )
    .optional(),
  logo: tournamentLogoSchema,
  participantType: z.enum(["individual", "team"]),
  seedingType: z.enum(["manual", "random"]),
  startDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()).optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const updateTournamentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(
      TOURNAMENT_NAME_MAX_LENGTH,
      `Name must be ${TOURNAMENT_NAME_MAX_LENGTH} characters or less`,
    )
    .optional(),
  description: z
    .string()
    .max(
      TOURNAMENT_DESCRIPTION_MAX_LENGTH,
      `Description must be ${TOURNAMENT_DESCRIPTION_MAX_LENGTH} characters or less`,
    )
    .optional(),
  logo: tournamentLogoSchema,
  seedingType: z.enum(["manual", "random"]).optional(),
  startDate: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .nullable()
    .optional(),
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const addTournamentParticipantSchema = z
  .object({
    tournamentId: uuidSchema,
    userId: z.string().optional(),
    teamId: uuidSchema.optional(),
    placeholderMemberId: uuidSchema.optional(),
  })
  .refine(
    (data) => {
      const count = [data.userId, data.teamId, data.placeholderMemberId].filter(
        Boolean,
      ).length;
      return count === 1;
    },
    {
      message:
        "Exactly one of userId, teamId, or placeholderMemberId must be provided",
    },
  );

export type AddTournamentParticipantInput = z.infer<
  typeof addTournamentParticipantSchema
>;

export const removeTournamentParticipantSchema = z.object({
  tournamentId: uuidSchema,
  participantId: uuidSchema,
});

export type RemoveTournamentParticipantInput = z.infer<
  typeof removeTournamentParticipantSchema
>;

export const setParticipantSeedsSchema = z.object({
  tournamentId: uuidSchema,
  seeds: z
    .array(
      z.object({
        participantId: uuidSchema,
        seed: z.number().int().min(1),
      }),
    )
    .min(1, "At least one seed assignment is required")
    .max(MAX_TOURNAMENT_PARTICIPANTS),
});

export type SetParticipantSeedsInput = z.infer<
  typeof setParticipantSeedsSchema
>;

export const generateBracketSchema = z.object({
  tournamentId: uuidSchema,
});

export type GenerateBracketInput = z.infer<typeof generateBracketSchema>;

export const recordTournamentMatchResultSchema = z.object({
  tournamentMatchId: uuidSchema,
  winningSide: z.enum(["side1", "side2"]).optional(),
  side1Score: z.number("A number is required").optional(),
  side2Score: z.number("A number is required").optional(),
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
});

export type RecordTournamentMatchResultInput = z.infer<
  typeof recordTournamentMatchResultSchema
>;

export const forfeitTournamentMatchSchema = z.object({
  tournamentMatchId: uuidSchema,
  forfeitParticipantId: uuidSchema,
});

export type ForfeitTournamentMatchInput = z.infer<
  typeof forfeitTournamentMatchSchema
>;
