import { z } from "zod";

import { uuidSchema } from "./common";

export const participantSchema = z
  .object({
    userId: z.string().optional(),
    teamId: z.uuid().optional(),
    placeholderMemberId: z.uuid().optional(),
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

export type ParticipantInput = z.infer<typeof participantSchema>;

function getParticipantKey(p: ParticipantInput): string {
  if (p.userId) return `user:${p.userId}`;
  if (p.teamId) return `team:${p.teamId}`;
  if (p.placeholderMemberId) return `placeholder:${p.placeholderMemberId}`;
  return "";
}

function hasNoDuplicateParticipants(
  side1: ParticipantInput[],
  side2: ParticipantInput[],
): boolean {
  const allParticipants = [...side1, ...side2];
  const keys = allParticipants.map(getParticipantKey).filter(Boolean);
  return new Set(keys).size === keys.length;
}

export const recordH2HWinLossMatchSchema = z
  .object({
    leagueId: uuidSchema,
    gameTypeId: z.uuid(),
    playedAt: z
      .union([z.string(), z.date()])
      .pipe(z.coerce.date())
      .refine((date) => date <= new Date(), {
        message: "Match date cannot be in the future",
      }),
    side1Participants: z.array(participantSchema).min(1),
    side2Participants: z.array(participantSchema).min(1),
    winningSide: z.enum(["side1", "side2", "draw"]),
  })
  .refine(
    (data) =>
      hasNoDuplicateParticipants(
        data.side1Participants,
        data.side2Participants,
      ),
    {
      message: "A participant cannot appear on both sides of a match",
      path: ["side2Participants"],
    },
  );

export type RecordH2HWinLossMatchInput = z.infer<
  typeof recordH2HWinLossMatchSchema
>;

export const recordH2HScoreMatchSchema = z
  .object({
    leagueId: uuidSchema,
    gameTypeId: z.uuid(),
    playedAt: z
      .union([z.string(), z.date()])
      .pipe(z.coerce.date())
      .refine((date) => date <= new Date(), {
        message: "Match date cannot be in the future",
      }),
    side1Participants: z.array(participantSchema).min(1),
    side2Participants: z.array(participantSchema).min(1),
    side1Score: z.number("A number is required"),
    side2Score: z.number("A number is required"),
  })
  .refine(
    (data) =>
      hasNoDuplicateParticipants(
        data.side1Participants,
        data.side2Participants,
      ),
    {
      message: "A participant cannot appear on both sides of a match",
      path: ["side2Participants"],
    },
  );

export type RecordH2HScoreMatchInput = z.infer<
  typeof recordH2HScoreMatchSchema
>;

export const ffaRankedParticipantSchema = participantSchema.extend({
  rank: z.number().int().min(1),
});

export const recordFFARankedMatchSchema = z
  .object({
    leagueId: uuidSchema,
    gameTypeId: z.uuid(),
    playedAt: z
      .union([z.string(), z.date()])
      .pipe(z.coerce.date())
      .refine((date) => date <= new Date(), {
        message: "Match date cannot be in the future",
      }),
    participants: z
      .array(ffaRankedParticipantSchema)
      .min(2, "At least 2 participants required"),
  })
  .refine(
    (data) => {
      const keys = data.participants.map(getParticipantKey).filter(Boolean);
      return new Set(keys).size === keys.length;
    },
    {
      message: "Each participant can only appear once in a match",
      path: ["participants"],
    },
  );

export type RecordFFARankedMatchInput = z.infer<
  typeof recordFFARankedMatchSchema
>;

export const ffaScoreParticipantSchema = participantSchema.extend({
  score: z.number("A number is required"),
});

export const recordFFAScoreMatchSchema = z
  .object({
    leagueId: uuidSchema,
    gameTypeId: z.uuid(),
    playedAt: z
      .union([z.string(), z.date()])
      .pipe(z.coerce.date())
      .refine((date) => date <= new Date(), {
        message: "Match date cannot be in the future",
      }),
    participants: z
      .array(ffaScoreParticipantSchema)
      .min(2, "At least 2 participants required"),
  })
  .refine(
    (data) => {
      const keys = data.participants.map(getParticipantKey).filter(Boolean);
      return new Set(keys).size === keys.length;
    },
    {
      message: "Each participant can only appear once in a match",
      path: ["participants"],
    },
  );

export type RecordFFAScoreMatchInput = z.infer<
  typeof recordFFAScoreMatchSchema
>;

export const submitHighScoreSchema = z.object({
  leagueId: uuidSchema,
  gameTypeId: z.uuid(),
  participant: participantSchema,
  score: z.number("A number is required"),
  achievedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Achievement date cannot be in the future",
    }),
});

export type SubmitHighScoreInput = z.infer<typeof submitHighScoreSchema>;

export const createChallengeSchema = z.object({
  gameTypeId: z.uuid(),
  challengerParticipants: z.array(participantSchema).min(1),
  challengedParticipants: z.array(participantSchema).min(1),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const recordChallengeH2HWinLossResultSchema = z.object({
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
  winningSide: z.enum(["challenger", "challenged", "draw"]),
});

export type RecordChallengeH2HWinLossResultInput = z.infer<
  typeof recordChallengeH2HWinLossResultSchema
>;

export const recordChallengeH2HScoreResultSchema = z.object({
  playedAt: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Match date cannot be in the future",
    }),
  challengerScore: z.number("A number is required"),
  challengedScore: z.number("A number is required"),
});

export type RecordChallengeH2HScoreResultInput = z.infer<
  typeof recordChallengeH2HScoreResultSchema
>;

export const recordMatchSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("h2h_win_loss"),
    data: recordH2HWinLossMatchSchema,
  }),
  z.object({
    type: z.literal("h2h_score"),
    data: recordH2HScoreMatchSchema,
  }),
  z.object({
    type: z.literal("ffa_ranked"),
    data: recordFFARankedMatchSchema,
  }),
  z.object({
    type: z.literal("ffa_score"),
    data: recordFFAScoreMatchSchema,
  }),
]);

export type RecordMatchInput = z.infer<typeof recordMatchSchema>;

export const matchResultSchema = z.enum(["win", "loss", "draw"]);

export const matchQueryOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  status: z
    .enum(["pending", "accepted", "completed", "declined", "cancelled"])
    .optional(),
});

export type MatchQueryOptions = z.infer<typeof matchQueryOptionsSchema>;

export const leaderboardQueryOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  timeRange: z.enum(["week", "month", "year", "all"]).optional().default("all"),
});

export type LeaderboardQueryOptions = z.infer<
  typeof leaderboardQueryOptionsSchema
>;

export const recordH2HWinLossMatchActionSchema = z.object({
  leagueId: uuidSchema,
  input: recordH2HWinLossMatchSchema,
});

export const recordH2HScoreMatchActionSchema = z.object({
  leagueId: uuidSchema,
  input: recordH2HScoreMatchSchema,
});

export const recordFFARankedMatchActionSchema = z.object({
  leagueId: uuidSchema,
  input: recordFFARankedMatchSchema,
});

export const recordFFAScoreMatchActionSchema = z.object({
  leagueId: uuidSchema,
  input: recordFFAScoreMatchSchema,
});

export const submitHighScoreActionSchema = z.object({
  leagueId: uuidSchema,
  input: submitHighScoreSchema,
});
