import { AtLimitMessage } from "@/components/at-limit-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { getUserLeagueLimitInfo } from "@/lib/server/limits";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateLeagueForm } from "./create-league-form";

function CreateLeagueSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
      <div className="text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-2 h-5 w-64" />
      </div>
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function CreateLeagueContent({ userId }: { userId: string }) {
  const limitInfo = await getUserLeagueLimitInfo(userId);

  if (limitInfo.isAtLimit) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold md:text-2xl">Create a League</h1>
        </div>
        <AtLimitMessage
          title="League limit reached"
          description={`You've reached the maximum of ${limitInfo.max} leagues.`}
        />
        <Button variant="outline" asChild className="w-full">
          <Link href="/leagues">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to leagues
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Create a League</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set up a new league to start tracking competitions
        </p>
      </div>
      <CreateLeagueForm />
    </div>
  );
}

export default async function NewLeaguePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <Suspense fallback={<CreateLeagueSkeleton />}>
      <CreateLeagueContent userId={session.user.id} />
    </Suspense>
  );
}
