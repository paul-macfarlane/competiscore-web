import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import { TournamentStatus } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import { getLeagueTournaments } from "@/services/tournaments";
import { Plus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CreateTournamentDialog } from "./create-tournament-dialog";
import { TournamentCard } from "./tournament-card";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Tournaments" };

  const leagueResult = await getLeagueWithRole(leagueId, session.user.id);
  if (!leagueResult.data) return { title: "Tournaments" };

  return {
    title: `Tournaments | ${leagueResult.data.name}`,
  };
}

export default async function TournamentsPage({ params }: PageProps) {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [leagueResult, tournamentsResult] = await Promise.all([
    getLeagueWithRole(leagueId, session.user.id),
    getLeagueTournaments(session.user.id, leagueId),
  ]);

  if (leagueResult.error || tournamentsResult.error) {
    notFound();
  }

  const league = leagueResult.data!;
  const tournaments = tournamentsResult.data!;
  const canCreate = canPerformAction(
    league.role,
    LeagueAction.CREATE_TOURNAMENTS,
  );

  let gameTypes: Awaited<ReturnType<typeof getLeagueGameTypes>>["data"] = [];
  if (canCreate) {
    const gameTypesResult = await getLeagueGameTypes(session.user.id, leagueId);
    if (gameTypesResult.data) {
      gameTypes = gameTypesResult.data;
    }
  }

  const activeTournaments = tournaments.filter(
    (t) =>
      t.status === TournamentStatus.DRAFT ||
      t.status === TournamentStatus.IN_PROGRESS,
  );
  const completedTournaments = tournaments.filter(
    (t) => t.status === TournamentStatus.COMPLETED,
  );

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: league.name, href: `/leagues/${leagueId}` },
          { label: "Tournaments" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Tournaments</h1>
          <p className="text-muted-foreground mt-1">
            Compete in organized bracket tournaments
          </p>
        </div>
        {canCreate && gameTypes && (
          <CreateTournamentDialog
            leagueId={leagueId}
            gameTypes={gameTypes}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Tournament
              </Button>
            }
          />
        )}
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No tournaments yet.</p>
            {canCreate && (
              <p className="text-sm mt-2">
                Create a tournament to organize bracket competitions.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeTournaments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active</h2>
              <div className="space-y-3">
                {activeTournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    leagueId={leagueId}
                  />
                ))}
              </div>
            </div>
          )}

          {completedTournaments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Completed</h2>
              <div className="space-y-3">
                {completedTournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    leagueId={leagueId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
