import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { LocalDateTime } from "@/components/local-date-time";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import {
  MATCH_RESULT_LABELS,
  MatchResult,
  MatchStatus,
} from "@/lib/shared/constants";
import { getScoreDescription } from "@/lib/shared/game-config-parser";
import { getResultBadgeClasses } from "@/lib/shared/match-styles";
import { EventAction, canPerformEventAction } from "@/lib/shared/permissions";
import { cn } from "@/lib/shared/utils";
import { getEventMatch } from "@/services/event-leaderboards";
import { getEvent } from "@/services/events";
import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteEventMatchButton } from "./delete-event-match-button";

type PageProps = {
  params: Promise<{ id: string; matchId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, matchId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Match Details" };

  const result = await getEventMatch(session.user.id, matchId);
  if (!result.data) return { title: "Match Details" };

  const eventResult = await getEvent(session.user.id, id);
  const eventName = eventResult.data?.name ?? "Event";

  return {
    title: `Match Details - ${eventName}`,
    description: `Match details for ${eventName}`,
  };
}

export default async function EventMatchDetailPage({ params }: PageProps) {
  const { id: eventId, matchId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [matchResult, eventResult] = await Promise.all([
    getEventMatch(session.user.id, matchId),
    getEvent(session.user.id, eventId),
  ]);

  if (matchResult.error || !matchResult.data) notFound();
  if (eventResult.error || !eventResult.data) notFound();

  const match = matchResult.data;
  const event = eventResult.data;

  const side1 = match.participants.filter((p) => p.side === 1);
  const side2 = match.participants.filter((p) => p.side === 2);
  const isH2H = side1.length > 0 && side2.length > 0;
  const isFFA = match.participants.some((p) => p.rank !== null);
  const scoreLabel = match.gameType?.config
    ? getScoreDescription(match.gameType.config, match.gameType.category)
    : undefined;

  const pointsByTeam = new Map<string, number>();
  for (const pe of match.pointEntries) {
    if (pe.eventTeamId) {
      pointsByTeam.set(
        pe.eventTeamId,
        (pointsByTeam.get(pe.eventTeamId) ?? 0) + pe.points,
      );
    }
  }

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Matches", href: `/events/${eventId}/matches` },
          { label: "Match Details" },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Match Details</h1>
          <p className="text-muted-foreground mt-1">
            <LocalDateTime
              date={match.playedAt}
              formatString="MMMM d, yyyy 'at' h:mm a"
            />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">
            {MatchStatus.COMPLETED === "completed"
              ? "Completed"
              : match.eventId}
          </Badge>
          {canPerformEventAction(event.role, EventAction.RECORD_MATCHES) && (
            <DeleteEventMatchButton matchId={matchId} eventId={eventId} />
          )}
        </div>
      </div>

      {isH2H && (
        <Card>
          <CardHeader>
            <CardTitle>Match Result</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop: horizontal layout */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Side 1
                </h3>
                <div className="space-y-2">
                  {side1.map((p) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      points={
                        p.eventTeamId
                          ? (pointsByTeam.get(p.eventTeamId) ?? null)
                          : null
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="text-center shrink-0">
                {side1[0]?.score !== null && side2[0]?.score !== null ? (
                  <div>
                    <div className="text-3xl font-extrabold tabular-nums tracking-tight">
                      {side1[0].score} - {side2[0].score}
                    </div>
                    {scoreLabel && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {scoreLabel}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-lg font-medium text-muted-foreground uppercase tracking-wider">
                    vs
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 text-right">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Side 2
                </h3>
                <div className="space-y-2">
                  {side2.map((p) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      align="right"
                      points={
                        p.eventTeamId
                          ? (pointsByTeam.get(p.eventTeamId) ?? null)
                          : null
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: vertical with inline scores */}
            <div className="sm:hidden space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {side1.map((p) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      points={
                        p.eventTeamId
                          ? (pointsByTeam.get(p.eventTeamId) ?? null)
                          : null
                      }
                    />
                  ))}
                </div>
                {side1[0]?.score !== null && (
                  <span className="text-xl font-bold tabular-nums shrink-0">
                    {side1[0].score}
                    {scoreLabel && (
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        {scoreLabel}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {side2.map((p) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      points={
                        p.eventTeamId
                          ? (pointsByTeam.get(p.eventTeamId) ?? null)
                          : null
                      }
                    />
                  ))}
                </div>
                {side2[0]?.score !== null && (
                  <span className="text-xl font-bold tabular-nums shrink-0">
                    {side2[0].score}
                    {scoreLabel && (
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        {scoreLabel}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isFFA && (
        <Card>
          <CardHeader>
            <CardTitle>Final Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {match.participants
                .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                .map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 py-2 border-b last:border-b-0"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold",
                        index === 0 && "bg-rank-gold-bg text-rank-gold-text",
                        index === 1 &&
                          "bg-rank-silver-bg text-rank-silver-text",
                        index === 2 &&
                          "bg-rank-bronze-bg text-rank-bronze-text",
                        index > 2 && "bg-muted text-muted-foreground",
                      )}
                    >
                      {p.rank || index + 1}
                    </div>
                    <ParticipantRow
                      participant={p}
                      showResult={false}
                      points={
                        p.eventTeamId
                          ? (pointsByTeam.get(p.eventTeamId) ?? null)
                          : null
                      }
                    />
                    <div className="ml-auto flex items-center gap-2">
                      {p.score !== null && (
                        <span className="font-medium">
                          {p.score}
                          {scoreLabel && (
                            <span className="text-xs text-muted-foreground font-normal ml-1">
                              {scoreLabel}
                            </span>
                          )}
                        </span>
                      )}
                      {p.eventTeamId && pointsByTeam.has(p.eventTeamId) && (
                        <span className="text-sm text-muted-foreground">
                          +{pointsByTeam.get(p.eventTeamId)} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Match Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Game Type</span>
            <span className="font-medium">
              {match.gameType?.name ?? "Unknown"}
            </span>
          </div>
          {match.tournament && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Tournament</span>
              <div className="text-right">
                <Link
                  href={`/events/${eventId}/tournaments/${match.tournament.tournamentId}`}
                  className="font-medium underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground inline-flex items-center gap-1"
                >
                  {match.tournament.tournamentLogo ? (
                    <div className="relative h-3 w-3 shrink-0">
                      <Image
                        src={match.tournament.tournamentLogo}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <Trophy className="h-3 w-3 shrink-0" />
                  )}
                  {match.tournament.tournamentName}
                </Link>
                {match.tournament.totalRounds && (
                  <span className="text-muted-foreground text-xs ml-1">
                    (Round {match.tournament.round} of{" "}
                    {match.tournament.totalRounds})
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Played At</span>
            <span className="font-medium">
              <LocalDateTime
                date={match.playedAt}
                formatString="MMM d, yyyy h:mm a"
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recorded At</span>
            <span className="font-medium">
              <LocalDateTime
                date={match.createdAt}
                formatString="MMM d, yyyy h:mm a"
              />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type ParticipantRowProps = {
  participant: {
    id: string;
    result: string | null;
    user: {
      id: string;
      name: string;
      username: string;
      image: string | null;
    } | null;
    placeholderParticipant: { id: string; displayName: string } | null;
    team: {
      id: string;
      name: string;
      logo: string | null;
      color: string | null;
    } | null;
  };
  align?: "left" | "right";
  showResult?: boolean;
  points?: number | null;
};

function ParticipantRow({
  participant,
  align = "left",
  showResult = true,
  points,
}: ParticipantRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 min-w-0",
        align === "right" && "sm:flex-row-reverse",
      )}
    >
      <div className="flex-1 min-w-0">
        <ParticipantDisplay
          participant={
            {
              user: participant.user,
              team: participant.team,
              placeholderMember: participant.placeholderParticipant,
            } as ParticipantData
          }
          showAvatar
          showUsername
          teamName={
            participant.user || participant.placeholderParticipant
              ? participant.team?.name
              : undefined
          }
          teamColor={
            participant.user || participant.placeholderParticipant
              ? participant.team?.color
              : undefined
          }
          size="lg"
          align={align}
        />
      </div>
      {points != null && (
        <span className="text-sm text-muted-foreground shrink-0">
          +{points} pts
        </span>
      )}
      {participant.result && showResult && (
        <Badge
          variant="outline"
          className={cn("shrink-0", getResultBadgeClasses(participant.result))}
        >
          {MATCH_RESULT_LABELS[participant.result as MatchResult]}
        </Badge>
      )}
    </div>
  );
}
