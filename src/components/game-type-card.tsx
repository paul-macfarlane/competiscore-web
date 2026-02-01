import { GameType } from "@/db/schema";
import { GAME_CATEGORY_LABELS, GameCategory } from "@/lib/shared/constants";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle } from "./ui/card";

type GameTypeCardProps = {
  gameType: GameType;
  leagueId: string;
};

export function GameTypeCard({ gameType, leagueId }: GameTypeCardProps) {
  const categoryLabel = GAME_CATEGORY_LABELS[gameType.category as GameCategory];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {gameType.logo && (
              <div className="relative w-12 h-12 flex items-center justify-center bg-muted rounded-lg overflow-hidden shrink-0">
                <Image
                  src={gameType.logo}
                  alt={gameType.name}
                  fill
                  className="object-cover p-1"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg">{gameType.name}</CardTitle>
              {gameType.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {gameType.description}
                </p>
              )}
              <div className="mt-2">
                <Badge variant="secondary" className="shrink-0">
                  {categoryLabel}
                </Badge>
              </div>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href={`/leagues/${leagueId}/game-types/${gameType.id}`}>
              View
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
