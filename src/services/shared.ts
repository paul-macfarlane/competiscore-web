import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export type ServiceResult<T> = {
  data?: T;
  error?: string;
  fieldErrors?: FieldErrors;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export function formatZodErrors(zodError: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of zodError.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

export function isSuspended(member: { suspendedUntil: Date | null }): boolean {
  return member.suspendedUntil !== null && member.suspendedUntil > new Date();
}
