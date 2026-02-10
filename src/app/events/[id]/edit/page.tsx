import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EditEventForm } from "./edit-event-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Edit Event" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Edit Event" };
  }

  return {
    title: `Edit - ${result.data.name}`,
    description: `Edit settings for ${result.data.name}`,
  };
}

function EditEventSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-2 h-5 w-64" />
      </div>
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function EditEventContent({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const result = await getEvent(userId, eventId);
  if (result.error || !result.data) {
    notFound();
  }

  const event = result.data;

  return (
    <div className="space-y-4 md:space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: event.name, href: `/events/${eventId}` },
          { label: "Settings", href: `/events/${eventId}/settings` },
          { label: "Edit" },
        ]}
      />
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Edit Event</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Update your event details
        </p>
      </div>
      <EditEventForm
        eventId={eventId}
        event={{
          name: event.name,
          description: event.description,
          logo: event.logo,
        }}
      />
    </div>
  );
}

export default async function EditEventPage({ params }: PageProps) {
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

  const eventResult = await getEvent(session.user.id, id);
  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  if (eventResult.data.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${id}`);
  }

  return (
    <Suspense fallback={<EditEventSkeleton />}>
      <EditEventContent eventId={id} userId={session.user.id} />
    </Suspense>
  );
}
