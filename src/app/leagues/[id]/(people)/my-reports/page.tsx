import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/client/utils";
import { auth } from "@/lib/server/auth";
import { REPORT_REASON_LABELS, ReportStatus } from "@/lib/shared/constants";
import { getLeagueWithRole } from "@/services/leagues";
import { getOwnSubmittedReports } from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { format } from "date-fns";
import { Clock, FileText, Flag } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface MyReportsPageProps {
  params: Promise<{ id: string }>;
}

export default async function MyReportsPage({ params }: MyReportsPageProps) {
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
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${id}` },
          { label: "My Reports" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">My Reports</h1>
        <p className="text-muted-foreground text-sm">
          View reports you&apos;ve submitted in this league
        </p>
      </div>
      <Suspense fallback={<MyReportsSkeleton />}>
        <MyReportsContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function MyReportsContent({
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

  const reportsResult = await getOwnSubmittedReports(userId, leagueId);
  if (reportsResult.error || !reportsResult.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Unable to load your submitted reports.
          </p>
        </CardContent>
      </Card>
    );
  }

  const reports = reportsResult.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Submitted Reports
          {reports.length > 0 && (
            <Badge variant="secondary">{reports.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              You haven&apos;t submitted any reports in this league.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={report.reportedUser.image ?? undefined} />
                  <AvatarFallback>
                    {getInitials(report.reportedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {report.reportedUser.name}
                    </p>
                    <Badge
                      variant={
                        report.status === ReportStatus.PENDING
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {report.status === ReportStatus.PENDING
                        ? "Pending"
                        : "Resolved"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{report.reportedUser.username}
                  </p>
                  <p className="text-sm mt-2">
                    <span className="font-medium">Reason:</span>{" "}
                    {REPORT_REASON_LABELS[report.reason]}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    {format(new Date(report.createdAt), "PPp")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyReportsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
