import { USER_AVATAR_OPTIONS } from "@/lib/shared/constants";
import {
  BIO_MAX_LENGTH,
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/services/constants";
import { z } from "zod";

const VALID_AVATAR_PATHS = USER_AVATAR_OPTIONS.map((a) => a.src) as string[];

export const usernameSchema = z
  .string()
  .min(
    USERNAME_MIN_LENGTH,
    `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
  )
  .max(
    USERNAME_MAX_LENGTH,
    `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
  )
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens (e.g., john_doe, player-123)",
  );

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`);

export const bioSchema = z
  .string()
  .max(BIO_MAX_LENGTH, `Bio must be at most ${BIO_MAX_LENGTH} characters`);

export const imageSchema = z
  .string()
  .refine((val) => val === "" || VALID_AVATAR_PATHS.includes(val), {
    message: "Invalid avatar selection",
  })
  .optional();

export const profileFormSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  bio: bioSchema,
  image: imageSchema,
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
