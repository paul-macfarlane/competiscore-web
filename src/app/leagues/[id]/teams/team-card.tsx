import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamWithMemberCount } from "@/db/teams";
import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type TeamCardProps = {
  team: TeamWithMemberCount;
  leagueId: string;
};

export function TeamCard({ team, leagueId }: TeamCardProps) {
  return (
    <Link href={`/leagues/${leagueId}/teams/${team.id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {team.logo ? (
                <div className="relative w-12 h-12 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={team.logo}
                    alt={team.name}
                    fill
                    className="object-cover p-1"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-lg">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{team.name}</CardTitle>
                {team.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {team.description}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
