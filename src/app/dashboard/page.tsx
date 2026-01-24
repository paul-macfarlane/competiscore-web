import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageIndicator } from "@/components/usage-indicator";
import { auth } from "@/lib/server/auth";
import { getUserLeagueLimitInfo } from "@/lib/server/limits";
import { Swords, Trophy, Users } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Profile</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-xl font-bold md:text-2xl">
              {session.user.name}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {session.user.email}
            </p>
          </CardContent>
        </Card>
        <Suspense fallback={<LeagueCountSkeleton />}>
          <LeagueCountCard userId={session.user.id} />
        </Suspense>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Matches
            </CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold md:text-2xl">0</div>
            <p className="text-xs text-muted-foreground">
              No matches played yet
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function LeagueCountCard({ userId }: { userId: string }) {
  const limitInfo = await getUserLeagueLimitInfo(userId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Leagues</CardTitle>
        <Trophy className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xl font-bold md:text-2xl">{limitInfo.current}</div>
        <UsageIndicator
          current={limitInfo.current}
          max={limitInfo.max}
          label={
            limitInfo.current === 0
              ? "Join a league to get started"
              : "league memberships"
          }
          showProgressBar={limitInfo.max !== null}
        />
      </CardContent>
    </Card>
  );
}

function LeagueCountSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Leagues</CardTitle>
        <Trophy className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-8" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
  );
}
