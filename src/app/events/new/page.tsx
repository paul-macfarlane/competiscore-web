import { AtLimitMessage } from "@/components/at-limit-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { getUserEventLimitInfo } from "@/lib/server/limits";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateEventForm } from "./create-event-form";

export const metadata: Metadata = {
  title: "Create Event",
  description: "Create a new event",
};

function CreateEventSkeleton() {
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
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function CreateEventContent({ userId }: { userId: string }) {
  const limitInfo = await getUserEventLimitInfo(userId);

  if (limitInfo.isAtLimit) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold md:text-2xl">Create an Event</h1>
        </div>
        <AtLimitMessage
          title="Event limit reached"
          description={`You've reached the maximum of ${limitInfo.max} events.`}
        />
        <Button variant="outline" asChild className="w-full">
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to events
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Create an Event</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set up a new event to organize competitions
        </p>
      </div>
      <CreateEventForm />
    </div>
  );
}

export default async function NewEventPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <Suspense fallback={<CreateEventSkeleton />}>
      <CreateEventContent userId={session.user.id} />
    </Suspense>
  );
}
