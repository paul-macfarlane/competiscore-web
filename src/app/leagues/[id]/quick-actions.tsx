"use client";

import { Button } from "@/components/ui/button";
import { GameCategory } from "@/lib/shared/constants";
import { Plus, Swords } from "lucide-react";
import Link from "next/link";

type GameTypeInfo = {
  id: string;
  name: string;
  category: string;
  config: string;
};

interface QuickActionsProps {
  leagueId: string;
  gameTypes: GameTypeInfo[];
}

export function QuickActions({ leagueId, gameTypes }: QuickActionsProps) {
  const hasH2H = gameTypes.some(
    (gt) => gt.category === GameCategory.HEAD_TO_HEAD,
  );

  if (gameTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button asChild>
        <Link href={`/leagues/${leagueId}/matches/new`}>
          <Plus className="mr-2 h-4 w-4" />
          Record Match
        </Link>
      </Button>

      {hasH2H && (
        <Button variant="outline" asChild>
          <Link href={`/leagues/${leagueId}/challenges/new`}>
            <Swords className="mr-2 h-4 w-4" />
            Challenge
          </Link>
        </Button>
      )}
    </div>
  );
}
