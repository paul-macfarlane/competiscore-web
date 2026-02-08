import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeagueMembers } from "@/db/league-members";
import { getActivePlaceholderMembersByLeague } from "@/db/placeholder-members";
import { getTeamsByLeagueId } from "@/db/teams";
import { auth } from "@/lib/server/auth";
import {
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_TYPE_LABELS,
  TournamentStatus,
  TournamentType,
} from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { getTournament } from "@/services/tournaments";
import { Pencil, Trophy, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DraftActions } from "./draft-actions";
import { ManageParticipants } from "./manage-participants";
import { TournamentBracketView } from "./tournament-bracket-view";

type PageProps = {
  params: Promise<{ id: string; tournamentId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { tournamentId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Tournament" };

  const result = await getTournament(session.user.id, tournamentId);
  if (!result.data) return { title: "Tournament" };

  return {
    title: `${result.data.name} | Tournament`,
  };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { id: leagueId, tournamentId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [tournamentResult, leagueResult] = await Promise.all([
    getTournament(session.user.id, tournamentId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (tournamentResult.error || leagueResult.error) {
    notFound();
  }

  const tournament = tournamentResult.data!;
  const league = leagueResult.data!;
  const canManage = canPerformAction(
    league.role,
    LeagueAction.CREATE_TOURNAMENTS,
  );

  const isDraft = tournament.status === TournamentStatus.DRAFT;
  const isInProgress = tournament.status === TournamentStatus.IN_PROGRESS;
  const isCompleted = tournament.status === TournamentStatus.COMPLETED;
  const h2hConfig = parseH2HConfig(tournament.gameType.config);
  const isParticipant = tournament.participants.some(
    (p) => p.userId === session.user.id,
  );
  const canRecordMatches = isInProgress && (canManage || isParticipant);

  // For draft mode, get league members/teams/placeholders for participant selection
  let leagueMembers: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  }[] = [];
  let leagueTeams: { id: string; name: string; logo: string | null }[] = [];
  let placeholderMembers: { id: string; displayName: string }[] = [];

  if (isDraft && canManage) {
    const [membersData, teamsData, placeholdersData] = await Promise.all([
      getLeagueMembers(leagueId),
      getTeamsByLeagueId(leagueId),
      getActivePlaceholderMembersByLeague(leagueId),
    ]);
    leagueMembers = membersData.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      username: m.user.username,
      image: m.user.image,
    }));
    leagueTeams = teamsData
      .filter((t) => !t.isArchived)
      .map((t) => ({
        id: t.id,
        name: t.name,
        logo: t.logo,
      }));
    placeholderMembers = placeholdersData.map((p) => ({
      id: p.id,
      displayName: p.displayName,
    }));
  }

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: league.name, href: `/leagues/${leagueId}` },
          { label: "Tournaments", href: `/leagues/${leagueId}/tournaments` },
          { label: tournament.name },
        ]}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {tournament.logo && (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={tournament.logo}
                  alt={tournament.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold md:text-3xl">
              {tournament.name}
            </h1>
            {canManage && (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link
                  href={`/leagues/${leagueId}/tournaments/${tournament.id}/edit`}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit tournament</span>
                </Link>
              </Button>
            )}
            <Badge
              variant={
                isInProgress ? "default" : isCompleted ? "secondary" : "outline"
              }
            >
              {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
            </Badge>
          </div>
          {tournament.description && (
            <p className="text-muted-foreground">{tournament.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{tournament.gameType.name}</span>
            <span>
              {
                TOURNAMENT_TYPE_LABELS[
                  tournament.tournamentType as TournamentType
                ]
              }
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {tournament.participants.length} participant
              {tournament.participants.length !== 1 ? "s" : ""}
            </span>
            {tournament.totalRounds && (
              <span>{tournament.totalRounds} rounds</span>
            )}
          </div>
        </div>

        {isDraft && canManage && (
          <DraftActions
            tournamentId={tournament.id}
            leagueId={leagueId}
            participantCount={tournament.participants.length}
          />
        )}
      </div>

      {isCompleted && (
        <Card className="border-(--rank-gold-text)/40 bg-rank-gold-bg">
          <CardContent className="py-4 flex items-center justify-center gap-3">
            <Trophy className="h-6 w-6 text-rank-gold-text" />
            <span className="text-lg font-semibold">
              Champion:{" "}
              {tournament.participants.find((p) => p.finalPlacement === 1)?.user
                ?.name ||
                tournament.participants.find((p) => p.finalPlacement === 1)
                  ?.team?.name ||
                tournament.participants.find((p) => p.finalPlacement === 1)
                  ?.placeholderMember?.displayName ||
                "Unknown"}
            </span>
          </CardContent>
        </Card>
      )}

      {isDraft && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <ManageParticipants
              tournamentId={tournament.id}
              participantType={tournament.participantType}
              seedingType={tournament.seedingType}
              participants={tournament.participants}
              leagueMembers={leagueMembers}
              leagueTeams={leagueTeams}
              placeholderMembers={placeholderMembers}
            />
          </CardContent>
        </Card>
      )}

      {isDraft && !canManage && tournament.participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Participants ({tournament.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tournament.participants.map((p) => (
                <div key={p.id} className="text-sm">
                  {p.user?.name ||
                    p.team?.name ||
                    p.placeholderMember?.displayName}
                  {p.seed && (
                    <span className="text-muted-foreground ml-1">
                      (Seed #{p.seed})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(isInProgress || isCompleted) && tournament.totalRounds && (
        <Card>
          <CardHeader>
            <CardTitle>Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            <TournamentBracketView
              bracket={tournament.bracket}
              totalRounds={tournament.totalRounds}
              canManage={canRecordMatches}
              config={h2hConfig}
              leagueId={leagueId}
              gameTypeId={tournament.gameType.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
