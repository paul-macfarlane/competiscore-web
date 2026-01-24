import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { LeagueMemberRole } from "@/lib/constants";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import { getExecutiveCount, getLeagueWithRole } from "@/services/leagues";
import {
  getOwnReportCount,
  getOwnWarningCount,
  getPendingReportCount,
} from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  FileText,
  Flag,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LeaveLeagueButton } from "./leave-league-button";

interface LeagueDashboardPageProps {
  params: Promise<{ id: string }>;
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
            <div className="flex items-center gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/leagues/${leagueId}/members`} className="block h-full">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{league.memberCount}</div>
              <p className="text-muted-foreground text-xs">
                {league.memberCount === 1 ? "member" : "active members"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{league.role}</div>
            <p className="text-muted-foreground text-xs">
              {league.role === "executive"
                ? "Full access"
                : league.role === "manager"
                  ? "Can manage games"
                  : "Can play games"}
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Played</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-2xl font-bold">—</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
          </CardContent>
        </Card>

        {canViewReports && (
          <Link
            href={`/leagues/${leagueId}/moderation`}
            className="block h-full"
          >
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Moderation
                </CardTitle>
                <Flag className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {pendingReportCount}
                  {pendingReportCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {pendingReportCount === 1 ? "report" : "reports"} to review
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href={`/leagues/${leagueId}/my-reports`} className="block h-full">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Reports</CardTitle>
              <FileText className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ownReportCount}</div>
              <p className="text-muted-foreground text-xs">
                {ownReportCount === 1 ? "report" : "reports"} submitted
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link
          href={`/leagues/${leagueId}/my-warnings`}
          className="block h-full"
        >
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Warnings</CardTitle>
              <AlertTriangle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ownWarningCount}</div>
              <p className="text-muted-foreground text-xs">
                {ownWarningCount === 1 ? "warning" : "warnings"} received
              </p>
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
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
