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
  removeEventTournamentParticipantAction,
  setEventParticipantSeedsAction,
} from "../../../actions";

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
};

type Props = {
  tournamentId: string;
  participants: Participant[];
  participantOptions: ParticipantOption[];
  seedingType: string;
  isTeamTournament?: boolean;
};

export function ManageEventTournamentParticipants({
  tournamentId,
  participants,
  participantOptions,
  seedingType,
  isTeamTournament,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedParticipant, setSelectedParticipant] = useState<
    { id: string; type: MatchParticipantType } | undefined
  >();
  const [seeds, setSeeds] = useState<Record<string, number>>(
    Object.fromEntries(
      participants
        .filter((p) => p.seed != null)
        .map((p) => [p.id, p.seed as number]),
    ),
  );

  const availableOptions = (() => {
    if (isTeamTournament) {
      const existingTeamIds = new Set(participants.map((p) => p.eventTeamId));
      return participantOptions.filter((opt) => !existingTeamIds.has(opt.id));
    }
    const existingUserIds = new Set(
      participants.filter((p) => p.user).map((p) => p.user!.id),
    );
    const existingPlaceholderIds = new Set(
      participants
        .filter((p) => p.placeholderParticipant)
        .map((p) => p.placeholderParticipant!.id),
    );
    return participantOptions.filter((opt) => {
      if (opt.type === MatchParticipantType.USER) {
        return !existingUserIds.has(opt.id);
      }
      if (opt.type === MatchParticipantType.PLACEHOLDER) {
        return !existingPlaceholderIds.has(opt.id);
      }
      return true;
    });
  })();

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
                  <ParticipantDisplay
                    participant={participant}
                    showAvatar
                    size="sm"
                  />
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

      {availableOptions.length > 0 && (
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
      )}
    </div>
  );
}
