"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

import { createPlaceholderAction } from "./actions";

interface CreatePlaceholderFormProps {
  leagueId: string;
}

export function CreatePlaceholderForm({
  leagueId,
}: CreatePlaceholderFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createPlaceholderAction({
        leagueId,
        displayName: displayName.trim(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Created placeholder for "${displayName}"`);
        setDisplayName("");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="placeholder-name">Display Name</Label>
        <Input
          id="placeholder-name"
          placeholder="Enter their name..."
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>

      <Button
        type="submit"
        disabled={isPending || !displayName.trim()}
        className="w-full"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Create Placeholder
      </Button>
    </form>
  );
}
