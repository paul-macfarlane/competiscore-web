import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { MatchCard } from "@/components/match-card";
import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { LeagueMemberRole, LeagueVisibility } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { ROLE_BADGE_VARIANTS, ROLE_LABELS } from "@/lib/shared/roles";
import { getLeagueGameTypes } from "@/services/game-types";
import { getExecutiveCount, getLeagueWithRole } from "@/services/leagues";
import {
  HighScoreActivityItem,
  getLeagueActivityPaginated,
} from "@/services/matches";
import { idParamSchema } from "@/validators/shared";
import { format, formatDistanceToNow } from "date-fns";
import { Shield, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LeaveLeagueButton } from "./leave-league-button";
import { QuickActions } from "./quick-actions";

interface LeagueDashboardPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: LeagueDashboardPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return {
      title: "League Not Found",
    };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return {
      title: "League",
    };
  }

  const result = await getLeagueWithRole(parsed.data.id, session.user.id);
  if (result.error || !result.data) {
    return {
      title: "League Not Found",
    };
  }

  return {
    title: result.data.name,
    description: result.data.description,
  };
}

export default async function LeagueDashboardPage({
  params,
}: LeagueDashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    notFound();
  }

  const { id } = parsed.data;

  return (
    <div className="space-y-6">
      <Suspense fallback={<LeagueDashboardSkeleton />}>
        <LeagueDashboardContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function LeagueDashboardContent({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const result = await getLeagueWithRole(leagueId, userId);
  if (result.error || !result.data) {
    notFound();
  }

  const league = result.data;
  const isExecutive = league.role === LeagueMemberRole.EXECUTIVE;
  const executiveCount = await getExecutiveCount(leagueId);
  const isSoleExecutive = isExecutive && executiveCount <= 1;
  const canPlay = canPerformAction(league.role, LeagueAction.PLAY_GAMES);

  const isSuspended =
    league.suspendedUntil && league.suspendedUntil > new Date();

  const [gameTypesResult] = await Promise.all([
    getLeagueGameTypes(userId, leagueId),
  ]);

  const allGameTypes = gameTypesResult.data ?? [];
  const activeGameTypes = allGameTypes.filter((gt) => !gt.isArchived);

  return (
    <>
      <LeagueBreadcrumb items={[{ label: league.name }]} />

      {isSuspended && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Shield className="h-6 w-6 text-destructive shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-destructive">
                Your membership is suspended
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your suspension ends{" "}
                <span className="font-medium text-foreground">
                  {formatDistanceToNow(league.suspendedUntil!, {
                    addSuffix: true,
                  })}
                </span>{" "}
                ({format(league.suspendedUntil!, "PPp")}).
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                While suspended, you cannot participate in games or report other
                members.{" "}
                <Link
                  href={`/leagues/${leagueId}/my-warnings`}
                  className="text-primary hover:underline"
                >
                  View details
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-4 min-w-0">
          {league.logo && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image
                src={league.logo}
                alt={league.name}
                fill
                className="object-cover p-1"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold md:text-3xl">
                {league.name}
              </h1>
              <Badge
                variant={
                  league.visibility === LeagueVisibility.PUBLIC
                    ? "secondary"
                    : "outline"
                }
              >
                Visibility:{" "}
                {league.visibility === LeagueVisibility.PUBLIC
                  ? "Public"
                  : "Private"}
              </Badge>
              <Badge
                variant={ROLE_BADGE_VARIANTS[league.role]}
                className="capitalize"
              >
                Role: {ROLE_LABELS[league.role]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {league.description}
            </p>
          </div>
        </div>
        <LeaveLeagueButton
          leagueId={leagueId}
          isSoleExecutive={isSoleExecutive}
        />
      </div>

      {canPlay && !isSuspended && activeGameTypes.length > 0 && (
        <QuickActions leagueId={leagueId} gameTypes={activeGameTypes} />
      )}

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <CardTitle>Recent Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            </CardContent>
          </Card>
        }
      >
        <RecentMatchesSection leagueId={leagueId} userId={userId} />
      </Suspense>
    </>
  );
}

async function RecentMatchesSection({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const activityResult = await getLeagueActivityPaginated(userId, leagueId, {
    limit: 5,
  });

  const items = activityResult.data?.items ?? [];
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No activity yet. Start by recording matches or submitting scores!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Matches</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/leagues/${leagueId}/matches`}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {items.map((item) =>
            item.type === "match" ? (
              <MatchCard
                key={item.id}
                matchId={item.id}
                leagueId={leagueId}
                gameTypeName={item.gameType?.name}
                playedAt={item.playedAt}
                status={item.status}
                participants={item.participants}
                tournament={item.tournament}
                variant="compact"
              />
            ) : (
              <HighScoreActivityCard key={item.id} highScore={item} />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HighScoreActivityCard({
  highScore,
}: {
  highScore: HighScoreActivityItem;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">
            {highScore.gameType?.name || "High Score"}
          </span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            Score
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(highScore.achievedAt), {
            addSuffix: true,
          })}
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <ParticipantDisplay
              participant={highScore.participant as ParticipantData}
              showAvatar
              showUsername
              size="sm"
            />
          </div>
          <span className="text-xl font-extrabold tabular-nums shrink-0">
            {highScore.score.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LeagueDashboardSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <Skeleton className="h-10 w-64" />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
