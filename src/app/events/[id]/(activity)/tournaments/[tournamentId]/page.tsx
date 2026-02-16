import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import {
  GameCategory,
  ParticipantType,
  TOURNAMENT_STATUS_LABELS,
  TournamentStatus,
} from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import {
  buildEventParticipantOptions,
  buildEventTeamOptions,
} from "@/lib/shared/participant-options";
import { getEventTeamMembersForParticipants } from "@/services/event-leaderboards";
import { getEventTeams } from "@/services/event-teams";
import { getEventTournament } from "@/services/event-tournaments";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { Pencil, Trophy } from "lucide-react";
import { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DraftEventActions } from "./draft-event-actions";
import { EventTournamentBracketView } from "./event-tournament-bracket-view";
import { ManageEventTournamentParticipants } from "./manage-event-tournament-participants";

type Props = {
  params: Promise<{ id: string; tournamentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) return { title: "Tournament" };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Tournament" };

  const tournamentResult = await getEventTournament(
    session.user.id,
    rawParams.tournamentId,
  );
  if (!tournamentResult.data) return { title: "Tournament" };

  return {
    title: tournamentResult.data.name,
    description: tournamentResult.data.description ?? "Event tournament",
  };
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case TournamentStatus.DRAFT:
      return "secondary";
    case TournamentStatus.IN_PROGRESS:
      return "default";
    case TournamentStatus.COMPLETED:
      return "outline";
    default:
      return "secondary";
  }
}

export default async function EventTournamentDetailPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) notFound();

  const eventId = parsed.data.id;
  const { tournamentId } = rawParams;
  const eventResult = await getEvent(session.user.id, eventId);
  if (!eventResult.data) notFound();

  const event = eventResult.data;
  const canManage = event.role === "organizer";

  const tournamentResult = await getEventTournament(
    session.user.id,
    tournamentId,
  );
  if (!tournamentResult.data) notFound();

  const tournament = tournamentResult.data;
  const { participants, bracket } = tournament;
  const isTeamTournament = tournament.participantType === ParticipantType.TEAM;

  const participantOptions = await (async () => {
    if (!canManage) return [];
    if (isTeamTournament) {
      const teamsResult = await getEventTeams(session.user.id, eventId);
      return buildEventTeamOptions(teamsResult.data ?? []);
    }
    const teamMembersResult = await getEventTeamMembersForParticipants(
      session.user.id,
      eventId,
    );
    return buildEventParticipantOptions(teamMembersResult.data ?? []);
  })();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Tournaments", href: `/events/${eventId}/tournaments` },
          { label: tournament.name },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {tournament.logo && (
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src={tournament.logo}
                  alt={tournament.name}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
          </div>
          {tournament.description && (
            <p className="text-muted-foreground">{tournament.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(tournament.status)}>
            {TOURNAMENT_STATUS_LABELS[
              tournament.status as keyof typeof TOURNAMENT_STATUS_LABELS
            ] ?? tournament.status}
          </Badge>
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/events/${eventId}/tournaments/${tournamentId}/edit`}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Game Type</dt>
              <dd className="font-medium">{tournament.gameType.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Best Of</dt>
              <dd className="font-medium">{tournament.bestOf}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Participants</dt>
              <dd className="font-medium">{participants.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Seeding</dt>
              <dd className="font-medium capitalize">
                {tournament.seedingType}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {tournament.status === TournamentStatus.COMPLETED &&
        (() => {
          const winner = participants.find((p) => p.finalPlacement === 1);
          if (!winner) return null;
          const winnerParticipant: ParticipantData = isTeamTournament
            ? { team: winner.team }
            : {
                user: winner.user,
                placeholderMember: winner.placeholderParticipant,
              };
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Winner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ParticipantDisplay
                    participant={winnerParticipant}
                    showAvatar
                    size="md"
                  />
                  {!isTeamTournament && (
                    <span className="text-muted-foreground text-sm">
                      ({winner.team.name})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {tournament.status === TournamentStatus.DRAFT && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
              <CardDescription>
                {participants.length} participant
                {participants.length !== 1 ? "s" : ""} registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <ManageEventTournamentParticipants
                  tournamentId={tournamentId}
                  participants={participants.map((p) => ({
                    id: p.id,
                    eventTeamId: p.eventTeamId,
                    seed: p.seed,
                    team: {
                      id: p.team.id,
                      name: p.team.name,
                      logo: p.team.logo,
                      color: p.team.color,
                    },
                    user: p.user,
                    placeholderParticipant: p.placeholderParticipant,
                  }))}
                  participantOptions={participantOptions}
                  seedingType={tournament.seedingType}
                  isTeamTournament={isTeamTournament}
                />
              ) : (
                <ul className="space-y-2">
                  {participants.map((p) => {
                    const participant: ParticipantData = isTeamTournament
                      ? { team: p.team }
                      : {
                          user: p.user,
                          placeholderMember: p.placeholderParticipant,
                        };
                    return (
                      <li key={p.id} className="flex items-center gap-2">
                        <ParticipantDisplay
                          participant={participant}
                          showAvatar
                          size="sm"
                        />
                        {!isTeamTournament &&
                          (p.team.color ? (
                            <TeamColorBadge
                              name={p.team.name}
                              color={p.team.color}
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              ({p.team.name})
                            </span>
                          ))}
                        {p.seed != null && (
                          <span className="text-muted-foreground text-sm">
                            Seed #{p.seed}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {participants.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No participants yet.
                    </p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <DraftEventActions
              tournamentId={tournamentId}
              eventId={eventId}
              participantCount={participants.length}
            />
          )}
        </>
      )}

      {(tournament.status === TournamentStatus.IN_PROGRESS ||
        tournament.status === TournamentStatus.COMPLETED) &&
        bracket &&
        bracket.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <EventTournamentBracketView
                bracket={bracket}
                totalRounds={tournament.totalRounds ?? 0}
                canManage={canManage}
                canRecordMatches={
                  canManage &&
                  tournament.status === TournamentStatus.IN_PROGRESS
                }
                eventId={eventId}
                tournamentId={tournamentId}
                isTeamTournament={isTeamTournament}
                config={
                  tournament.gameType.category === GameCategory.HEAD_TO_HEAD
                    ? parseH2HConfig(tournament.gameType.config)
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )}
    </div>
  );
}
