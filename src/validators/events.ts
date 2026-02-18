import {
  EVENT_ICONS,
  GameCategory,
  ICON_PATHS,
  ParticipantType,
} from "@/lib/shared/constants";
import {
  DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH,
  DISCRETIONARY_AWARD_NAME_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_NAME_MAX_LENGTH,
  EVENT_TEAM_COLORS,
  GAME_TYPE_DESCRIPTION_MAX_LENGTH,
  GAME_TYPE_NAME_MAX_LENGTH,
  HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH,
  HIGH_SCORE_SESSION_NAME_MAX_LENGTH,
  MAX_BEST_OF,
  MAX_DISCRETIONARY_AWARD_RECIPIENTS,
  MAX_EVENT_TEAM_NAME_MAX_LENGTH,
  MAX_TOURNAMENT_PARTICIPANTS,
  NAME_MAX_LENGTH,
  RULES_MAX_LENGTH,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { z } from "zod";

import { uuidSchema } from "./common";
import {
  ffaConfigSchema,
  h2hConfigSchema,
  highScoreConfigSchema,
} from "./game-configs";

// Event logos
const VALID_EVENT_ICON_PATHS = EVENT_ICONS.map(
  (icon) => `${ICON_PATHS.EVENT_ICONS}/${icon}.svg`,
);

export const eventLogoSchema = z
  .string()
  .refine((val) => val === "" || VALID_EVENT_ICON_PATHS.includes(val), {
    message: "Invalid icon selection",
  })
  .optional();

// Event ID schemas
export const eventIdSchema = z.object({
  eventId: uuidSchema,
});

export type EventIdInput = z.infer<typeof eventIdSchema>;

// Create event
export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(
      EVENT_NAME_MAX_LENGTH,
      `Event name must be at most ${EVENT_NAME_MAX_LENGTH} characters`,
    ),
  description: z
    .string()
    .max(
      EVENT_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${EVENT_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  logo: eventLogoSchema,
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

// Update event
export const updateEventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(
      EVENT_NAME_MAX_LENGTH,
      `Event name must be at most ${EVENT_NAME_MAX_LENGTH} characters`,
    )
    .optional(),
  description: z
    .string()
    .max(
      EVENT_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${EVENT_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  logo: eventLogoSchema,
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Event game type
export const createEventGameTypeSchema = z.discriminatedUnion("category", [
  z.object({
    eventId: uuidSchema,
    name: z
      .string()
      .min(1, "Game type name is required")
      .max(
        GAME_TYPE_NAME_MAX_LENGTH,
        `Name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
      ),
    description: z
      .string()
      .max(
        GAME_TYPE_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
      )
      .optional(),
    logo: z.string().optional(),
    category: z.literal(GameCategory.HEAD_TO_HEAD),
    config: h2hConfigSchema,
  }),
  z.object({
    eventId: uuidSchema,
    name: z
      .string()
      .min(1, "Game type name is required")
      .max(
        GAME_TYPE_NAME_MAX_LENGTH,
        `Name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
      ),
    description: z
      .string()
      .max(
        GAME_TYPE_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
      )
      .optional(),
    logo: z.string().optional(),
    category: z.literal(GameCategory.FREE_FOR_ALL),
    config: ffaConfigSchema,
  }),
  z.object({
    eventId: uuidSchema,
    name: z
      .string()
      .min(1, "Game type name is required")
      .max(
        GAME_TYPE_NAME_MAX_LENGTH,
        `Name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
      ),
    description: z
      .string()
      .max(
        GAME_TYPE_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
      )
      .optional(),
    logo: z.string().optional(),
    category: z.literal(GameCategory.HIGH_SCORE),
    config: highScoreConfigSchema,
  }),
]);

export type CreateEventGameTypeInput = z.infer<
  typeof createEventGameTypeSchema
>;

const updateEventGameTypeConfigSchema = z.object({
  rules: z
    .string()
    .max(
      RULES_MAX_LENGTH,
      `Rules must be at most ${RULES_MAX_LENGTH} characters`,
    )
    .optional()
    .or(z.literal("")),
});

export const updateEventGameTypeSchema = z.discriminatedUnion("category", [
  z.object({
    category: z.literal(GameCategory.HEAD_TO_HEAD),
    name: z
      .string()
      .min(1, "Game type name is required")
      .max(
        GAME_TYPE_NAME_MAX_LENGTH,
        `Name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
      )
      .optional(),
    description: z
      .string()
      .max(
        GAME_TYPE_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
      )
      .optional(),
    logo: z.string().optional(),
    config: updateEventGameTypeConfigSchema.optional(),
  }),
  z.object({
    category: z.literal(GameCategory.FREE_FOR_ALL),
    name: z
      .string()
      .min(1, "Game type name is required")
      .max(
        GAME_TYPE_NAME_MAX_LENGTH,
        `Name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
      )
      .optional(),
    description: z
      .string()
      .max(
        GAME_TYPE_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
      )
      .optional(),
    logo: z.string().optional(),
    config: updateEventGameTypeConfigSchema.optional(),
  }),
  z.object({
    category: z.literal(GameCategory.HIGH_SCORE),
    name: z
      .string()
      .min(1, "Game type name is required")
      .max(
        GAME_TYPE_NAME_MAX_LENGTH,
        `Name must be at most ${GAME_TYPE_NAME_MAX_LENGTH} characters`,
      )
      .optional(),
    description: z
      .string()
      .max(
        GAME_TYPE_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${GAME_TYPE_DESCRIPTION_MAX_LENGTH} characters`,
      )
      .optional(),
    logo: z.string().optional(),
    config: updateEventGameTypeConfigSchema.optional(),
  }),
]);

export type UpdateEventGameTypeFormValues = z.infer<
  typeof updateEventGameTypeSchema
>;

export const eventGameTypeIdSchema = z.object({
  gameTypeId: uuidSchema,
});

export const archiveEventGameTypeSchema = z.object({
  gameTypeId: uuidSchema,
});

export const deleteEventGameTypeSchema = z.object({
  gameTypeId: uuidSchema,
});

export const unarchiveEventGameTypeSchema = z.object({
  gameTypeId: uuidSchema,
});

// Event team color
const eventTeamColorValues = EVENT_TEAM_COLORS.map((c) => c.value) as [
  string,
  ...string[],
];

// Event team
export const createEventTeamSchema = z.object({
  eventId: uuidSchema,
  name: z
    .string()
    .min(1, "Team name is required")
    .max(
      MAX_EVENT_TEAM_NAME_MAX_LENGTH,
      `Team name must be at most ${MAX_EVENT_TEAM_NAME_MAX_LENGTH} characters`,
    ),
  logo: z.string().optional(),
  color: z.enum(eventTeamColorValues).optional(),
});

export type CreateEventTeamInput = z.infer<typeof createEventTeamSchema>;

export const updateEventTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(
      MAX_EVENT_TEAM_NAME_MAX_LENGTH,
      `Team name must be at most ${MAX_EVENT_TEAM_NAME_MAX_LENGTH} characters`,
    )
    .optional(),
  logo: z.string().optional(),
  color: z.enum(eventTeamColorValues).nullable().optional(),
});

export type UpdateEventTeamInput = z.infer<typeof updateEventTeamSchema>;

export const eventTeamIdSchema = z.object({
  eventTeamId: uuidSchema,
});

// Event team participant
export const addEventTeamParticipantSchema = z
  .object({
    eventTeamId: uuidSchema,
    userId: z.string().optional(),
    eventPlaceholderParticipantId: uuidSchema.optional(),
  })
  .refine(
    (data) => {
      const count = [data.userId, data.eventPlaceholderParticipantId].filter(
        Boolean,
      ).length;
      return count === 1;
    },
    {
      message:
        "Exactly one of userId or eventPlaceholderParticipantId must be provided",
    },
  );

export type AddEventTeamParticipantInput = z.infer<
  typeof addEventTeamParticipantSchema
>;

export const removeEventTeamParticipantSchema = z.object({
  eventTeamParticipantId: uuidSchema,
});

// Event participant
export const addEventParticipantSchema = z.object({
  eventId: uuidSchema,
  userId: z.string(),
});

export type AddEventParticipantInput = z.infer<
  typeof addEventParticipantSchema
>;

export const removeEventParticipantSchema = z.object({
  eventId: uuidSchema,
  userId: z.string(),
});

export const promoteToOrganizerSchema = z.object({
  eventId: uuidSchema,
  userId: z.string(),
});

// Event placeholder participant
export const createEventPlaceholderSchema = z.object({
  eventId: uuidSchema,
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
});

export type CreateEventPlaceholderInput = z.infer<
  typeof createEventPlaceholderSchema
>;

// Event match recording - participant schema (individual or team-based)
export const eventParticipantSchema = z
  .object({
    userId: z.string().optional(),
    eventPlaceholderParticipantId: uuidSchema.optional(),
    eventTeamId: uuidSchema.optional(),
  })
  .refine(
    (data) =>
      (data.userId ? 1 : 0) +
        (data.eventPlaceholderParticipantId ? 1 : 0) +
        (data.eventTeamId ? 1 : 0) ===
      1,
    {
      message:
        "Exactly one of userId, eventPlaceholderParticipantId, or eventTeamId must be provided",
    },
  );

// Event match deletion
export const deleteEventMatchSchema = z.object({
  matchId: uuidSchema,
});

// Event high score entry deletion
export const deleteEventHighScoreEntrySchema = z.object({
  entryId: uuidSchema,
});

// Event match recording - H2H
export const recordEventH2HMatchSchema = z.object({
  eventId: uuidSchema,
  gameTypeId: uuidSchema,
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
  side1Participants: z.array(eventParticipantSchema).min(1),
  side2Participants: z.array(eventParticipantSchema).min(1),
  winningSide: z.enum(["side1", "side2", "draw"]).optional(),
  side1Score: z.number().optional(),
  side2Score: z.number().optional(),
  winPoints: z
    .number("A number is required")
    .min(0, "Points cannot be negative")
    .optional(),
  lossPoints: z
    .number("A number is required")
    .min(0, "Points cannot be negative")
    .optional(),
  drawPoints: z
    .number("A number is required")
    .min(0, "Points cannot be negative")
    .optional(),
});

export type RecordEventH2HMatchInput = z.infer<
  typeof recordEventH2HMatchSchema
>;

// Event match recording - FFA
export const ffaEventParticipantSchema = z
  .object({
    userId: z.string().optional(),
    eventPlaceholderParticipantId: uuidSchema.optional(),
    eventTeamId: uuidSchema.optional(),
    rank: z.number().int().min(1).optional(),
    score: z.number().optional(),
    points: z
      .number("A number is required")
      .min(0, "Points cannot be negative")
      .optional(),
  })
  .refine(
    (data) =>
      (data.userId ? 1 : 0) +
        (data.eventPlaceholderParticipantId ? 1 : 0) +
        (data.eventTeamId ? 1 : 0) ===
      1,
    {
      message:
        "Exactly one of userId, eventPlaceholderParticipantId, or eventTeamId must be provided",
    },
  );

export const recordEventFFAMatchSchema = z.object({
  eventId: uuidSchema,
  gameTypeId: uuidSchema,
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
  participants: z
    .array(ffaEventParticipantSchema)
    .min(2, "At least 2 participants required"),
});

export type RecordEventFFAMatchInput = z.infer<
  typeof recordEventFFAMatchSchema
>;

// High score sessions
export const placementPointConfigSchema = z.array(
  z.object({
    placement: z.number().int().min(1),
    points: z.number("A number is required"),
  }),
);

export type PlacementPointConfig = z.infer<typeof placementPointConfigSchema>;

export const openHighScoreSessionSchema = z.object({
  eventId: uuidSchema,
  gameTypeId: uuidSchema,
  name: z
    .string()
    .min(1, "Session name is required")
    .max(
      HIGH_SCORE_SESSION_NAME_MAX_LENGTH,
      `Name must be at most ${HIGH_SCORE_SESSION_NAME_MAX_LENGTH} characters`,
    ),
  description: z
    .string()
    .max(
      HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  placementPointConfig: placementPointConfigSchema.optional(),
});

export type OpenHighScoreSessionInput = z.infer<
  typeof openHighScoreSessionSchema
>;

export const submitEventHighScoreBaseSchema = z.object({
  sessionId: uuidSchema,
  userId: z.string().optional(),
  eventPlaceholderParticipantId: uuidSchema.optional(),
  eventTeamId: uuidSchema.optional(),
  score: z.number("A number is required"),
  achievedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Achievement date cannot be in the future",
    }),
});

export const submitEventHighScoreSchema = submitEventHighScoreBaseSchema.refine(
  (data) =>
    (data.userId ? 1 : 0) +
      (data.eventPlaceholderParticipantId ? 1 : 0) +
      (data.eventTeamId ? 1 : 0) ===
    1,
  {
    message:
      "Exactly one of userId, eventPlaceholderParticipantId, or eventTeamId must be provided",
  },
);

export type SubmitEventHighScoreInput = z.infer<
  typeof submitEventHighScoreSchema
>;

export const closeHighScoreSessionSchema = z.object({
  sessionId: uuidSchema,
});

export type CloseHighScoreSessionInput = z.infer<
  typeof closeHighScoreSessionSchema
>;

export const reopenHighScoreSessionSchema = z.object({
  sessionId: uuidSchema,
});

export type ReopenHighScoreSessionInput = z.infer<
  typeof reopenHighScoreSessionSchema
>;

export const deleteHighScoreSessionSchema = z.object({
  sessionId: uuidSchema,
});

export type DeleteHighScoreSessionInput = z.infer<
  typeof deleteHighScoreSessionSchema
>;

export const updateHighScoreSessionSchema = z.object({
  sessionId: uuidSchema,
  name: z
    .string()
    .min(1, "Session name is required")
    .max(
      HIGH_SCORE_SESSION_NAME_MAX_LENGTH,
      `Name must be at most ${HIGH_SCORE_SESSION_NAME_MAX_LENGTH} characters`,
    )
    .optional(),
  description: z
    .string()
    .max(
      HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  placementPointConfig: placementPointConfigSchema.optional(),
});

export type UpdateHighScoreSessionInput = z.infer<
  typeof updateHighScoreSessionSchema
>;

// Best-of value validation (must be odd positive integer)
const bestOfValueSchema = z
  .number()
  .int()
  .min(1, "Best of must be at least 1")
  .max(MAX_BEST_OF, `Best of must be at most ${MAX_BEST_OF}`)
  .refine((v) => v % 2 === 1, { message: "Best of must be an odd number" });

// Per-round best-of config: maps round number (as string) to best-of value
export const roundBestOfSchema = z
  .record(
    z.string().regex(/^\d+$/, "Round key must be a number"),
    bestOfValueSchema,
  )
  .optional();

export type RoundBestOfConfig = z.infer<typeof roundBestOfSchema>;

// Event tournament
export const createEventTournamentSchema = z.object({
  eventId: uuidSchema,
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
  logo: z.string().optional(),
  participantType: z
    .enum([ParticipantType.INDIVIDUAL, ParticipantType.TEAM])
    .default(ParticipantType.INDIVIDUAL),
  seedingType: z.enum(["manual", "random"]),
  bestOf: bestOfValueSchema.default(1),
  roundBestOf: roundBestOfSchema,
  placementPointConfig: placementPointConfigSchema.optional(),
});

export type CreateEventTournamentInput = z.infer<
  typeof createEventTournamentSchema
>;

export const updateEventTournamentSchema = z.object({
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
  logo: z.string().optional(),
  seedingType: z.enum(["manual", "random"]).optional(),
  bestOf: bestOfValueSchema.optional(),
  roundBestOf: roundBestOfSchema,
  startDate: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .nullable()
    .optional(),
});

export type UpdateEventTournamentInput = z.infer<
  typeof updateEventTournamentSchema
>;

export const eventTournamentIdSchema = z.object({
  eventTournamentId: uuidSchema,
});

export type EventTournamentIdInput = z.infer<typeof eventTournamentIdSchema>;

export const addEventTournamentParticipantSchema = z
  .object({
    eventTournamentId: uuidSchema,
    userId: z.string().optional(),
    eventPlaceholderParticipantId: uuidSchema.optional(),
    eventTeamId: uuidSchema.optional(),
  })
  .refine(
    (data) => {
      const count = [
        data.userId,
        data.eventPlaceholderParticipantId,
        data.eventTeamId,
      ].filter(Boolean).length;
      return count === 1;
    },
    {
      message:
        "Exactly one of userId, eventPlaceholderParticipantId, or eventTeamId must be provided",
    },
  );

export type AddEventTournamentParticipantInput = z.infer<
  typeof addEventTournamentParticipantSchema
>;

export const addEventTournamentPartnershipSchema = z.object({
  eventTournamentId: uuidSchema,
  members: z
    .array(
      z
        .object({
          userId: z.string().optional(),
          eventPlaceholderParticipantId: uuidSchema.optional(),
        })
        .refine(
          (data) => {
            const count = [
              data.userId,
              data.eventPlaceholderParticipantId,
            ].filter(Boolean).length;
            return count === 1;
          },
          {
            message:
              "Exactly one of userId or eventPlaceholderParticipantId must be provided",
          },
        ),
    )
    .min(2, "A partnership requires at least 2 members"),
});

export type AddEventTournamentPartnershipInput = z.infer<
  typeof addEventTournamentPartnershipSchema
>;

export const removeEventTournamentParticipantSchema = z.object({
  eventTournamentId: uuidSchema,
  participantId: uuidSchema,
});

export const setEventParticipantSeedsSchema = z.object({
  eventTournamentId: uuidSchema,
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

export type SetEventParticipantSeedsInput = z.infer<
  typeof setEventParticipantSeedsSchema
>;

export const generateEventBracketSchema = z.object({
  eventTournamentId: uuidSchema,
});

export const recordEventTournamentMatchResultSchema = z.object({
  tournamentMatchId: uuidSchema,
  winningSide: z.enum(["side1", "side2"]).optional(),
  side1Score: z.number().optional(),
  side2Score: z.number().optional(),
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
});

export type RecordEventTournamentMatchResultInput = z.infer<
  typeof recordEventTournamentMatchResultSchema
>;

export const forfeitEventTournamentMatchSchema = z.object({
  tournamentMatchId: uuidSchema,
  forfeitParticipantId: uuidSchema,
});

export type ForfeitEventTournamentMatchInput = z.infer<
  typeof forfeitEventTournamentMatchSchema
>;

export const undoEventTournamentMatchResultSchema = z.object({
  tournamentMatchId: uuidSchema,
});

// Event invitation schemas
export const generateEventInviteLinkSchema = z.object({
  eventId: uuidSchema,
  role: z.enum(["organizer", "participant"]).optional(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
  placeholderId: uuidSchema.optional(),
});

export type GenerateEventInviteLinkInput = z.infer<
  typeof generateEventInviteLinkSchema
>;

export const inviteUserToEventSchema = z.object({
  eventId: uuidSchema,
  inviteeUserId: z.string(),
  role: z.enum(["organizer", "participant"]).optional(),
  placeholderId: uuidSchema.optional(),
});

export type InviteUserToEventInput = z.infer<typeof inviteUserToEventSchema>;

export const acceptEventInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type AcceptEventInvitationInput = z.infer<
  typeof acceptEventInvitationSchema
>;

export const cancelEventInvitationSchema = z.object({
  invitationId: uuidSchema,
  eventId: uuidSchema,
});

// Event placeholder management schemas
export const eventPlaceholderIdSchema = z.object({
  placeholderId: uuidSchema,
  eventId: uuidSchema,
});

export const updateEventPlaceholderSchema = z.object({
  placeholderId: uuidSchema,
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(
      NAME_MAX_LENGTH,
      `Display name must be at most ${NAME_MAX_LENGTH} characters`,
    ),
});

// Discretionary awards
export const discretionaryAwardRecipientSchema = z.object({
  eventTeamId: uuidSchema,
});

export type DiscretionaryAwardRecipient = z.infer<
  typeof discretionaryAwardRecipientSchema
>;

export const createDiscretionaryAwardSchema = z.object({
  eventId: uuidSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(
      DISCRETIONARY_AWARD_NAME_MAX_LENGTH,
      `Name must be at most ${DISCRETIONARY_AWARD_NAME_MAX_LENGTH} characters`,
    ),
  description: z
    .string()
    .min(1, "Description is required")
    .max(
      DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH} characters`,
    ),
  points: z.number("A number is required"),
  recipients: z
    .array(discretionaryAwardRecipientSchema)
    .min(1, "At least one recipient is required")
    .max(
      MAX_DISCRETIONARY_AWARD_RECIPIENTS,
      `At most ${MAX_DISCRETIONARY_AWARD_RECIPIENTS} recipients allowed`,
    ),
});

export type CreateDiscretionaryAwardInput = z.infer<
  typeof createDiscretionaryAwardSchema
>;

export const updateDiscretionaryAwardSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(
      DISCRETIONARY_AWARD_NAME_MAX_LENGTH,
      `Name must be at most ${DISCRETIONARY_AWARD_NAME_MAX_LENGTH} characters`,
    )
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(
      DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .optional(),
  points: z.number("A number is required").optional(),
  recipients: z
    .array(discretionaryAwardRecipientSchema)
    .min(1, "At least one recipient is required")
    .max(
      MAX_DISCRETIONARY_AWARD_RECIPIENTS,
      `At most ${MAX_DISCRETIONARY_AWARD_RECIPIENTS} recipients allowed`,
    )
    .optional(),
});

export type UpdateDiscretionaryAwardInput = z.infer<
  typeof updateDiscretionaryAwardSchema
>;

export const discretionaryAwardIdSchema = z.object({
  awardId: uuidSchema,
});
