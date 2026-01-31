"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LeagueMemberWithUser } from "@/db/league-members";
import { getInitials } from "@/lib/client/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, Loader2, Shield, Unlock } from "lucide-react";
import { useState, useTransition } from "react";

import { liftSuspensionAction } from "./actions";

interface SuspendedMembersListProps {
  members: LeagueMemberWithUser[];
  leagueId: string;
}

export function SuspendedMembersList({
  members: initialMembers,
  leagueId,
}: SuspendedMembersListProps) {
  const [members, setMembers] = useState(initialMembers);

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No members are currently suspended.
        </p>
      </div>
    );
  }

  const handleLiftSuccess = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <SuspendedMemberItem
          key={member.id}
          member={member}
          leagueId={leagueId}
          onLiftSuccess={handleLiftSuccess}
        />
      ))}
    </div>
  );
}

interface SuspendedMemberItemProps {
  member: LeagueMemberWithUser;
  leagueId: string;
  onLiftSuccess: (userId: string) => void;
}

function SuspendedMemberItem({
  member,
  leagueId,
  onLiftSuccess,
}: SuspendedMemberItemProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleLiftSuspension = () => {
    setError(null);
    startTransition(async () => {
      const result = await liftSuspensionAction({
        leagueId,
        targetUserId: member.userId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onLiftSuccess(member.userId);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.user.image ?? undefined} />
        <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{member.user.name}</div>
        <div className="text-muted-foreground text-sm">
          @{member.user.username}
        </div>
        {member.suspendedUntil && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            Suspended until{" "}
            {formatDistanceToNow(member.suspendedUntil, { addSuffix: true })}
            <span className="text-muted-foreground/60">
              ({format(member.suspendedUntil, "PPp")})
            </span>
          </div>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLiftSuspension}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Unlock className="mr-2 h-4 w-4" />
        )}
        Lift
      </Button>
    </div>
  );
}
