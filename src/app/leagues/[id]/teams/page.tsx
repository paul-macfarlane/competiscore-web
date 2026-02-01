import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeagueMember } from "@/db/league-members";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueTeams } from "@/services/teams";
import { Archive, Plus, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ArchivedTeamCard } from "./archived-team-card";
import { TeamCard } from "./team-card";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeamsPage({ params }: PageProps) {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <LeagueBreadcrumb
            items={[
              { label: "League", href: `/leagues/${leagueId}` },
              { label: "Teams" },
            ]}
          />
          <h1 className="mt-2 text-xl font-bold md:text-2xl">Teams</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage teams for competitions
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-9 w-24" />}>
          <CreateTeamButton userId={session.user.id} leagueId={leagueId} />
        </Suspense>
      </div>
      <Suspense fallback={<TeamsSkeleton />}>
        <TeamsList userId={session.user.id} leagueId={leagueId} />
      </Suspense>
    </div>
  );
}

async function CreateTeamButton({
  userId,
  leagueId,
}: {
  userId: string;
  leagueId: string;
}) {
  const membership = await getLeagueMember(userId, leagueId);
  if (
    !membership ||
    !canPerformAction(membership.role, LeagueAction.CREATE_TEAMS)
  ) {
    return null;
  }

  return (
    <Button size="sm" asChild>
      <Link href={`/leagues/${leagueId}/teams/new`}>
        <Plus className="mr-1 h-4 w-4" />
        Create Team
      </Link>
    </Button>
  );
}

async function TeamsList({
  userId,
  leagueId,
}: {
  userId: string;
  leagueId: string;
}) {
  const [result, membership] = await Promise.all([
    getLeagueTeams(userId, leagueId),
    getLeagueMember(userId, leagueId),
  ]);

  if (result.error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const teams = result.data || [];
  const activeTeams = teams.filter((t) => !t.isArchived);
  const archivedTeams = teams.filter((t) => t.isArchived);
  const canManage =
    membership && canPerformAction(membership.role, LeagueAction.MANAGE_TEAMS);

  return (
    <div className="space-y-8">
      {activeTeams.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No teams yet</p>
            <p className="text-sm">Create your first team to start competing</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeTeams.map((team) => (
            <TeamCard key={team.id} team={team} leagueId={leagueId} />
          ))}
        </div>
      )}

      {canManage && archivedTeams.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Archive className="h-5 w-5" />
              Archived Teams
              <Badge variant="secondary">{archivedTeams.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {archivedTeams.map((team) => (
                <ArchivedTeamCard
                  key={team.id}
                  team={team}
                  leagueId={leagueId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}
