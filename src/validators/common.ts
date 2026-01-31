import { z } from "zod";

export const uuidSchema = z.uuid("Invalid ID format");

export const nonEmptyStringSchema = z.string().min(1, "Cannot be empty");
