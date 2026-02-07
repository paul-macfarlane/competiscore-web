"use client";

import { getLeagueParticipantOptions } from "@/actions/league-form-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ReactNode, useCallback, useState } from "react";

import { RecordFFAMatchForm } from "./record-ffa-match-form";
import { RecordH2HMatchForm } from "./record-h2h-match-form";
import { SubmitHighScoreForm } from "./submit-high-score-form";

type GameTypeInfo = {
  id: string;
  name: string;
  category: string;
  config: string;
};

interface RecordMatchDialogProps {
  leagueId: string;
  gameTypes: GameTypeInfo[];
  currentUserId: string;
  trigger: ReactNode;
  preselectedGameTypeId?: string;
}

export function RecordMatchDialog({
  leagueId,
  gameTypes,
  currentUserId,
  trigger,
  preselectedGameTypeId,
}: RecordMatchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<GameTypeInfo | null>(
    null,
  );
  const [participantOptions, setParticipantOptions] = useState<
    ParticipantOption[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getLeagueParticipantOptions(leagueId);
    if (result.data) {
      setParticipantOptions(result.data);
    }
    setIsLoading(false);
  }, [leagueId]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadData();
      if (preselectedGameTypeId) {
        const gt = gameTypes.find((g) => g.id === preselectedGameTypeId);
        if (gt) setSelectedGameType(gt);
      } else if (gameTypes.length === 1) {
        setSelectedGameType(gameTypes[0]);
      }
    } else {
      setSelectedGameType(null);
      setParticipantOptions(null);
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const handleCancel = () => {
    if (gameTypes.length > 1 && !preselectedGameTypeId) {
      setSelectedGameType(null);
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedGameType
              ? selectedGameType.category === GameCategory.HIGH_SCORE
                ? "Submit Score"
                : "Record Match"
              : "Record Match"}
          </DialogTitle>
        </DialogHeader>

        {!selectedGameType ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a game type:</p>
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
        ) : isLoading || !participantOptions ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
