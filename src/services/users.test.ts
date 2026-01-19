import * as dbUsers from "@/db/users";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkUsernameAvailability,
  generateUniqueUsername,
  getUserById,
  updateUserProfile,
} from "./users";

vi.mock("@/db/users", () => ({
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  checkUsernameExists: vi.fn(),
}));

const mockUser = {
  id: "123",
  name: "Test User",
  username: "testuser",
  email: "test@example.com",
  emailVerified: true,
  image: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("users service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserById", () => {
    it("returns user when found", async () => {
      vi.mocked(dbUsers.getUserById).mockResolvedValue(mockUser);

      const result = await getUserById("123");

      expect(result).toEqual({ data: mockUser });
    });

    it("returns error when user not found", async () => {
      vi.mocked(dbUsers.getUserById).mockResolvedValue(undefined);

      const result = await getUserById("nonexistent");

      expect(result).toEqual({ error: "User not found" });
    });
  });

  describe("checkUsernameAvailability", () => {
    it("returns available: true when username does not exist", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);

      const result = await checkUsernameAvailability("testuser");

      expect(result).toEqual({ data: { available: true } });
    });

    it("returns available: false when username exists", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(true);

      const result = await checkUsernameAvailability("takenuser");

      expect(result).toEqual({ data: { available: false } });
    });

    it("returns error for username that is too short", async () => {
      const result = await checkUsernameAvailability("ab");

      expect(result.error).toBeDefined();
      expect(result.fieldErrors).toBeDefined();
    });

    it("returns error for invalid username characters", async () => {
      const result = await checkUsernameAvailability("test@user");

      expect(result.error).toBeDefined();
      expect(result.fieldErrors).toBeDefined();
    });

    it("converts username to lowercase", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);

      await checkUsernameAvailability("TestUser");

      expect(dbUsers.checkUsernameExists).toHaveBeenCalledWith(
        "testuser",
        undefined,
      );
    });
  });

  describe("updateUserProfile", () => {
    it("successfully updates profile with valid input", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);
      vi.mocked(dbUsers.updateUser).mockResolvedValue(mockUser);

      const result = await updateUserProfile("123", {
        name: "Updated Name",
        username: "newusername",
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockUser);
    });

    it("returns error when username is taken", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(true);

      const result = await updateUserProfile("123", { username: "takenuser" });

      expect(result).toEqual({
        error: "Username is already taken",
        fieldErrors: { username: "Username is already taken" },
      });
    });

    it("returns error for invalid name", async () => {
      const result = await updateUserProfile("123", { name: "" });

      expect(result.error).toBeDefined();
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
    });

    it("returns error for bio that is too long", async () => {
      const longBio = "a".repeat(501);
      const result = await updateUserProfile("123", { bio: longBio });

      expect(result.error).toBeDefined();
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.bio).toBeDefined();
    });
  });

  describe("generateUniqueUsername", () => {
    it("returns cleaned base name when available", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);

      const result = await generateUniqueUsername("John Doe");

      expect(result).toBe("johndoe");
    });

    it("returns 'user' when base name is empty", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);

      const result = await generateUniqueUsername("");

      expect(result).toBe("user");
    });

    it("returns 'user' when base name is null", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);

      const result = await generateUniqueUsername(null);

      expect(result).toBe("user");
    });

    it("adds suffix when username exists", async () => {
      vi.mocked(dbUsers.checkUsernameExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await generateUniqueUsername("John");

      expect(result).toMatch(/^john\d+$/);
    });

    it("truncates long names", async () => {
      vi.mocked(dbUsers.checkUsernameExists).mockResolvedValue(false);

      const longName = "a".repeat(50);
      const result = await generateUniqueUsername(longName);

      expect(result.length).toBeLessThanOrEqual(20);
    });
  });
});
