"use client";

import { inviteTeamMemberAction } from "@/app/leagues/[id]/teams/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/db/schema";
import { getInitials } from "@/lib/client/utils";
import { TeamMemberRole } from "@/lib/shared/constants";
import { TEAM_ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface TeamInviteFormProps {
  teamId: string;
  availableUsers: Array<{
    user: Pick<User, "id" | "name" | "username" | "image">;
  }>;
}

export function TeamInviteForm({
  teamId,
  availableUsers,
}: TeamInviteFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [role, setRole] = useState<TeamMemberRole>(TeamMemberRole.MEMBER);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedUser = availableUsers.find((u) => u.user.id === selectedUserId);

  const handleInvite = () => {
    if (!selectedUserId) return;

    setError(null);
    startTransition(async () => {
      const result = await inviteTeamMemberAction(teamId, {
        inviteeUserId: selectedUserId,
        role,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(
          `Invitation sent to ${selectedUser?.user.name ?? "user"}`,
        );
        setSelectedUserId("");
      }
    });
  };

  if (availableUsers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        All league members are already on this team or have pending invitations.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="user-select">Select Member</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger id="user-select">
            <SelectValue placeholder="Choose a league member..." />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((m) => (
              <SelectItem key={m.user.id} value={m.user.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(m.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{m.user.name}</span>
                  <span className="text-muted-foreground">
                    @{m.user.username}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUser && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUser.user.image ?? undefined} />
            <AvatarFallback>
              {getInitials(selectedUser.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{selectedUser.user.name}</div>
            <div className="text-muted-foreground text-sm">
              @{selectedUser.user.username}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedUserId("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Team Role</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as TeamMemberRole)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(TeamMemberRole).map((r) => (
              <SelectItem key={r} value={r}>
                {TEAM_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleInvite}
        disabled={!selectedUserId || isPending}
        className="w-full"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Send Invitation
      </Button>
    </div>
  );
}
