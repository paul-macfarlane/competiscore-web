"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { createEventPlaceholderAction } from "../placeholders/actions";

interface CreateEventPlaceholderFormProps {
  eventId: string;
}

export function CreateEventPlaceholderForm({
  eventId,
}: CreateEventPlaceholderFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await createEventPlaceholderAction({
        eventId,
        displayName: displayName.trim(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`Placeholder "${displayName.trim()}" created`);
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

      <div className="space-y-2">
        <Label htmlFor="display-name">Display Name</Label>
        <Input
          id="display-name"
          placeholder="Enter a display name..."
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
        />
        <p className="text-muted-foreground text-xs">
          Create a placeholder for someone who doesn&apos;t have an account yet.
          Their scores can be recorded and transferred later.
        </p>
      </div>

      <Button
        type="submit"
        disabled={!displayName.trim() || isPending}
        className="w-full"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Create Placeholder
      </Button>
    </form>
  );
}
