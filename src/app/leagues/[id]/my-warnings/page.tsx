import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { getLeagueWithRole } from "@/services/leagues";
import { getOwnModerationHistory } from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, Shield } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface MyWarningsPageProps {
  params: Promise<{ id: string }>;
}

export default async function MyWarningsPage({ params }: MyWarningsPageProps) {
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
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${id}` },
          { label: "My Warnings" },
        ]}
      />
      <div>
        <h1 className="text-xl font-bold md:text-2xl">My Warnings</h1>
        <p className="text-muted-foreground text-sm">
          View your moderation history in this league
        </p>
      </div>
      <Suspense fallback={<MyWarningsSkeleton />}>
        <MyWarningsContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function MyWarningsContent({
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

  const historyResult = await getOwnModerationHistory(userId, leagueId);
  if (historyResult.error || !historyResult.data) {
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

  const { warnings, suspendedUntil } = historyResult.data;

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
            Warnings
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

function MyWarningsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <Skeleton className="h-5 w-5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
