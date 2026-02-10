import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { getEvent, getOrganizerCount } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ArchiveEventSection } from "./archive-event-section";
import { DeleteEventSection } from "./delete-event-section";
import { EventLifecycleActions } from "./event-lifecycle-actions";
import { EventSettingsForm } from "./event-settings-form";
import { LeaveEventSection } from "./leave-event-section";

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Settings" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Settings" };
  }

  return {
    title: `Settings - ${result.data.name}`,
    description: `Manage settings for ${result.data.name}`,
  };
}

export default async function EventSettingsPage({ params }: SettingsPageProps) {
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
    <div className="space-y-6">
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function SettingsContent({
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

  if (event.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${eventId}`);
  }

  const organizerCount = await getOrganizerCount(userId, eventId);
  const isSoleOrganizer =
    event.role === EventParticipantRole.ORGANIZER && organizerCount <= 1;

  return (
    <>
      <div>
        <LeagueBreadcrumb
          items={[
            { label: event.name, href: `/events/${eventId}` },
            { label: "Settings" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Event Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your event settings
        </p>
      </div>

      <div className="space-y-6">
        <EventSettingsForm event={event} />

        {(event.status === EventStatus.DRAFT ||
          event.status === EventStatus.ACTIVE) && (
          <EventLifecycleActions eventId={eventId} eventStatus={event.status} />
        )}

        <LeaveEventSection
          eventId={eventId}
          isSoleOrganizer={isSoleOrganizer}
        />

        <ArchiveEventSection eventId={eventId} isArchived={event.isArchived} />

        <DeleteEventSection eventId={eventId} eventName={event.name} />
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>
      <div className="space-y-4 rounded-lg border p-4 md:p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="rounded-lg border p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
    </div>
  );
}
