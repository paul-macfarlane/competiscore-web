"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamWithMemberCount } from "@/db/teams";
import { RotateCcw, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { unarchiveTeamAction } from "./actions";

type ArchivedTeamCardProps = {
  team: TeamWithMemberCount;
  leagueId: string;
};

export function ArchivedTeamCard({ team }: ArchivedTeamCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUnarchive = () => {
    startTransition(async () => {
      const result = await unarchiveTeamAction(team.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${team.name} has been restored`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
      {team.logo ? (
        <div className="relative w-10 h-10 flex items-center justify-center bg-muted rounded-lg shrink-0 overflow-hidden">
          <Image
            src={team.logo}
            alt={team.name}
            fill
            className="object-cover p-1 opacity-50"
          />
        </div>
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-lg shrink-0">
          <Users className="h-5 w-5 text-muted-foreground opacity-50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate text-muted-foreground">
            {team.name}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
          </Badge>
        </div>
        {team.description && (
          <p className="text-sm text-muted-foreground truncate">
            {team.description}
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
