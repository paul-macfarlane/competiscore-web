import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CreateTournamentForm } from "./create-tournament-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Create Tournament" };

  const leagueResult = await getLeagueWithRole(leagueId, session.user.id);
  if (!leagueResult.data) return { title: "Create Tournament" };

  return {
    title: `Create Tournament | ${leagueResult.data.name}`,
  };
}

export default async function CreateTournamentPage({ params }: PageProps) {
  const { id: leagueId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [leagueResult, gameTypesResult] = await Promise.all([
    getLeagueWithRole(leagueId, session.user.id),
    getLeagueGameTypes(session.user.id, leagueId),
  ]);

  if (leagueResult.error || !leagueResult.data) notFound();

  const league = leagueResult.data;
  const canCreate = canPerformAction(
    league.role,
    LeagueAction.CREATE_TOURNAMENTS,
  );
  if (!canCreate) notFound();

  const gameTypes = gameTypesResult.data ?? [];

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: league.name, href: `/leagues/${leagueId}` },
          { label: "Tournaments", href: `/leagues/${leagueId}/tournaments` },
          { label: "Create Tournament" },
        ]}
      />
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Create Tournament</h1>
        <CreateTournamentForm leagueId={leagueId} gameTypes={gameTypes} />
      </div>
    </div>
  );
}
