import { ICON_PATHS, TEAM_ICONS, TeamMemberRole } from "@/lib/shared/constants";
import {
  TEAM_DESCRIPTION_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
} from "@/services/constants";
import { z } from "zod";

import { uuidSchema } from "./common";

export const teamNameSchema = z
  .string()
  .min(1, "Team name is required")
  .max(
    TEAM_NAME_MAX_LENGTH,
    `Team name must be at most ${TEAM_NAME_MAX_LENGTH} characters`,
  );

export const teamDescriptionSchema = z
  .string()
  .max(
    TEAM_DESCRIPTION_MAX_LENGTH,
    `Description must be at most ${TEAM_DESCRIPTION_MAX_LENGTH} characters`,
  )
  .optional()
  .or(z.literal(""));

const VALID_TEAM_ICON_PATHS = TEAM_ICONS.map(
  (icon) => `${ICON_PATHS.TEAM_ICONS}/${icon}.svg`,
);

export const teamLogoSchema = z
  .string()
  .refine((val) => val === "" || VALID_TEAM_ICON_PATHS.includes(val), {
    message: "Invalid icon selection",
  })
  .optional()
  .or(z.literal(""));

export const createTeamFormSchema = z.object({
  leagueId: uuidSchema,
  name: teamNameSchema,
  description: teamDescriptionSchema,
  logo: teamLogoSchema,
});

export type CreateTeamFormValues = z.infer<typeof createTeamFormSchema>;

export const updateTeamFormSchema = z.object({
  name: teamNameSchema.optional(),
  description: teamDescriptionSchema,
  logo: teamLogoSchema,
});

export type UpdateTeamFormValues = z.infer<typeof updateTeamFormSchema>;

export const addTeamMemberSchema = z
  .object({
    userId: z.string().optional(),
    placeholderMemberId: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasUser = data.userId && data.userId.length > 0;
      const hasPlaceholder =
        data.placeholderMemberId && data.placeholderMemberId.length > 0;
      return (hasUser || hasPlaceholder) && !(hasUser && hasPlaceholder);
    },
    {
      message:
        "Must provide either a user or a placeholder member, but not both",
    },
  );

export type AddTeamMemberValues = z.infer<typeof addTeamMemberSchema>;

export const teamMemberRoleSchema = z.enum([
  TeamMemberRole.MEMBER,
  TeamMemberRole.MANAGER,
]);

export const inviteTeamMemberSchema = z.object({
  inviteeUserId: z.string().min(1, "User is required"),
  role: teamMemberRoleSchema,
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;

export const generateTeamInviteLinkSchema = z.object({
  role: teamMemberRoleSchema,
  expiresInDays: z.number().int().min(1).max(30).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
});

export type GenerateTeamInviteLinkFormValues = z.infer<
  typeof generateTeamInviteLinkSchema
>;

export const teamIdSchema = z.object({
  teamId: uuidSchema,
});

export const teamMemberIdSchema = z.object({
  teamMemberId: uuidSchema,
});

export const createTeamActionSchema = z.object({
  leagueId: uuidSchema,
  input: createTeamFormSchema,
});

export const updateTeamActionSchema = z.object({
  teamId: uuidSchema,
  input: updateTeamFormSchema,
});

export const archiveTeamSchema = z.object({
  teamId: uuidSchema,
});

export const unarchiveTeamSchema = z.object({
  teamId: uuidSchema,
});

export const deleteTeamSchema = z.object({
  teamId: uuidSchema,
});

export const addTeamMemberActionSchema = z.object({
  teamId: uuidSchema,
  input: addTeamMemberSchema,
});

export const leaveTeamSchema = z.object({
  teamId: uuidSchema,
});

export const inviteTeamMemberActionSchema = z.object({
  teamId: uuidSchema,
  input: inviteTeamMemberSchema,
});

export const generateTeamInviteLinkActionSchema = z.object({
  teamId: uuidSchema,
  input: generateTeamInviteLinkSchema,
});

export const joinTeamViaInviteLinkSchema = z.object({
  token: z.string().min(1, "Token is required"),
});
