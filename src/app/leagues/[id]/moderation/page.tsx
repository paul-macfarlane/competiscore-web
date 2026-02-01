import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeagueMembers } from "@/db/league-members";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import {
  getOwnModerationHistory,
  getOwnSubmittedReports,
  getPendingReports,
  getSuspendedMembers,
} from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, FileText, Flag, Shield } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MyReportCard } from "./my-report-card";
import { ReportsList } from "./reports-list";
import { SubmitReportDialog } from "./submit-report-dialog";
import { SuspendedMembersList } from "./suspended-members-list";

interface ModerationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ModerationPage({ params }: ModerationPageProps) {
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${id}` },
            { label: "Moderation" },
          ]}
        />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Moderation</h1>
        <p className="text-muted-foreground text-sm">
          Manage reports, warnings, and moderation actions
        </p>
      </div>
      <Suspense fallback={<ModerationSkeleton />}>
        <ModerationContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function ModerationContent({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const leagueResult = await getLeagueWithRole(leagueId, userId);
  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const canViewReports = canPerformAction(
    leagueResult.data.role,
    LeagueAction.VIEW_REPORTS,
  );

  const [myReportsResult, myHistoryResult] = await Promise.all([
    getOwnSubmittedReports(userId, leagueId),
    getOwnModerationHistory(userId, leagueId),
  ]);

  const myReports = myReportsResult.data ?? [];
  const myHistory = myHistoryResult.data ?? {
    warnings: [],
    suspendedUntil: null,
  };

  const members = await getLeagueMembers(leagueId);
  const filteredMembers = members.filter((m) => m.userId !== userId);

  if (canViewReports) {
    const [reportsResult, suspendedResult] = await Promise.all([
      getPendingReports(userId, leagueId),
      getSuspendedMembers(userId, leagueId),
    ]);

    const reports = reportsResult.data ?? [];
    const suspendedMembers = suspendedResult.data ?? [];

    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <SubmitReportDialog leagueId={leagueId} members={filteredMembers} />
        </div>
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending
              {reports.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {reports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="my-reports">My Reports</TabsTrigger>
            <TabsTrigger value="my-warnings">My Warnings</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Pending Reports
                  {reports.length > 0 && (
                    <Badge variant="destructive">{reports.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportsList reports={reports} leagueId={leagueId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suspended" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Suspended Members
                  {suspendedMembers.length > 0 && (
                    <Badge variant="secondary">{suspendedMembers.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SuspendedMembersList
                  members={suspendedMembers}
                  leagueId={leagueId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-reports" className="space-y-6">
            <MyReportsTab reports={myReports} leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="my-warnings" className="space-y-6">
            <MyWarningsTab history={myHistory} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SubmitReportDialog leagueId={leagueId} members={filteredMembers} />
      </div>
      <Tabs defaultValue="my-reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-reports">My Reports</TabsTrigger>
          <TabsTrigger value="my-warnings">My Warnings</TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports" className="space-y-6">
          <MyReportsTab reports={myReports} leagueId={leagueId} />
        </TabsContent>

        <TabsContent value="my-warnings" className="space-y-6">
          <MyWarningsTab history={myHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MyReportsTab({
  reports,
  leagueId,
}: {
  reports: Awaited<ReturnType<typeof getOwnSubmittedReports>>["data"];
  leagueId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          My Submitted Reports
          {reports && reports.length > 0 && (
            <Badge variant="secondary">{reports.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!reports || reports.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              You haven&apos;t submitted any reports in this league.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <MyReportCard
                key={report.id}
                report={report}
                leagueId={leagueId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyWarningsTab({
  history,
}: {
  history: Awaited<ReturnType<typeof getOwnModerationHistory>>["data"];
}) {
  if (!history) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Unable to load your moderation history.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { warnings, suspendedUntil } = history;

  return (
    <div className="space-y-6">
      {suspendedUntil && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              You are currently suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your suspension ends{" "}
              <span className="font-medium text-foreground">
                {formatDistanceToNow(suspendedUntil, { addSuffix: true })}
              </span>{" "}
              ({format(suspendedUntil, "PPp")}).
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              While suspended, you cannot participate in games or report other
              members.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            My Warnings
            {warnings.length > 0 && (
              <Badge variant="secondary">{warnings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              You have no warnings. Keep up the good sportsmanship!
            </p>
          ) : (
            <div className="space-y-3">
              {warnings.map((warning) => (
                <div
                  key={warning.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Warning</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {warning.reason}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3" />
                      {format(new Date(warning.createdAt), "PPp")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ModerationSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
