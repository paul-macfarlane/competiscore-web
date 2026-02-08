import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { getTournament } from "@/services/tournaments";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EditTournamentForm } from "./edit-tournament-form";

type PageProps = {
  params: Promise<{ id: string; tournamentId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { tournamentId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Edit Tournament" };

  const result = await getTournament(session.user.id, tournamentId);
  if (!result.data) return { title: "Edit Tournament" };

  return {
    title: `Edit ${result.data.name} | Tournament`,
  };
}

export default async function EditTournamentPage({ params }: PageProps) {
  const { id: leagueId, tournamentId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [tournamentResult, leagueResult] = await Promise.all([
    getTournament(session.user.id, tournamentId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (tournamentResult.error || leagueResult.error) notFound();

  const tournament = tournamentResult.data!;
  const league = leagueResult.data!;
  const canManage = canPerformAction(
    league.role,
    LeagueAction.CREATE_TOURNAMENTS,
  );
  if (!canManage) notFound();

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: league.name, href: `/leagues/${leagueId}` },
          { label: "Tournaments", href: `/leagues/${leagueId}/tournaments` },
          {
            label: tournament.name,
            href: `/leagues/${leagueId}/tournaments/${tournamentId}`,
          },
          { label: "Edit" },
        ]}
      />
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Edit Tournament</h1>
        <EditTournamentForm
          tournamentId={tournamentId}
          leagueId={leagueId}
          name={tournament.name}
          description={tournament.description}
          logo={tournament.logo}
        />
      </div>
    </div>
  );
}
