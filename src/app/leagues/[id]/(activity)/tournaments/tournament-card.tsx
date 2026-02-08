import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TournamentWithDetails } from "@/db/tournaments";
import {
  TOURNAMENT_STATUS_LABELS,
  TournamentStatus,
} from "@/lib/shared/constants";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type TournamentCardProps = {
  tournament: TournamentWithDetails;
  leagueId: string;
};

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case TournamentStatus.IN_PROGRESS:
      return "default";
    case TournamentStatus.COMPLETED:
      return "secondary";
    default:
      return "outline";
  }
}

export function TournamentCard({ tournament, leagueId }: TournamentCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          {tournament.logo ? (
            <div className="relative h-5 w-5 shrink-0 mt-0.5">
              <Image
                src={tournament.logo}
                alt={tournament.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Trophy className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold break-all">{tournament.name}</span>
              <Badge
                variant={getStatusVariant(tournament.status)}
                className="shrink-0"
              >
                {
                  TOURNAMENT_STATUS_LABELS[
                    tournament.status as TournamentStatus
                  ]
                }
              </Badge>
              <Button asChild size="sm" className="shrink-0 ml-auto">
                <Link
                  href={`/leagues/${leagueId}/tournaments/${tournament.id}`}
                >
                  View
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {tournament.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {tournament.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{tournament.gameType.name}</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {tournament.participantCount} participant
            {tournament.participantCount !== 1 ? "s" : ""}
          </span>
          {tournament.startDate && (
            <span>
              Starts{" "}
              {formatDistanceToNow(new Date(tournament.startDate), {
                addSuffix: true,
              })}
            </span>
          )}
          {tournament.completedAt && (
            <span>
              Completed{" "}
              {formatDistanceToNow(new Date(tournament.completedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
