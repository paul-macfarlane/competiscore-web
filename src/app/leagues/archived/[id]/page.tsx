import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { getArchivedLeagueById } from "@/services/leagues";
import { idParamSchema } from "@/validators/shared";
import { Archive, Users } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { UnarchiveSection } from "./unarchive-section";

interface ArchivedLeagueDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArchivedLeagueDetailPage({
  params,
}: ArchivedLeagueDetailPageProps) {
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
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href="/leagues/archived"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to archived leagues
        </Link>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Archived League</h1>
        <p className="text-muted-foreground text-sm">
          View details and restore this league
        </p>
      </div>
      <Suspense fallback={<DetailSkeleton />}>
        <ArchivedLeagueDetail leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function ArchivedLeagueDetail({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const result = await getArchivedLeagueById(leagueId, userId);
  if (result.error || !result.data) {
    notFound();
  }

  const league = result.data;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 md:p-6">
        <div className="flex items-start gap-4">
          {league.logo && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image
                src={league.logo}
                alt={league.name}
                fill
                className="object-cover p-1"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate text-lg font-semibold">{league.name}</h2>
              <Badge variant="secondary" className="shrink-0">
                <Archive className="mr-1 h-3 w-3" />
                Archived
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {league.description}
            </p>
            <div className="text-muted-foreground mt-4 flex items-center gap-1 text-sm">
              <Users className="h-4 w-4" />
              <span>
                {league.memberCount}{" "}
                {league.memberCount === 1 ? "member" : "members"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <UnarchiveSection leagueId={leagueId} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 md:p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
    </div>
  );
}
