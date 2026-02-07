"use client";

import { CreateChallengeDialog } from "@/components/create-challenge-dialog";
import { RecordMatchDialog } from "@/components/record-match-dialog";
import { Button } from "@/components/ui/button";
import { GameCategory } from "@/lib/shared/constants";
import { Plus, Swords } from "lucide-react";

type GameTypeInfo = {
  id: string;
  name: string;
  category: string;
  config: string;
};

interface QuickActionsProps {
  leagueId: string;
  gameTypes: GameTypeInfo[];
  currentUserId: string;
}

export function QuickActions({
  leagueId,
  gameTypes,
  currentUserId,
}: QuickActionsProps) {
  const h2hGameTypes = gameTypes.filter(
    (gt) => gt.category === GameCategory.HEAD_TO_HEAD,
  );
  const hasH2H = h2hGameTypes.length > 0;

  if (gameTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <RecordMatchDialog
        leagueId={leagueId}
        gameTypes={gameTypes}
        currentUserId={currentUserId}
        trigger={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Match
          </Button>
        }
      />

      {hasH2H && (
        <CreateChallengeDialog
          leagueId={leagueId}
          h2hGameTypes={h2hGameTypes}
          currentUserId={currentUserId}
          trigger={
            <Button variant="outline">
              <Swords className="mr-2 h-4 w-4" />
              Challenge
            </Button>
          }
        />
      )}
    </div>
  );
}
