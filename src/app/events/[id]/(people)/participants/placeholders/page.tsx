import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/server/auth";
import { EventParticipantRole } from "@/lib/shared/constants";
import {
  checkEventPlaceholderActivity,
  getEventPlaceholders,
  getRetiredEventPlaceholders,
} from "@/services/event-placeholder-participants";
import { getEvent } from "@/services/events";
import { idParamSchema } from "@/validators/shared";
import { Archive, User, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateEventPlaceholderForm } from "../invite/create-event-placeholder-form";
import { EventPlaceholderCard } from "./event-placeholder-card";

interface PlaceholdersPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PlaceholdersPageProps): Promise<Metadata> {
  const rawParams = await params;
  const parsed = idParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { title: "Event Not Found" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return { title: "Placeholders" };
  }

  const result = await getEvent(session.user.id, parsed.data.id);
  if (result.error || !result.data) {
    return { title: "Placeholders" };
  }

  return {
    title: `Placeholders - ${result.data.name}`,
    description: `Manage placeholder participants for ${result.data.name}`,
  };
}

export default async function EventPlaceholdersPage({
  params,
}: PlaceholdersPageProps) {
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
      <Suspense fallback={<PlaceholdersSkeleton />}>
        <PlaceholdersContent eventId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function PlaceholdersContent({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const eventResult = await getEvent(userId, eventId);
  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data;

  if (event.role !== EventParticipantRole.ORGANIZER) {
    redirect(`/events/${eventId}/participants`);
  }

  const [placeholdersResult, retiredResult] = await Promise.all([
    getEventPlaceholders(userId, eventId),
    getRetiredEventPlaceholders(userId, eventId),
  ]);

  const placeholders = placeholdersResult.data ?? [];
  const retiredPlaceholders = retiredResult.data ?? [];

  const activityChecks = await Promise.all(
    placeholders.map((p) =>
      checkEventPlaceholderActivity(userId, p.id, eventId),
    ),
  );

  const placeholdersWithActivity = placeholders.map((p, i) => ({
    placeholder: p,
    hasActivity: activityChecks[i].data?.hasActivity ?? false,
  }));

  return (
    <div className="space-y-6">
      <div>
        <LeagueBreadcrumb
          items={[
            { label: event.name, href: `/events/${eventId}` },
            { label: "Participants", href: `/events/${eventId}/participants` },
            { label: "Placeholders" },
          ]}
        />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">
          Placeholder Participants
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage placeholder participants for guests and temporary participants
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Placeholder</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEventPlaceholderForm eventId={eventId} />
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active
            {placeholders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {placeholders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="retired">
            Retired
            {retiredPlaceholders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {retiredPlaceholders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Placeholders
                {placeholders.length > 0 && (
                  <Badge variant="secondary">{placeholders.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {placeholders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <User className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No active placeholder participants. Create one above to get
                    started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {placeholdersWithActivity.map(
                    ({ placeholder, hasActivity }) => (
                      <EventPlaceholderCard
                        key={placeholder.id}
                        placeholder={placeholder}
                        eventId={eventId}
                        hasActivity={hasActivity}
                      />
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retired" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Retired Placeholders
                {retiredPlaceholders.length > 0 && (
                  <Badge variant="secondary">
                    {retiredPlaceholders.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {retiredPlaceholders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Archive className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No retired placeholder participants.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {retiredPlaceholders.map((placeholder) => (
                    <EventPlaceholderCard
                      key={placeholder.id}
                      placeholder={placeholder}
                      eventId={eventId}
                      isRetired
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlaceholdersSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-7 w-48" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
