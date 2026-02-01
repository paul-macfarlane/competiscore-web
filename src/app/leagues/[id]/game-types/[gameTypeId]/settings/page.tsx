import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getGameType } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EditGameTypeForm } from "./edit-game-type-form";

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
};

export default async function GameTypeSettingsPage({ params }: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [gameTypeResult, leagueResult] = await Promise.all([
    getGameType(session.user.id, gameTypeId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (gameTypeResult.error || !gameTypeResult.data) {
    notFound();
  }

  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const gameType = gameTypeResult.data;
  const league = leagueResult.data;

  if (!canPerformAction(league.role, LeagueAction.CREATE_GAME_TYPES)) {
    redirect(`/leagues/${leagueId}/game-types/${gameTypeId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Game Types", href: `/leagues/${leagueId}/game-types` },
          {
            label: gameType.name,
            href: `/leagues/${leagueId}/game-types/${gameTypeId}`,
          },
          { label: "Settings" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold">Game Type Settings</h1>
        <p className="text-muted-foreground">Edit {gameType.name} settings</p>
      </div>
      <EditGameTypeForm gameType={gameType} leagueId={leagueId} />
    </div>
  );
}
