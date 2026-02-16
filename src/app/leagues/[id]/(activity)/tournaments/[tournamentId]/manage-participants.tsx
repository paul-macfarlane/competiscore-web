"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TournamentParticipantWithDetails } from "@/db/tournaments";
import { ParticipantType, SeedingType } from "@/lib/shared/constants";
import { cn } from "@/lib/shared/utils";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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

  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!selectedId) return null;
    if (isTeamTournament) {
      return availableTeams.find((t) => t.id === selectedId)?.name;
    }
    if (selectedId.startsWith("placeholder:")) {
      const pid = selectedId.replace("placeholder:", "");
      return availablePlaceholders.find((p) => p.id === pid)?.displayName;
    }
    const member = availableMembers.find((m) => m.id === selectedId);
    return member ? `${member.name} (@${member.username})` : null;
  }, [
    selectedId,
    isTeamTournament,
    availableTeams,
    availableMembers,
    availablePlaceholders,
  ]);

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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedLabel ? (
                  <span className="truncate">{selectedLabel}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Select a {isTeamTournament ? "team" : "participant"}
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
                <CommandInput placeholder="Search..." />
                <CommandList className="max-h-none">
                  <CommandEmpty>No results found.</CommandEmpty>
                  {isTeamTournament ? (
                    <CommandGroup>
                      {availableTeams.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.name}
                          onSelect={() => {
                            setSelectedId(selectedId === t.id ? "" : t.id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedId === t.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {t.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <>
                      {availableMembers.length > 0 && (
                        <CommandGroup heading="Members">
                          {availableMembers.map((m) => (
                            <CommandItem
                              key={m.id}
                              value={`${m.name} ${m.username}`}
                              onSelect={() => {
                                setSelectedId(selectedId === m.id ? "" : m.id);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedId === m.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {m.name}{" "}
                              <span className="text-muted-foreground">
                                @{m.username}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {availablePlaceholders.length > 0 && (
                        <CommandGroup heading="Placeholder Members">
                          {availablePlaceholders.map((p) => {
                            const val = `placeholder:${p.id}`;
                            return (
                              <CommandItem
                                key={p.id}
                                value={p.displayName}
                                onSelect={() => {
                                  setSelectedId(selectedId === val ? "" : val);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedId === val
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {p.displayName}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
