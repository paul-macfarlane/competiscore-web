import { AtLimitMessage } from "@/components/at-limit-message";
import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { getLeagueGameTypeLimitInfo } from "@/lib/server/limits";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateGameTypeForm } from "./create-game-type-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

function CreateGameTypeSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-2 h-5 w-64" />
      </div>
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function CreateGameTypeContent({ leagueId }: { leagueId: string }) {
  const limitInfo = await getLeagueGameTypeLimitInfo(leagueId);

  if (limitInfo.isAtLimit) {
    return (
      <div className="space-y-4 md:space-y-6">
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Game Types", href: `/leagues/${leagueId}/game-types` },
            { label: "Create Game Type" },
          ]}
        />
        <div className="text-center">
          <h1 className="text-xl font-bold md:text-2xl">Create a Game Type</h1>
        </div>
        <AtLimitMessage
          title="Game type limit reached"
          description={`This league has reached the maximum of ${limitInfo.max} game types.`}
        />
        <Button variant="outline" asChild className="w-full">
          <Link href={`/leagues/${leagueId}/game-types`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to game types
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Game Types", href: `/leagues/${leagueId}/game-types` },
          { label: "Create Game Type" },
        ]}
      />
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Create a Game Type</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set up a new game type to start recording matches
        </p>
      </div>
      <CreateGameTypeForm leagueId={leagueId} />
    </div>
  );
}

export default async function NewGameTypePage({ params }: PageProps) {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <Suspense fallback={<CreateGameTypeSkeleton />}>
      <CreateGameTypeContent leagueId={leagueId} />
    </Suspense>
  );
}
