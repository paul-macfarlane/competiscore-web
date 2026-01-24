import { LeagueMemberRole } from "@/lib/shared/constants";
import { NAME_MAX_LENGTH } from "@/services/constants";
import { z } from "zod";

export const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(
    NAME_MAX_LENGTH,
    `Display name must be at most ${NAME_MAX_LENGTH} characters`,
  );

export const memberRoleSchema = z.enum([
  LeagueMemberRole.MEMBER,
  LeagueMemberRole.MANAGER,
  LeagueMemberRole.EXECUTIVE,
]);

export const createPlaceholderSchema = z.object({
  displayName: displayNameSchema,
});

export type CreatePlaceholderFormValues = z.infer<
  typeof createPlaceholderSchema
>;

export const inviteUserSchema = z.object({
  inviteeUserId: z.string().min(1, "User is required"),
  role: memberRoleSchema,
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export const generateInviteLinkSchema = z.object({
  role: memberRoleSchema,
  expiresInDays: z.number().int().min(1).max(30).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
});

export type GenerateInviteLinkFormValues = z.infer<
  typeof generateInviteLinkSchema
>;

export const updateMemberRoleSchema = z.object({
  targetUserId: z.string().min(1, "User is required"),
  role: memberRoleSchema,
});

export type UpdateMemberRoleFormValues = z.infer<typeof updateMemberRoleSchema>;
