"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EventParticipantWithUser } from "@/db/events";
import { getInitials } from "@/lib/client/utils";
import { EventParticipantRole } from "@/lib/shared/constants";
import { EVENT_ROLE_LABELS } from "@/lib/shared/roles";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Shield, UserMinus, Users } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  demoteToParticipantAction,
  promoteToOrganizerAction,
  removeEventParticipantAction,
} from "../../actions";

interface EventParticipantsListProps {
  members: EventParticipantWithUser[];
  currentUserId: string;
  currentUserRole: string;
  eventId: string;
}

export function EventParticipantsList({
  members,
  currentUserId,
  currentUserRole,
  eventId,
}: EventParticipantsListProps) {
  const [isPending, startTransition] = useTransition();

  const handlePromote = (targetUserId: string) => {
    startTransition(async () => {
      const result = await promoteToOrganizerAction({
        eventId,
        userId: targetUserId,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Participant promoted to organizer");
    });
  };

  const handleDemote = (targetUserId: string) => {
    startTransition(async () => {
      const result = await demoteToParticipantAction({
        eventId,
        userId: targetUserId,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Organizer demoted to participant");
    });
  };

  const handleRemove = (targetUserId: string) => {
    startTransition(async () => {
      const result = await removeEventParticipantAction({
        eventId,
        userId: targetUserId,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Participant removed from event");
    });
  };

  const isOrganizer = currentUserRole === EventParticipantRole.ORGANIZER;

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const canModify = !isCurrentUser && isOrganizer;
        const isTargetParticipant =
          member.role === EventParticipantRole.PARTICIPANT;
        const isTargetOrganizer =
          member.role === EventParticipantRole.ORGANIZER;

        return (
          <div
            key={member.id}
            className="flex items-start gap-3 rounded-lg border p-3 sm:items-center"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium wrap-break-word">
                  {member.user.name}
                </span>
                {isCurrentUser && (
                  <span className="text-muted-foreground text-xs">(you)</span>
                )}
                <Badge variant="secondary" className="shrink-0 sm:hidden">
                  {EVENT_ROLE_LABELS[member.role as EventParticipantRole]}
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm truncate">
                @{member.user.username}
              </div>
            </div>
            <Badge
              variant="secondary"
              className="shrink-0 hidden sm:inline-flex"
            >
              {EVENT_ROLE_LABELS[member.role as EventParticipantRole]}
            </Badge>
            <span className="text-xs text-muted-foreground hidden md:inline whitespace-nowrap">
              Joined{" "}
              {formatDistanceToNow(new Date(member.joinedAt), {
                addSuffix: true,
              })}
            </span>
            {canModify && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isPending}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isTargetParticipant && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handlePromote(member.userId)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Promote to Organizer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemove(member.userId)}
                        className="text-destructive focus:text-destructive"
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove from Event
                      </DropdownMenuItem>
                    </>
                  )}
                  {isTargetOrganizer && (
                    <DropdownMenuItem
                      onClick={() => handleDemote(member.userId)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Demote to Participant
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
