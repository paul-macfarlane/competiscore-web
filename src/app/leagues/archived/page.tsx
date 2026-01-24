import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ArchivedLeaguesList } from "./archived-leagues-list";

export default async function ArchivedLeaguesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/leagues"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to leagues
        </Link>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Archived Leagues</h1>
        <p className="text-muted-foreground text-sm">
          View and restore leagues you have archived
        </p>
      </div>
      <Suspense fallback={<ArchivedLeaguesSkeleton />}>
        <ArchivedLeaguesList userId={session.user.id} />
      </Suspense>
    </div>
  );
}

function ArchivedLeaguesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-4 md:p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
