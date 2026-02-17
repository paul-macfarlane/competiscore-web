import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsageIndicator } from "@/components/usage-indicator";
import { auth } from "@/lib/server/auth";
import { getUserLeagueLimitInfo } from "@/lib/server/limits";
import { getArchivedLeagues } from "@/services/leagues";
import { Archive, Plus, Search } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LeaguesList } from "./leagues-list";
import { LeaguesSkeleton } from "./leagues-skeleton";

export default async function LeaguesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Your Leagues</h1>
          <p className="text-muted-foreground text-sm">
            Manage and view your leagues
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/leagues/search">
              <Search className="mr-1 h-4 w-4" />
              Find
            </Link>
          </Button>
          <Suspense fallback={<Skeleton className="h-8 w-20" />}>
            <CreateLeagueButton userId={session.user.id} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-4 w-32" />}>
        <LeagueUsageIndicator userId={session.user.id} />
      </Suspense>
      <Suspense fallback={<LeaguesSkeleton />}>
        <LeaguesList userId={session.user.id} />
      </Suspense>
      <Suspense fallback={null}>
        <ArchivedLeaguesLink userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function CreateLeagueButton({ userId }: { userId: string }) {
  const limitInfo = await getUserLeagueLimitInfo(userId);

  if (limitInfo.isAtLimit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button size="sm" disabled>
                <Plus className="mr-1 h-4 w-4" />
                Create
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>You&apos;ve reached the limit of {limitInfo.max} leagues</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button size="sm" asChild>
      <Link href="/leagues/new">
        <Plus className="mr-1 h-4 w-4" />
        Create
      </Link>
    </Button>
  );
}

async function LeagueUsageIndicator({ userId }: { userId: string }) {
  const limitInfo = await getUserLeagueLimitInfo(userId);
  if (limitInfo.max === null) {
    return null;
  }

  return (
    <UsageIndicator
      current={limitInfo.current}
      max={limitInfo.max}
      label="Leagues used"
      showProgressBar={false}
    />
  );
}

async function ArchivedLeaguesLink({ userId }: { userId: string }) {
  const result = await getArchivedLeagues(userId);
  if (result.error || !result.data || result.data.length === 0) {
    return null;
  }

  return (
    <div className="border-t pt-4">
      <Link
        href="/leagues/archived"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <Archive className="h-4 w-4" />
        View {result.data.length} archived{" "}
        {result.data.length === 1 ? "league" : "leagues"}
      </Link>
    </div>
  );
}
