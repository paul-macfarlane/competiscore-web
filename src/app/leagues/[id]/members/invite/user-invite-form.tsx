"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSearchResult } from "@/db/users";
import { getInitials } from "@/lib/client/utils";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { inviteUserAction, searchUsersAction } from "./actions";

interface UserInviteFormProps {
  leagueId: string;
  availableRoles: LeagueMemberRole[];
}

export function UserInviteForm({
  leagueId,
  availableRoles,
}: UserInviteFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [role, setRole] = useState<LeagueMemberRole>(LeagueMemberRole.MEMBER);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const result = await searchUsersAction(leagueId, searchQuery);
      setIsSearching(false);

      if (result.data) {
        setResults(result.data);
      }
    },
    [leagueId],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query && !selectedUser) {
        searchUsers(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedUser, searchUsers]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setQuery("");
    setResults([]);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setError(null);
  };

  const handleInvite = () => {
    if (!selectedUser) return;

    setError(null);
    startTransition(async () => {
      const result = await inviteUserAction(leagueId, selectedUser.id, role);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`Invitation sent to ${selectedUser.name}`);
        setSelectedUser(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {selectedUser ? (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUser.image ?? undefined} />
            <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{selectedUser.name}</div>
            <div className="text-muted-foreground text-sm">
              @{selectedUser.username}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="search">Search Users</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-lg border p-2">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {user.name}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      @{user.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && !isSearching && results.length === 0 && (
            <p className="text-muted-foreground text-sm">No users found</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as LeagueMemberRole)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleInvite}
        disabled={!selectedUser || isPending}
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
