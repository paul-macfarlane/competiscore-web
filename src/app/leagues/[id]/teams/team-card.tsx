import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamWithMemberCount } from "@/db/teams";
import { ChevronRight, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type TeamCardProps = {
  team: TeamWithMemberCount;
  leagueId: string;
};

export function TeamCard({ team, leagueId }: TeamCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          {team.logo ? (
            <div className="relative w-12 h-12 flex items-center justify-center bg-muted rounded-lg overflow-hidden shrink-0">
              <Image
                src={team.logo}
                alt={team.name}
                fill
                className="object-cover p-1"
              />
            </div>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-lg shrink-0">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{team.name}</CardTitle>
            {team.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {team.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Badge variant="secondary" className="shrink-0">
                {team.memberCount}{" "}
                {team.memberCount === 1 ? "member" : "members"}
              </Badge>
              <Button asChild size="sm">
                <Link href={`/leagues/${leagueId}/teams/${team.id}`}>
                  View
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
