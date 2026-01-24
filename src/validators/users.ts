import {
  BIO_MAX_LENGTH,
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/services/constants";
import { z } from "zod";

export const AVATARS = [
  { name: "8-ball", src: "/avatars/8-ball.svg" },
  { name: "Paddle", src: "/avatars/paddle.svg" },
  { name: "Controller", src: "/avatars/controller.svg" },
  { name: "Dice", src: "/avatars/dice.svg" },
  { name: "Cards", src: "/avatars/cards.svg" },
  { name: "Chess Knight", src: "/avatars/chess-knight.svg" },
  { name: "Target", src: "/avatars/target.svg" },
  { name: "Trophy", src: "/avatars/trophy.svg" },
  { name: "Joystick", src: "/avatars/joystick.svg" },
  { name: "Ghost", src: "/avatars/ghost.svg" },
  { name: "Pacman", src: "/avatars/pacman.svg" },
  { name: "Sword", src: "/avatars/sword.svg" },
  { name: "Shield", src: "/avatars/shield.svg" },
  { name: "Potion", src: "/avatars/potion.svg" },
  { name: "Crown", src: "/avatars/crown.svg" },
  { name: "Flag", src: "/avatars/flag.svg" },
  { name: "Rocket", src: "/avatars/rocket.svg" },
  { name: "Skull", src: "/avatars/skull.svg" },
  { name: "Gem", src: "/avatars/gem.svg" },
  { name: "Robot", src: "/avatars/robot.svg" },
] as const;

export type Avatar = (typeof AVATARS)[number];

const VALID_AVATAR_PATHS = AVATARS.map((a) => a.src) as string[];

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
