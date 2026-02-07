import { GameTypeCard } from "@/components/game-type-card";
import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsageIndicator } from "@/components/usage-indicator";
import { getLeagueMember } from "@/db/league-members";
import { auth } from "@/lib/server/auth";
import { getLeagueGameTypeLimitInfo } from "@/lib/server/limits";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueGameTypes } from "@/services/game-types";
import { Archive, Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ArchivedGameTypeCard } from "./archived-game-type-card";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GameTypesPage({ params }: PageProps) {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <LeagueBreadcrumb
            items={[
              { label: "League", href: `/leagues/${leagueId}` },
              { label: "Game Types" },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Game Types</h1>
          <p className="text-muted-foreground text-sm">
            Manage the games you compete in
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-9 w-24" />}>
          <CreateGameTypeButton userId={session.user.id} leagueId={leagueId} />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-4 w-32" />}>
        <GameTypeUsageIndicator leagueId={leagueId} />
      </Suspense>
      <Suspense fallback={<GameTypesSkeleton />}>
        <GameTypesList userId={session.user.id} leagueId={leagueId} />
      </Suspense>
    </div>
  );
}

async function CreateGameTypeButton({
  userId,
  leagueId,
}: {
  userId: string;
  leagueId: string;
}) {
  const membership = await getLeagueMember(userId, leagueId);
  if (
    !membership ||
    !canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES)
  ) {
    return null;
  }

  const limitInfo = await getLeagueGameTypeLimitInfo(leagueId);

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
            <p>
              This league has reached the limit of {limitInfo.max} game types
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button size="sm" asChild>
      <Link href={`/leagues/${leagueId}/game-types/new`}>
        <Plus className="mr-1 h-4 w-4" />
        Create
      </Link>
    </Button>
  );
}

async function GameTypeUsageIndicator({ leagueId }: { leagueId: string }) {
  const limitInfo = await getLeagueGameTypeLimitInfo(leagueId);

  return (
    <UsageIndicator
      current={limitInfo.current}
      max={limitInfo.max}
      label="game types"
    />
  );
}

async function GameTypesList({
  userId,
  leagueId,
}: {
  userId: string;
  leagueId: string;
}) {
  const [result, membership] = await Promise.all([
    getLeagueGameTypes(userId, leagueId),
    getLeagueMember(userId, leagueId),
  ]);

  if (result.error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const gameTypes = result.data || [];
  const activeGameTypes = gameTypes.filter((gt) => !gt.isArchived);
  const archivedGameTypes = gameTypes.filter((gt) => gt.isArchived);
  const canManage =
    membership &&
    canPerformAction(membership.role, LeagueAction.CREATE_GAME_TYPES);

  return (
    <div className="space-y-8">
      {activeGameTypes.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No game types yet</p>
            <p className="text-sm">
              Create your first game type to start tracking matches
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeGameTypes.map((gameType) => (
            <GameTypeCard
              key={gameType.id}
              gameType={gameType}
              leagueId={leagueId}
            />
          ))}
        </div>
      )}

      {canManage && archivedGameTypes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Archive className="h-5 w-5" />
              Archived Game Types
              <Badge variant="secondary">{archivedGameTypes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {archivedGameTypes.map((gameType) => (
                <ArchivedGameTypeCard
                  key={gameType.id}
                  gameType={gameType}
                  leagueId={leagueId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GameTypesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}
