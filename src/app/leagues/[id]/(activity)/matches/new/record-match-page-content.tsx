"use client";

import { RecordFFAMatchForm } from "@/components/record-ffa-match-form";
import { RecordH2HMatchForm } from "@/components/record-h2h-match-form";
import { SubmitHighScoreForm } from "@/components/submit-high-score-form";
import { Button } from "@/components/ui/button";
import { GameCategory } from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import {
  FFAConfig,
  H2HConfig,
  HighScoreConfig,
} from "@/lib/shared/game-templates";
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

type RecordMatchPageContentProps = {
  leagueId: string;
  gameTypes: GameTypeInfo[];
  participantOptions: ParticipantOption[];
  currentUserId: string;
  preselectedGameTypeId?: string;
};

export function RecordMatchPageContent({
  leagueId,
  gameTypes,
  participantOptions,
  currentUserId,
  preselectedGameTypeId,
}: RecordMatchPageContentProps) {
  const router = useRouter();

  const initialGameType = preselectedGameTypeId
    ? (gameTypes.find((g) => g.id === preselectedGameTypeId) ?? null)
    : gameTypes.length === 1
      ? gameTypes[0]
      : null;

  const [selectedGameType, setSelectedGameType] = useState<GameTypeInfo | null>(
    initialGameType,
  );

  const handleSuccess = () => {
    router.push(`/leagues/${leagueId}/matches`);
  };

  const handleCancel = () => {
    if (gameTypes.length > 1 && !preselectedGameTypeId && selectedGameType) {
      setSelectedGameType(null);
    } else {
      router.back();
    }
  };

  if (!selectedGameType) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Record Match</h1>
        <p className="text-sm text-muted-foreground">Select a game type:</p>
        <div className="space-y-3">
          {gameTypes.map((gt) => (
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

  const title =
    selectedGameType.category === GameCategory.HIGH_SCORE
      ? "Submit Score"
      : "Record Match";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {gameTypes.length > 1 && !preselectedGameTypeId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedGameType(null)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {selectedGameType.name}
        </Button>
      )}
      {selectedGameType.category === GameCategory.HEAD_TO_HEAD && (
        <RecordH2HMatchForm
          leagueId={leagueId}
          gameTypeId={selectedGameType.id}
          config={
            parseGameConfig(
              selectedGameType.config,
              selectedGameType.category,
            ) as H2HConfig
          }
          participantOptions={participantOptions}
          currentUserId={currentUserId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
      {selectedGameType.category === GameCategory.FREE_FOR_ALL && (
        <RecordFFAMatchForm
          leagueId={leagueId}
          gameTypeId={selectedGameType.id}
          config={
            parseGameConfig(
              selectedGameType.config,
              selectedGameType.category,
            ) as FFAConfig
          }
          participantOptions={participantOptions}
          currentUserId={currentUserId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
      {selectedGameType.category === GameCategory.HIGH_SCORE && (
        <SubmitHighScoreForm
          leagueId={leagueId}
          gameTypeId={selectedGameType.id}
          config={
            parseGameConfig(
              selectedGameType.config,
              selectedGameType.category,
            ) as HighScoreConfig
          }
          participantOptions={participantOptions}
          currentUserId={currentUserId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
