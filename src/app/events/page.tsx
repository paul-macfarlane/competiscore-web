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
import { getUserEventLimitInfo } from "@/lib/server/limits";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EventsList } from "./events-list";
import { EventsSkeleton } from "./events-skeleton";

export const metadata: Metadata = {
  title: "Your Events",
  description: "Manage and view your events",
};

export default async function EventsPage() {
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
          <h1 className="text-xl font-bold md:text-2xl">Your Events</h1>
          <p className="text-muted-foreground text-sm">
            Manage and view your events
          </p>
        </div>
        <div className="flex gap-2">
          <Suspense fallback={<Skeleton className="h-8 w-20" />}>
            <CreateEventButton userId={session.user.id} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-4 w-32" />}>
        <EventUsageIndicator userId={session.user.id} />
      </Suspense>
      <Suspense fallback={<EventsSkeleton />}>
        <EventsList userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function CreateEventButton({ userId }: { userId: string }) {
  const limitInfo = await getUserEventLimitInfo(userId);
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
            <p>You&apos;ve reached the limit of {limitInfo.max} events</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button size="sm" asChild>
      <Link href="/events/new">
        <Plus className="mr-1 h-4 w-4" />
        Create
      </Link>
    </Button>
  );
}

async function EventUsageIndicator({ userId }: { userId: string }) {
  const limitInfo = await getUserEventLimitInfo(userId);
  if (limitInfo.max === null) {
    return null;
  }

  return (
    <UsageIndicator
      current={limitInfo.current}
      max={limitInfo.max}
      label="Events used"
      showProgressBar={false}
    />
  );
}
