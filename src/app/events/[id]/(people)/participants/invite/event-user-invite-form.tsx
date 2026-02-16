"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
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
import { EventPlaceholderParticipant } from "@/db/schema";
import { UserSearchResult } from "@/db/users";
import { EventParticipantRole } from "@/lib/shared/constants";
import { EVENT_ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { inviteUserToEventAction } from "../../../actions";
import { searchUsersForEventAction } from "./actions";

interface EventUserInviteFormProps {
  eventId: string;
  placeholders: EventPlaceholderParticipant[];
}

export function EventUserInviteForm({
  eventId,
  placeholders,
}: EventUserInviteFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [role, setRole] = useState<EventParticipantRole>(
    EventParticipantRole.PARTICIPANT,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [placeholderId, setPlaceholderId] = useState<string>("none");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const result = await searchUsersForEventAction({
        eventId,
        query: searchQuery,
      });
      setIsSearching(false);

      if (result.data) {
        setResults(result.data);
      }
    },
    [eventId],
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
      const result = await inviteUserToEventAction({
        eventId,
        inviteeUserId: selectedUser.id,
        role,
        placeholderId: placeholderId !== "none" ? placeholderId : undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`Invitation sent to ${selectedUser.name}`);
        setSelectedUser(null);
        setRole(EventParticipantRole.PARTICIPANT);
        setPlaceholderId("none");
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
          <ParticipantDisplay
            participant={{ user: selectedUser } as ParticipantData}
            showAvatar
            showUsername
            size="lg"
          />
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
                  <ParticipantDisplay
                    participant={{ user } as ParticipantData}
                    showAvatar
                    showUsername
                    size="md"
                  />
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
          onValueChange={(v) => setRole(v as EventParticipantRole)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(EventParticipantRole).map((r) => (
              <SelectItem key={r} value={r}>
                {EVENT_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {placeholders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="direct-placeholder">
            Link to Placeholder (optional)
          </Label>
          <Select value={placeholderId} onValueChange={setPlaceholderId}>
            <SelectTrigger id="direct-placeholder">
              <SelectValue placeholder="No placeholder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No placeholder</SelectItem>
              {placeholders.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            If selected, the invited user will inherit this placeholder&apos;s
            match history and stats.
          </p>
        </div>
      )}

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
