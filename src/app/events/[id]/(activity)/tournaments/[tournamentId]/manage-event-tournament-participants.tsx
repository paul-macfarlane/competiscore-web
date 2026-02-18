"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { ParticipantSelector } from "@/components/participant-selector";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchParticipantType } from "@/lib/shared/constants";
import type { ParticipantOption } from "@/lib/shared/participant-options";
import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addEventTournamentParticipantAction,
  addEventTournamentPartnershipAction,
  removeEventTournamentParticipantAction,
  setEventParticipantSeedsAction,
} from "../../../actions";

type PartnershipMember = {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  placeholderParticipant: { id: string; displayName: string } | null;
};

type Participant = {
  id: string;
  eventTeamId: string;
  seed: number | null;
  team: { id: string; name: string; logo: string | null; color: string | null };
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  placeholderParticipant: { id: string; displayName: string } | null;
  members?: PartnershipMember[];
};

type Props = {
  tournamentId: string;
  participants: Participant[];
  participantOptions: ParticipantOption[];
  seedingType: string;
  isTeamTournament?: boolean;
  partnershipSize?: number;
};

export function ManageEventTournamentParticipants({
  tournamentId,
  participants,
  participantOptions,
  seedingType,
  isTeamTournament,
  partnershipSize,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedParticipant, setSelectedParticipant] = useState<
    { id: string; type: MatchParticipantType } | undefined
  >();
  const isPartnership = partnershipSize != null && partnershipSize > 1;
  const [partnerSelections, setPartnerSelections] = useState<
    ({ id: string; type: MatchParticipantType } | undefined)[]
  >(
    isPartnership
      ? Array.from({ length: partnershipSize }, () => undefined)
      : [],
  );
  const [seeds, setSeeds] = useState<Record<string, number>>(
    Object.fromEntries(
      participants
        .filter((p) => p.seed != null)
        .map((p) => [p.id, p.seed as number]),
    ),
  );

  const takenIds = (() => {
    const userIds = new Set<string>();
    const placeholderIds = new Set<string>();
    for (const p of participants) {
      if (isPartnership && p.members && p.members.length > 0) {
        for (const m of p.members) {
          if (m.user) userIds.add(m.user.id);
          if (m.placeholderParticipant)
            placeholderIds.add(m.placeholderParticipant.id);
        }
      } else {
        if (p.user) userIds.add(p.user.id);
        if (p.placeholderParticipant)
          placeholderIds.add(p.placeholderParticipant.id);
      }
    }
    return { userIds, placeholderIds };
  })();

  const availableOptions = (() => {
    if (isTeamTournament) {
      const existingTeamIds = new Set(participants.map((p) => p.eventTeamId));
      return participantOptions.filter((opt) => !existingTeamIds.has(opt.id));
    }
    return participantOptions.filter((opt) => {
      if (opt.type === MatchParticipantType.USER) {
        return !takenIds.userIds.has(opt.id);
      }
      if (opt.type === MatchParticipantType.PLACEHOLDER) {
        return !takenIds.placeholderIds.has(opt.id);
      }
      return true;
    });
  })();

  const getPartnerOptions = (slotIndex: number) => {
    const firstSelection = partnerSelections[0];
    const otherSelectedIds = new Set(
      partnerSelections
        .filter((s, i) => i !== slotIndex && s != null)
        .map((s) => `${s!.type}:${s!.id}`),
    );

    let opts = availableOptions.filter(
      (opt) => !otherSelectedIds.has(`${opt.type}:${opt.id}`),
    );

    if (slotIndex > 0 && firstSelection) {
      const firstOption = participantOptions.find(
        (o) => o.id === firstSelection.id && o.type === firstSelection.type,
      );
      if (firstOption?.teamName) {
        opts = opts.filter((o) => o.teamName === firstOption.teamName);
      }
    }

    return opts;
  };

  const handleAdd = () => {
    if (!selectedParticipant) return;
    const payload: Record<string, string> = {
      eventTournamentId: tournamentId,
    };
    if (selectedParticipant.type === MatchParticipantType.TEAM) {
      payload.eventTeamId = selectedParticipant.id;
    } else if (selectedParticipant.type === MatchParticipantType.USER) {
      payload.userId = selectedParticipant.id;
    } else if (selectedParticipant.type === MatchParticipantType.PLACEHOLDER) {
      payload.eventPlaceholderParticipantId = selectedParticipant.id;
    }
    startTransition(async () => {
      const result = await addEventTournamentParticipantAction(payload);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Participant added");
        setSelectedParticipant(undefined);
        router.refresh();
      }
    });
  };

  const handleAddPartnership = () => {
    if (partnerSelections.some((s) => s == null)) return;
    const members = partnerSelections.map((s) => {
      if (s!.type === MatchParticipantType.USER) {
        return { userId: s!.id };
      }
      return { eventPlaceholderParticipantId: s!.id };
    });
    startTransition(async () => {
      const result = await addEventTournamentPartnershipAction({
        eventTournamentId: tournamentId,
        members,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Partnership added");
        setPartnerSelections(
          Array.from({ length: partnershipSize! }, () => undefined),
        );
        router.refresh();
      }
    });
  };

  const handleRemove = (participantId: string) => {
    startTransition(async () => {
      const result = await removeEventTournamentParticipantAction({
        eventTournamentId: tournamentId,
        participantId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Participant removed");
        router.refresh();
      }
    });
  };

  const handleSaveSeeds = () => {
    const seedEntries = Object.entries(seeds).map(([participantId, seed]) => ({
      participantId,
      seed,
    }));
    startTransition(async () => {
      const result = await setEventParticipantSeedsAction({
        eventTournamentId: tournamentId,
        seeds: seedEntries,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Seeds updated");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {participants.length > 0 ? (
        <ul className="space-y-2">
          {participants.map((p) => {
            const hasMembers =
              isPartnership && p.members && p.members.length > 0;
            const participant: ParticipantData = isTeamTournament
              ? { team: p.team }
              : {
                  user: p.user,
                  placeholderMember: p.placeholderParticipant,
                };
            return (
              <li key={p.id} className="flex items-center gap-2">
                {seedingType === "manual" && (
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="w-16"
                    placeholder="#"
                    value={seeds[p.id] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSeeds((prev) => ({
                        ...prev,
                        [p.id]: val === "" ? undefined! : parseInt(val, 10),
                      }));
                    }}
                  />
                )}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {hasMembers ? (
                    <span className="text-sm font-medium">
                      {p
                        .members!.map(
                          (m) =>
                            m.user?.name ??
                            m.placeholderParticipant?.displayName ??
                            "Unknown",
                        )
                        .join(" & ")}
                    </span>
                  ) : (
                    <ParticipantDisplay
                      participant={participant}
                      showAvatar
                      size="sm"
                    />
                  )}
                  {!isTeamTournament &&
                    (p.team.color ? (
                      <TeamColorBadge name={p.team.name} color={p.team.color} />
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        ({p.team.name})
                      </span>
                    ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleRemove(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No participants yet. Add participants below.
        </p>
      )}

      {seedingType === "manual" && participants.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleSaveSeeds}
        >
          <Save className="mr-1 h-4 w-4" />
          Save Seeds
        </Button>
      )}

      {availableOptions.length > 0 &&
        (isPartnership ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Select {partnershipSize} members from the same team to form a
              partnership:
            </p>
            {partnerSelections.map((selection, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <ParticipantSelector
                    options={getPartnerOptions(idx)}
                    value={selection}
                    onChange={(val) => {
                      setPartnerSelections((prev) => {
                        const next = [...prev];
                        next[idx] = val;
                        if (idx === 0) {
                          for (let i = 1; i < next.length; i++) {
                            next[i] = undefined;
                          }
                        }
                        return next;
                      });
                    }}
                    placeholder={`Select member ${idx + 1}`}
                  />
                </div>
              </div>
            ))}
            <Button
              disabled={partnerSelections.some((s) => s == null) || isPending}
              onClick={handleAddPartnership}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Partnership
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ParticipantSelector
                options={availableOptions}
                value={selectedParticipant}
                onChange={setSelectedParticipant}
                placeholder="Select a participant to add"
              />
            </div>
            <Button
              disabled={!selectedParticipant || isPending}
              onClick={handleAdd}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        ))}
    </div>
  );
}
