"use client";

import { inviteTeamMemberAction } from "@/app/leagues/[id]/(people)/teams/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/shared/utils";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  const selectedUser = availableUsers.find((u) => u.user.id === selectedUserId);

  const handleInvite = () => {
    if (!selectedUserId) return;

    setError(null);
    startTransition(async () => {
      const result = await inviteTeamMemberAction({
        teamId,
        input: {
          inviteeUserId: selectedUserId,
          role,
        },
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
        <Label>Select Member</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedUser ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedUser.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedUser.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{selectedUser.user.name}</span>
                  <span className="text-muted-foreground truncate">
                    @{selectedUser.user.username}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  Choose a league member...
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(300px,calc(100vw-3rem))] max-h-[min(300px,var(--radix-popover-content-available-height,300px))] overflow-y-auto p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search members..." />
              <CommandList className="max-h-none">
                <CommandEmpty>No member found.</CommandEmpty>
                <CommandGroup>
                  {availableUsers.map((m) => (
                    <CommandItem
                      key={m.user.id}
                      value={`${m.user.name} ${m.user.username}`}
                      onSelect={() => {
                        setSelectedUserId(
                          selectedUserId === m.user.id ? "" : m.user.id,
                        );
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUserId === m.user.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.user.image ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(m.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{m.user.name}</span>
                          <span className="text-muted-foreground text-xs">
                            @{m.user.username}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
