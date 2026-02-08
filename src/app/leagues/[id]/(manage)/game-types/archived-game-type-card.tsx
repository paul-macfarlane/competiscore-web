"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameType } from "@/db/schema";
import { GAME_CATEGORY_LABELS, GameCategory } from "@/lib/shared/constants";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { unarchiveGameTypeAction } from "./actions";

type ArchivedGameTypeCardProps = {
  gameType: GameType;
  leagueId: string;
};

export function ArchivedGameTypeCard({ gameType }: ArchivedGameTypeCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUnarchive = () => {
    startTransition(async () => {
      const result = await unarchiveGameTypeAction({ gameTypeId: gameType.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${gameType.name} has been restored`);
        router.refresh();
      }
    });
  };

  const categoryLabel =
    GAME_CATEGORY_LABELS[gameType.category as GameCategory] ||
    gameType.category;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
      {gameType.logo ? (
        <div className="relative w-10 h-10 flex items-center justify-center bg-muted rounded-lg shrink-0 overflow-hidden">
          <Image
            src={gameType.logo}
            alt={gameType.name}
            fill
            className="object-cover p-1 opacity-50"
          />
        </div>
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-lg shrink-0">
          <span className="text-muted-foreground text-xs">—</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate text-muted-foreground">
            {gameType.name}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {categoryLabel}
          </Badge>
        </div>
        {gameType.description && (
          <p className="text-sm text-muted-foreground truncate">
            {gameType.description}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnarchive}
        disabled={isPending}
        className="shrink-0"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        {isPending ? "Restoring..." : "Restore"}
      </Button>
    </div>
  );
}
