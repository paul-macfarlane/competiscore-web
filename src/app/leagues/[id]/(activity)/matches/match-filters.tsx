"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

type GameType = {
  id: string;
  name: string;
};

type MatchFiltersProps = {
  leagueId: string;
  gameTypes: GameType[];
  selectedGameTypeId?: string;
};

export function MatchFilters({
  leagueId,
  gameTypes,
  selectedGameTypeId,
}: MatchFiltersProps) {
  const router = useRouter();

  const handleGameTypeChange = (value: string) => {
    const params = new URLSearchParams();
    if (value !== "all") {
      params.set("gameTypeId", value);
    }
    const queryString = params.toString();
    router.push(
      `/leagues/${leagueId}/matches${queryString ? `?${queryString}` : ""}`,
    );
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label
          htmlFor="gameTypeFilter"
          className="text-sm text-muted-foreground"
        >
          Game Type:
        </label>
        <Select
          value={selectedGameTypeId || "all"}
          onValueChange={handleGameTypeChange}
        >
          <SelectTrigger id="gameTypeFilter" className="w-[200px]">
            <SelectValue placeholder="All Game Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Game Types</SelectItem>
            {gameTypes.map((gameType) => (
              <SelectItem key={gameType.id} value={gameType.id}>
                {gameType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
