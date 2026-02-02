import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivePlaceholderMembersByLeague } from "@/db/placeholder-members";
import { auth } from "@/lib/server/auth";
import { TeamAction, canPerformTeamAction } from "@/lib/shared/permissions";
import { getTeam } from "@/services/teams";
import { Users } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AddPlaceholderToTeamForm } from "./add-placeholder-to-team-form";
import { TeamPlaceholderCard } from "./team-placeholder-card";

type PageProps = {
  params: Promise<{ id: string; teamId: string }>;
};

export default async function TeamPlaceholdersPage({ params }: PageProps) {
  const { id: leagueId, teamId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Suspense
        fallback={<PlaceholdersSkeleton leagueId={leagueId} teamId={teamId} />}
      >
        <PlaceholdersContent
          leagueId={leagueId}
          teamId={teamId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function PlaceholdersContent({
  leagueId,
  teamId,
  userId,
}: {
  leagueId: string;
  teamId: string;
  userId: string;
}) {
  const teamResult = await getTeam(userId, teamId);

  if (teamResult.error || !teamResult.data) {
    notFound();
  }

  const team = teamResult.data;
  const userTeamMember = team.members.find(
    (m) => m.userId === userId && !m.leftAt,
  );

  const canManagePlaceholders =
    userTeamMember &&
    canPerformTeamAction(userTeamMember.role, TeamAction.ADD_MEMBERS);

  if (!canManagePlaceholders) {
    redirect(`/leagues/${leagueId}/teams/${teamId}`);
  }

  const leaguePlaceholders =
    await getActivePlaceholderMembersByLeague(leagueId);

  const existingPlaceholderIds = new Set(
    team.members
      .filter((m) => m.placeholderMemberId)
      .map((m) => m.placeholderMemberId),
  );

  const availablePlaceholders = leaguePlaceholders.filter(
    (p) => !existingPlaceholderIds.has(p.id) && !p.retiredAt,
  );

  const teamPlaceholderMembers = team.members
    .filter((m) => m.placeholderMember)
    .map((m) => ({
      teamMemberId: m.id,
      placeholder: m.placeholderMember!,
      leftAt: m.leftAt,
    }));

  const activePlaceholders = teamPlaceholderMembers.filter((m) => !m.leftAt);
  const removedPlaceholders = teamPlaceholderMembers.filter((m) => m.leftAt);

  return (
    <>
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Teams", href: `/leagues/${leagueId}/teams` },
            { label: team.name, href: `/leagues/${leagueId}/teams/${teamId}` },
            { label: "Placeholder Members" },
          ]}
        />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">
          Placeholder Members
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage placeholder members for {team.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Placeholder Member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddPlaceholderToTeamForm
            teamId={teamId}
            availablePlaceholders={availablePlaceholders}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Placeholder Members ({activePlaceholders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePlaceholders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                No active placeholder members on this team.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePlaceholders.map((member) => (
                <TeamPlaceholderCard
                  key={member.teamMemberId}
                  teamMemberId={member.teamMemberId}
                  placeholder={member.placeholder}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {removedPlaceholders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              Removed Placeholder Members ({removedPlaceholders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {removedPlaceholders.map((member) => (
                <div
                  key={member.teamMemberId}
                  className="flex items-center gap-3 rounded-lg border p-3 opacity-60"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>
                      {member.placeholder.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium wrap-break-word">
                      {member.placeholder.displayName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Removed from team
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function PlaceholdersSkeleton({
  leagueId,
  teamId,
}: {
  leagueId: string;
  teamId: string;
}) {
  return (
    <>
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Teams", href: `/leagues/${leagueId}/teams` },
            { label: "Team", href: `/leagues/${leagueId}/teams/${teamId}` },
            { label: "Placeholder Members" },
          ]}
        />
        <Skeleton className="h-8 w-64 mt-2" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
