"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { EventPlaceholderParticipant } from "@/db/schema";
import { Plus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { addEventTeamMemberAction } from "../../../../actions";

interface AddEventTeamPlaceholderFormProps {
  eventTeamId: string;
  availablePlaceholders: EventPlaceholderParticipant[];
}

export function AddEventTeamPlaceholderForm({
  eventTeamId,
  availablePlaceholders,
}: AddEventTeamPlaceholderFormProps) {
  if (availablePlaceholders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">
          All placeholders are already assigned to a team
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {availablePlaceholders.map((placeholder) => (
        <AddPlaceholderRow
          key={placeholder.id}
          eventTeamId={eventTeamId}
          placeholderId={placeholder.id}
          displayName={placeholder.displayName}
        />
      ))}
    </div>
  );
}

function AddPlaceholderRow({
  eventTeamId,
  placeholderId,
  displayName,
}: {
  eventTeamId: string;
  placeholderId: string;
  displayName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    startTransition(async () => {
      const result = await addEventTeamMemberAction({
        eventTeamId,
        eventPlaceholderParticipantId: placeholderId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${displayName} added to team`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <span className="font-medium wrap-break-word">{displayName}</span>
        <p className="text-sm text-muted-foreground">Placeholder participant</p>
      </div>
      <Button size="sm" onClick={handleAdd} disabled={isPending}>
        <Plus className="mr-1 h-4 w-4" />
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}
