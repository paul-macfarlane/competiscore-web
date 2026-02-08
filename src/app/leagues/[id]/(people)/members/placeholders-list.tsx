"use client";

import { PlaceholderMember } from "@/db/schema";
import { User } from "lucide-react";

interface PlaceholdersListProps {
  placeholders: PlaceholderMember[];
  canManage: boolean;
  leagueId: string;
}

export function PlaceholdersList({
  placeholders,
  canManage,
}: PlaceholdersListProps) {
  if (placeholders.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No placeholder members.{" "}
        {canManage &&
          "Placeholder members represent people who haven't signed up yet."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {placeholders.map((placeholder) => (
        <div
          key={placeholder.id}
          className="flex items-center gap-3 rounded-lg border border-dashed p-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {placeholder.displayName}
            </div>
            <div className="text-muted-foreground text-sm">Placeholder</div>
          </div>
        </div>
      ))}
    </div>
  );
}
