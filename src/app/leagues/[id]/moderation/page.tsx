import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { getPendingReports, getSuspendedMembers } from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { Flag, Shield } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ReportsList } from "./reports-list";
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
        <Link
          href={`/leagues/${id}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to league
        </Link>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Moderation</h1>
        <p className="text-muted-foreground text-sm">
          Review and take action on member reports
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
  if (!canViewReports) {
    notFound();
  }

  const reportsResult = await getPendingReports(userId, leagueId);
  const reports = reportsResult.data ?? [];

  const suspendedResult = await getSuspendedMembers(userId, leagueId);
  const suspendedMembers = suspendedResult.data ?? [];

  return (
    <div className="space-y-6">
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
