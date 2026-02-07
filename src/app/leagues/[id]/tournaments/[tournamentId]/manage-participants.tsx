"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TournamentParticipantWithDetails } from "@/db/tournaments";
import { ParticipantType, SeedingType } from "@/lib/shared/constants";
import { Loader2, Save, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addTournamentParticipantAction,
  removeTournamentParticipantAction,
  setParticipantSeedsAction,
} from "../actions";

type ManageParticipantsProps = {
  tournamentId: string;
  participantType: string;
  seedingType: string;
  participants: TournamentParticipantWithDetails[];
  leagueMembers: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  }[];
  leagueTeams: { id: string; name: string; logo: string | null }[];
  placeholderMembers: { id: string; displayName: string }[];
};

export function ManageParticipants({
  tournamentId,
  participantType,
  seedingType,
  participants,
  leagueMembers,
  leagueTeams,
  placeholderMembers,
}: ManageParticipantsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string>("");

  const isManualSeeding = seedingType === SeedingType.MANUAL;

  const [seeds, setSeeds] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of participants) {
      initial[p.id] = p.seed ? String(p.seed) : "";
    }
    return initial;
  });

  const existingUserIds = new Set(
    participants.map((p) => p.userId).filter(Boolean),
  );
  const existingTeamIds = new Set(
    participants.map((p) => p.teamId).filter(Boolean),
  );
  const existingPlaceholderIds = new Set(
    participants.map((p) => p.placeholderMemberId).filter(Boolean),
  );

  const availableMembers = leagueMembers.filter(
    (m) => !existingUserIds.has(m.id),
  );
  const availableTeams = leagueTeams.filter((t) => !existingTeamIds.has(t.id));
  const availablePlaceholders = placeholderMembers.filter(
    (p) => !existingPlaceholderIds.has(p.id),
  );

  const isTeamTournament = participantType === ParticipantType.TEAM;

  const handleAdd = () => {
    if (!selectedId) return;
    startTransition(async () => {
      let input: Record<string, string>;

      if (isTeamTournament) {
        input = { tournamentId, teamId: selectedId };
      } else if (selectedId.startsWith("placeholder:")) {
        input = {
          tournamentId,
          placeholderMemberId: selectedId.replace("placeholder:", ""),
        };
      } else {
        input = { tournamentId, userId: selectedId };
      }

      const result = await addTournamentParticipantAction(input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Participant added");
        setSelectedId("");
        router.refresh();
      }
    });
  };

  const handleRemove = (participantId: string) => {
    startTransition(async () => {
      const result = await removeTournamentParticipantAction({
        tournamentId,
        participantId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Participant removed");
        setSeeds((prev) => {
          const next = { ...prev };
          delete next[participantId];
          return next;
        });
        router.refresh();
      }
    });
  };

  const handleSaveSeeds = () => {
    const seedEntries = Object.entries(seeds)
      .filter(([, val]) => val !== "")
      .map(([participantId, val]) => ({
        participantId,
        seed: parseInt(val, 10),
      }));

    if (seedEntries.length !== participants.length) {
      toast.error("All participants must have a seed number");
      return;
    }

    startTransition(async () => {
      const result = await setParticipantSeedsAction({
        tournamentId,
        seeds: seedEntries,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Seeds saved");
        router.refresh();
      }
    });
  };

  const hasAvailable = isTeamTournament
    ? availableTeams.length > 0
    : availableMembers.length > 0 || availablePlaceholders.length > 0;

  const allSeedsAssigned =
    participants.length > 0 &&
    participants.every((p) => seeds[p.id] && seeds[p.id] !== "");

  const currentSeedsMatchSaved = participants.every(
    (p) => String(p.seed || "") === (seeds[p.id] || ""),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium mb-1 block">
            Add {isTeamTournament ? "Team" : "Participant"}
          </label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue
                placeholder={`Select a ${isTeamTournament ? "team" : "participant"}`}
              />
            </SelectTrigger>
            <SelectContent>
              {isTeamTournament ? (
                availableTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              ) : (
                <>
                  {availableMembers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Members</SelectLabel>
                      {availableMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} (@{m.username})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {availablePlaceholders.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Placeholder Members</SelectLabel>
                      {availablePlaceholders.map((p) => (
                        <SelectItem key={p.id} value={`placeholder:${p.id}`}>
                          {p.displayName} (Placeholder)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAdd}
          disabled={!selectedId || isPending || !hasAvailable}
          size="icon"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No participants added yet.
        </p>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => {
            const participant: ParticipantData = {
              user: p.user,
              team: p.team,
              placeholderMember: p.placeholderMember,
            };

            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isManualSeeding && (
                    <Input
                      type="number"
                      min={1}
                      max={participants.length}
                      placeholder="#"
                      value={seeds[p.id] || ""}
                      onChange={(e) =>
                        setSeeds((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="w-14 h-8 text-center text-sm"
                    />
                  )}
                  {!isManualSeeding && p.seed && (
                    <span className="text-xs font-mono text-muted-foreground w-6">
                      #{p.seed}
                    </span>
                  )}
                  <ParticipantDisplay
                    participant={participant}
                    showAvatar
                    showUsername
                    size="sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(p.id)}
                  disabled={isPending}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {isManualSeeding && participants.length > 0 && (
        <Button
          onClick={handleSaveSeeds}
          disabled={isPending || !allSeedsAssigned || currentSeedsMatchSaved}
          size="sm"
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Seeds
        </Button>
      )}
    </div>
  );
}
