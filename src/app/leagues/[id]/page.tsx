import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageIndicator } from "@/components/usage-indicator";
import { auth } from "@/lib/server/auth";
import {
  getLeagueGameTypeLimitInfo,
  getLeagueMemberLimitInfo,
} from "@/lib/server/limits";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getExecutiveCount, getLeagueWithRole } from "@/services/leagues";
import {
  getOwnReportCount,
  getOwnWarningCount,
  getPendingReportCount,
} from "@/services/moderation";
import { getLeagueTeams } from "@/services/teams";
import { idParamSchema } from "@/validators/shared";
import { format, formatDistanceToNow } from "date-fns";
import {
  Flag,
  Gamepad2,
  Settings,
  Shield,
  Users,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LeaveLeagueButton } from "./leave-league-button";

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
    <div className="mx-auto max-w-4xl space-y-6">
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
  const canViewReports = canPerformAction(
    league.role,
    LeagueAction.VIEW_REPORTS,
  );

  let pendingReportCount = 0;
  if (canViewReports) {
    const reportCountResult = await getPendingReportCount(userId, leagueId);
    pendingReportCount = reportCountResult.data ?? 0;
  }

  const ownReportCountResult = await getOwnReportCount(userId, leagueId);
  const ownReportCount = ownReportCountResult.data ?? 0;

  const ownWarningCountResult = await getOwnWarningCount(userId, leagueId);
  const ownWarningCount = ownWarningCountResult.data ?? 0;

  const memberLimitInfo = await getLeagueMemberLimitInfo(leagueId);

  const isSuspended =
    league.suspendedUntil && league.suspendedUntil > new Date();

  return (
    <>
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
              <h1 className="truncate text-xl font-bold md:text-2xl">
                {league.name}
              </h1>
              <Badge
                variant={
                  league.visibility === "public" ? "secondary" : "outline"
                }
              >
                {league.visibility === "public" ? "Public" : "Private"}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {league.role}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {league.description}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isExecutive && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/leagues/${leagueId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          <LeaveLeagueButton
            leagueId={leagueId}
            isSoleExecutive={isSoleExecutive}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<Skeleton className="h-32" />}>
          <GameTypesCard leagueId={leagueId} />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-32" />}>
          <TeamsCard leagueId={leagueId} userId={userId} />
        </Suspense>

        <Link href={`/leagues/${leagueId}/members`} className="block h-full">
          <Card className="hover:bg-muted hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">{league.memberCount}</div>
              <UsageIndicator
                current={memberLimitInfo.current}
                max={memberLimitInfo.max}
                label="capacity"
                showProgressBar={memberLimitInfo.max !== null}
              />
            </CardContent>
          </Card>
        </Link>

        <Link href={`/leagues/${leagueId}/moderation`} className="block h-full">
          <Card className="hover:bg-muted hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moderation</CardTitle>
              <Flag className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent className="space-y-2">
              {canViewReports && pendingReportCount > 0 ? (
                <>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {pendingReportCount}
                    <Badge variant="destructive" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {pendingReportCount === 1 ? "report" : "reports"} to review
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {ownReportCount + ownWarningCount}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {ownReportCount}{" "}
                    {ownReportCount === 1 ? "report" : "reports"},{" "}
                    {ownWarningCount}{" "}
                    {ownWarningCount === 1 ? "warning" : "warnings"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No activity yet. Start by creating game types and recording matches!
          </p>
        </CardContent>
      </Card>
    </>
  );
}

async function GameTypesCard({ leagueId }: { leagueId: string }) {
  const gameTypeLimitInfo = await getLeagueGameTypeLimitInfo(leagueId);

  return (
    <Link href={`/leagues/${leagueId}/game-types`} className="block h-full">
      <Card className="hover:bg-muted hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Game Types</CardTitle>
          <Gamepad2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{gameTypeLimitInfo.current}</div>
          <UsageIndicator
            current={gameTypeLimitInfo.current}
            max={gameTypeLimitInfo.max}
            label="game types"
            showProgressBar={gameTypeLimitInfo.max !== null}
          />
        </CardContent>
      </Card>
    </Link>
  );
}

async function TeamsCard({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const result = await getLeagueTeams(userId, leagueId);
  const teams = result.data || [];
  const activeTeams = teams.filter((t) => !t.isArchived);

  return (
    <Link href={`/leagues/${leagueId}/teams`} className="block h-full">
      <Card className="hover:bg-muted hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Teams</CardTitle>
          <UsersRound className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{activeTeams.length}</div>
          <p className="text-muted-foreground text-xs">
            {activeTeams.length === 1 ? "team" : "teams"} created
          </p>
        </CardContent>
      </Card>
    </Link>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="mt-1 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    </>
  );
}
