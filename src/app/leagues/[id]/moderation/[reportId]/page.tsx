import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { getInitials } from "@/lib/client-utils";
import {
  MODERATION_ACTION_LABELS,
  ModerationActionType,
  REPORT_REASON_LABELS,
  ReportReason,
} from "@/lib/constants";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { getReportDetail } from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { format } from "date-fns";
import { AlertTriangle, Clock, FileText, History, Shield } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ModerationActionForm } from "./moderation-action-form";

interface ReportDetailPageProps {
  params: Promise<{ id: string; reportId: string }>;
}

const paramsSchema = idParamSchema.extend({
  reportId: idParamSchema.shape.id,
});

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    notFound();
  }

  const { id: leagueId, reportId } = parsed.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}/moderation`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to moderation
        </Link>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Report Details</h1>
        <p className="text-muted-foreground text-sm">
          Review the report and take appropriate action
        </p>
      </div>
      <Suspense fallback={<ReportDetailSkeleton />}>
        <ReportDetailContent
          leagueId={leagueId}
          reportId={reportId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function ReportDetailContent({
  leagueId,
  reportId,
  userId,
}: {
  leagueId: string;
  reportId: string;
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

  const detailResult = await getReportDetail(userId, reportId);
  if (detailResult.error || !detailResult.data) {
    notFound();
  }

  const { report, targetHistory } = detailResult.data;
  const isResolved = report.status === "resolved";
  const canModerate = canPerformAction(
    leagueResult.data.role,
    LeagueAction.MODERATE_MEMBERS,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Information
            {isResolved && <Badge variant="secondary">Resolved</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Reported Member
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={report.reportedUser.image ?? undefined} />
                  <AvatarFallback>
                    {getInitials(report.reportedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{report.reportedUser.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @{report.reportedUser.username}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reporter</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={report.reporter.image ?? undefined} />
                  <AvatarFallback>
                    {getInitials(report.reporter.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{report.reporter.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @{report.reporter.username}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Reason</p>
            <Badge>{REPORT_REASON_LABELS[report.reason as ReportReason]}</Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Submitted</p>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" />
              {format(new Date(report.createdAt), "PPpp")}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
              {report.description}
            </p>
          </div>

          {report.evidence && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Evidence</p>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {report.evidence}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {targetHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Previous Actions Against This Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {targetHistory.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          action.action === ModerationActionType.WARNED
                            ? "secondary"
                            : action.action === ModerationActionType.SUSPENDED
                              ? "destructive"
                              : action.action === ModerationActionType.REMOVED
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {
                          MODERATION_ACTION_LABELS[
                            action.action as ModerationActionType
                          ]
                        }
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        by {action.moderator.name}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{action.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(action.createdAt), "PPp")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isResolved && canModerate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Take Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ModerationActionForm reportId={reportId} leagueId={leagueId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
