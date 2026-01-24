import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeagueMemberWithUser } from "@/db/league-members";
import { auth } from "@/lib/auth";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { idParamSchema } from "@/validators/shared";
import { Flag } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import z from "zod";

import { ReportForm } from "./report-form";

interface ReportMemberPageProps {
  params: Promise<{ id: string; memberId: string }>;
}

const paramsSchema = idParamSchema.extend({
  memberId: z.string(),
});

export default async function ReportMemberPage({
  params,
}: ReportMemberPageProps) {
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

  const { id: leagueId, memberId } = parsed.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/leagues/${leagueId}/members`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to members
        </Link>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Report Member</h1>
        <p className="text-muted-foreground text-sm">
          Submit a report against a league member
        </p>
      </div>
      <Suspense fallback={<ReportFormSkeleton />}>
        <ReportFormContent
          leagueId={leagueId}
          memberId={memberId}
          userId={session.user.id}
        />
      </Suspense>
    </div>
  );
}

async function ReportFormContent({
  leagueId,
  memberId,
  userId,
}: {
  leagueId: string;
  memberId: string;
  userId: string;
}) {
  const leagueResult = await getLeagueWithRole(leagueId, userId);
  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const canReport = canPerformAction(
    leagueResult.data.role,
    LeagueAction.REPORT_MEMBER,
  );
  if (!canReport) {
    notFound();
  }

  if (memberId === userId) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">You cannot report yourself.</p>
          <Link
            href={`/leagues/${leagueId}/members`}
            className="text-primary hover:underline text-sm mt-4 inline-block"
          >
            Back to members
          </Link>
        </CardContent>
      </Card>
    );
  }

  const member = await getLeagueMemberWithUser(memberId, leagueId);
  if (!member) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            This user is not a member of the league.
          </p>
          <Link
            href={`/leagues/${leagueId}/members`}
            className="text-primary hover:underline text-sm mt-4 inline-block"
          >
            Back to members
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Report {member.user.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReportForm leagueId={leagueId} member={member} />
      </CardContent>
    </Card>
  );
}

function ReportFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
