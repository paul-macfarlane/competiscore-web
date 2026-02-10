"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { EventParticipantWithUser } from "@/db/events";
import { Plus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { addEventTeamMemberAction } from "../../../../actions";

interface AddEventTeamMemberFormProps {
  eventTeamId: string;
  availableMembers: EventParticipantWithUser[];
}

export function AddEventTeamMemberForm({
  eventTeamId,
  availableMembers,
}: AddEventTeamMemberFormProps) {
  if (availableMembers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">
          All event participants are already assigned to a team
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {availableMembers.map((member) => (
        <AddMemberRow
          key={member.userId}
          eventTeamId={eventTeamId}
          userId={member.userId}
          name={member.user.name}
          username={member.user.username}
          image={member.user.image}
        />
      ))}
    </div>
  );
}

function AddMemberRow({
  eventTeamId,
  userId,
  name,
  username,
  image,
}: {
  eventTeamId: string;
  userId: string;
  name: string;
  username: string | null;
  image: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    startTransition(async () => {
      const result = await addEventTeamMemberAction({
        eventTeamId,
        userId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${name} added to team`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={image || undefined} alt={name} />
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <span className="font-medium wrap-break-word">{name}</span>
        {username && (
          <p className="text-sm text-muted-foreground truncate">@{username}</p>
        )}
      </div>
      <Button size="sm" onClick={handleAdd} disabled={isPending}>
        <Plus className="mr-1 h-4 w-4" />
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}
