import {
  ModerationActionType,
  ReportReason,
  ReportStatus,
} from "@/lib/shared/constants";
import {
  MAX_SUSPENSION_DAYS,
  MODERATION_REASON_MAX_LENGTH,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_EVIDENCE_MAX_LENGTH,
} from "@/services/constants";
import { z } from "zod";

export const reportReasonSchema = z.enum([
  ReportReason.UNSPORTSMANLIKE,
  ReportReason.FALSE_REPORTING,
  ReportReason.HARASSMENT,
  ReportReason.SPAM,
  ReportReason.OTHER,
]);

export const reportStatusSchema = z.enum([
  ReportStatus.PENDING,
  ReportStatus.RESOLVED,
]);

export const reportDescriptionSchema = z
  .string()
  .min(10, "Please provide a detailed description (at least 10 characters)")
  .max(
    REPORT_DESCRIPTION_MAX_LENGTH,
    `Description must be at most ${REPORT_DESCRIPTION_MAX_LENGTH} characters`,
  );

export const reportEvidenceSchema = z
  .string()
  .max(
    REPORT_EVIDENCE_MAX_LENGTH,
    `Evidence must be at most ${REPORT_EVIDENCE_MAX_LENGTH} characters`,
  )
  .optional();

export const createReportSchema = z.object({
  reportedUserId: z.string().min(1, "Reported user is required"),
  leagueId: z.string().min(1, "League is required"),
  reason: reportReasonSchema,
  description: reportDescriptionSchema,
  evidence: reportEvidenceSchema,
});

export type CreateReportFormValues = z.infer<typeof createReportSchema>;

export const moderationActionTypeSchema = z.enum([
  ModerationActionType.DISMISSED,
  ModerationActionType.WARNED,
  ModerationActionType.SUSPENDED,
  ModerationActionType.REMOVED,
]);

export const moderationReasonSchema = z
  .string()
  .min(5, "Reason must be at least 5 characters")
  .max(
    MODERATION_REASON_MAX_LENGTH,
    `Reason must be at most ${MODERATION_REASON_MAX_LENGTH} characters`,
  );

export const suspensionDaysSchema = z
  .number()
  .int("Suspension days must be a whole number")
  .min(1, "Suspension must be at least 1 day")
  .max(
    MAX_SUSPENSION_DAYS,
    `Suspension cannot exceed ${MAX_SUSPENSION_DAYS} days (temporary suspension only)`,
  );

const moderationActionBaseSchema = z.object({
  action: moderationActionTypeSchema,
  reason: moderationReasonSchema,
  suspensionDays: suspensionDaysSchema.optional(),
});

const suspensionDaysRefinement = {
  refinement: (data: { action: string; suspensionDays?: number }) => {
    if (data.action === ModerationActionType.SUSPENDED) {
      return data.suspensionDays !== undefined;
    }
    return true;
  },
  options: {
    message: "Suspension days is required when suspending a member",
    path: ["suspensionDays"],
  },
};

export const moderationActionFormSchema = moderationActionBaseSchema.refine(
  suspensionDaysRefinement.refinement,
  suspensionDaysRefinement.options,
);

export type ModerationActionFormValues = z.infer<
  typeof moderationActionFormSchema
>;

export const takeModerationActionSchema = moderationActionBaseSchema
  .extend({
    reportId: z.string().min(1, "Report is required"),
  })
  .refine(
    suspensionDaysRefinement.refinement,
    suspensionDaysRefinement.options,
  );

export type TakeModerationActionFormValues = z.infer<
  typeof takeModerationActionSchema
>;
