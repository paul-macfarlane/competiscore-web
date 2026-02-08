"use client";

import { CreateChallengeForm } from "@/components/create-challenge-form";
import { Button } from "@/components/ui/button";
import { MatchParticipantType } from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type GameTypeInfo = {
  id: string;
  name: string;
  category: string;
  config: string;
};

type CreateChallengePageContentProps = {
  leagueId: string;
  h2hGameTypes: GameTypeInfo[];
  participantOptions: ParticipantOption[];
  currentUserId: string;
  preselectedGameTypeId?: string;
};

export function CreateChallengePageContent({
  leagueId,
  h2hGameTypes,
  participantOptions,
  currentUserId,
  preselectedGameTypeId,
}: CreateChallengePageContentProps) {
  const router = useRouter();

  const initialGameType = preselectedGameTypeId
    ? (h2hGameTypes.find((g) => g.id === preselectedGameTypeId) ?? null)
    : h2hGameTypes.length === 1
      ? h2hGameTypes[0]
      : null;

  const [selectedGameType, setSelectedGameType] = useState<GameTypeInfo | null>(
    initialGameType,
  );

  const handleSuccess = () => {
    router.push(`/leagues/${leagueId}/challenges`);
  };

  const handleCancel = () => {
    if (h2hGameTypes.length > 1 && !preselectedGameTypeId && selectedGameType) {
      setSelectedGameType(null);
    } else {
      router.back();
    }
  };

  const userOnlyOptions = participantOptions.filter(
    (p) => p.type === MatchParticipantType.USER,
  );

  if (!selectedGameType) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Create Challenge</h1>
        <p className="text-sm text-muted-foreground">Select a game type:</p>
        <div className="space-y-3">
          {h2hGameTypes.map((gt) => (
            <Button
              key={gt.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => setSelectedGameType(gt)}
            >
              {gt.name}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Challenge</h1>
      {h2hGameTypes.length > 1 && !preselectedGameTypeId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedGameType(null)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {selectedGameType.name}
        </Button>
      )}
      <CreateChallengeForm
        leagueId={leagueId}
        gameTypeId={selectedGameType.id}
        config={parseH2HConfig(selectedGameType.config)}
        participantOptions={userOnlyOptions}
        currentUserId={currentUserId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
