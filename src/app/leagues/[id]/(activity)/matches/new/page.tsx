import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { getLeagueMembers } from "@/db/league-members";
import { getActivePlaceholderMembersByLeague } from "@/db/placeholder-members";
import { getTeamsByLeagueId } from "@/db/teams";
import { auth } from "@/lib/server/auth";
import { GameCategory } from "@/lib/shared/constants";
import { buildParticipantOptions } from "@/lib/shared/participant-options";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { RecordMatchPageContent } from "./record-match-page-content";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gameTypeId?: string; category?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id: leagueId } = await params;
  const { category } = await searchParams;
  const isHighScore = category === "high_score";
  const pageTitle = isHighScore ? "Submit Score" : "Record Match";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: pageTitle };

  const leagueResult = await getLeagueWithRole(leagueId, session.user.id);
  if (!leagueResult.data) return { title: pageTitle };

  return {
    title: `${pageTitle} | ${leagueResult.data.name}`,
  };
}

export default async function RecordMatchPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId } = await params;
  const { gameTypeId, category } = await searchParams;
  const isHighScore = category === "high_score";
  const pageTitle = isHighScore ? "Submit Score" : "Record Match";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [leagueResult, gameTypesResult] = await Promise.all([
    getLeagueWithRole(leagueId, session.user.id),
    getLeagueGameTypes(session.user.id, leagueId),
  ]);

  if (leagueResult.error || !leagueResult.data) notFound();

  const league = leagueResult.data;
  const canPlay = canPerformAction(league.role, LeagueAction.PLAY_GAMES);
  const isSuspended =
    league.suspendedUntil && league.suspendedUntil > new Date();

  if (!canPlay || isSuspended) notFound();

  const allGameTypes = gameTypesResult.data ?? [];
  const activeGameTypes = allGameTypes.filter((gt) => !gt.isArchived);
  const filteredGameTypes = isHighScore
    ? activeGameTypes.filter((gt) => gt.category === GameCategory.HIGH_SCORE)
    : activeGameTypes.filter((gt) => gt.category !== GameCategory.HIGH_SCORE);
  if (filteredGameTypes.length === 0) notFound();

  const [members, teams, placeholders] = await Promise.all([
    getLeagueMembers(leagueId),
    getTeamsByLeagueId(leagueId),
    getActivePlaceholderMembersByLeague(leagueId),
  ]);

  const participantOptions = buildParticipantOptions(
    members,
    teams,
    placeholders,
  );

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: league.name, href: `/leagues/${leagueId}` },
          { label: "Matches", href: `/leagues/${leagueId}/matches` },
          { label: pageTitle },
        ]}
      />
      <div className="max-w-2xl">
        <RecordMatchPageContent
          leagueId={leagueId}
          gameTypes={filteredGameTypes}
          participantOptions={participantOptions}
          currentUserId={session.user.id}
          preselectedGameTypeId={gameTypeId}
        />
      </div>
    </div>
  );
}
