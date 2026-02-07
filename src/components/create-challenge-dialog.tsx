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
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useState } from "react";

import { CreateChallengeForm } from "./create-challenge-form";

type GameTypeInfo = {
  id: string;
  name: string;
  category: string;
  config: string;
};

interface CreateChallengeDialogProps {
  leagueId: string;
  h2hGameTypes: GameTypeInfo[];
  currentUserId: string;
  trigger: ReactNode;
  preselectedGameTypeId?: string;
}

export function CreateChallengeDialog({
  leagueId,
  h2hGameTypes,
  currentUserId,
  trigger,
  preselectedGameTypeId,
}: CreateChallengeDialogProps) {
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
        const gt = h2hGameTypes.find((g) => g.id === preselectedGameTypeId);
        if (gt) setSelectedGameType(gt);
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
    if (!preselectedGameTypeId) {
      setSelectedGameType(null);
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Challenge</DialogTitle>
        </DialogHeader>

        {!selectedGameType ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a game type:</p>
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
        ) : isLoading || !participantOptions ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {!preselectedGameTypeId && (
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
              participantOptions={participantOptions}
              currentUserId={currentUserId}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
