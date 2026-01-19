import { User } from "@/db/schema";
import {
  checkUsernameExists as dbCheckUsernameExists,
  getUserById as dbGetUserById,
  updateUser as dbUpdateUser,
} from "@/db/users";
import {
  bioSchema,
  imageSchema,
  nameSchema,
  usernameSchema,
} from "@/validators/users";
import { generateFromEmail } from "unique-username-generator";
import { z } from "zod";

import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "./constants";
import { ServiceResult, formatZodErrors } from "./shared";

const usernameSchemaWithTransform = usernameSchema.transform((val) =>
  val.toLowerCase(),
);

const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  username: usernameSchemaWithTransform.optional(),
  bio: bioSchema.optional(),
  image: imageSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function getUserById(
  userId: string,
): Promise<ServiceResult<User>> {
  const user = await dbGetUserById(userId);
  if (!user) {
    return { error: "User not found" };
  }
  return { data: user };
}

export async function checkUsernameAvailability(
  username: unknown,
  currentUserId?: string,
): Promise<ServiceResult<{ available: boolean }>> {
  const parsed = usernameSchemaWithTransform.safeParse(username);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const exists = await dbCheckUsernameExists(parsed.data, currentUserId);
  return { data: { available: !exists } };
}

export async function updateUserProfile(
  userId: string,
  input: unknown,
): Promise<ServiceResult<User>> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Validation failed",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const { username, ...rest } = parsed.data;

  if (username) {
    const exists = await dbCheckUsernameExists(username, userId);
    if (exists) {
      return {
        error: "Username is already taken",
        fieldErrors: { username: "Username is already taken" },
      };
    }
  }

  const updatedUser = await dbUpdateUser(userId, {
    ...rest,
    username: username ?? undefined,
  });
  if (!updatedUser) {
    return { error: "Failed to update profile" };
  }

  return { data: updatedUser };
}

export async function generateUniqueUsername(
  baseName?: string | null,
  email?: string | null,
): Promise<string> {
  // Try email-based generation first
  if (email) {
    const emailUsername = generateFromEmail(email, 3);
    // Ensure it meets length requirements
    if (emailUsername.length >= USERNAME_MIN_LENGTH) {
      const candidate =
        emailUsername.length > USERNAME_MAX_LENGTH
          ? emailUsername.slice(0, USERNAME_MAX_LENGTH)
          : emailUsername;
      const exists = await dbCheckUsernameExists(candidate);
      if (!exists) {
        return candidate;
      }
    }
  }

  // Fall back to name-based generation
  const base = baseName
    ? baseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20)
    : "user";

  const cleanBase = base.length >= USERNAME_MIN_LENGTH ? base : "user";

  let candidate = cleanBase;
  let counter = 1;
  const maxAttempts = 100;

  while (counter <= maxAttempts) {
    const exists = await dbCheckUsernameExists(candidate);
    if (!exists) {
      return candidate;
    }
    const suffix = Math.floor(Math.random() * 10000);
    candidate = `${cleanBase}${suffix}`;
    if (candidate.length > USERNAME_MAX_LENGTH) {
      candidate = candidate.slice(0, USERNAME_MAX_LENGTH);
    }
    counter++;
  }

  const fallback = `${cleanBase}${Date.now()}`;
  return fallback.slice(0, USERNAME_MAX_LENGTH);
}
