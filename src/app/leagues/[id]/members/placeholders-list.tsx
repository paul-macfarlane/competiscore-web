"use client";

import { Button } from "@/components/ui/button";
import { PlaceholderMember } from "@/db/schema";
import { RotateCcw, Trash2, User } from "lucide-react";
import { useState, useTransition } from "react";

import { restorePlaceholderAction, retirePlaceholderAction } from "./actions";

interface PlaceholdersListProps {
  placeholders: PlaceholderMember[];
  canManage: boolean;
  leagueId: string;
}

export function PlaceholdersList({
  placeholders,
  canManage,
  leagueId,
}: PlaceholdersListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRetire = (placeholderId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await retirePlaceholderAction({ placeholderId, leagueId });
      if (result.error) {
        setError(result.error);
      }
    });
  };

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
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
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
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleRetire(placeholder.id)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

interface RetiredPlaceholdersListProps {
  placeholders: PlaceholderMember[];
  leagueId: string;
}

export function RetiredPlaceholdersList({
  placeholders,
  leagueId,
}: RetiredPlaceholdersListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRestore = (placeholderId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await restorePlaceholderAction({
        placeholderId,
        leagueId,
      });
      if (result.error) {
        setError(result.error);
      }
    });
  };

  if (placeholders.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No retired placeholders.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {placeholders.map((placeholder) => (
        <div
          key={placeholder.id}
          className="flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {placeholder.displayName}
            </div>
            <div className="text-muted-foreground text-sm">
              Retired{" "}
              {placeholder.retiredAt &&
                new Date(placeholder.retiredAt).toLocaleDateString()}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => handleRestore(placeholder.id)}
            disabled={isPending}
            title="Restore placeholder"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
