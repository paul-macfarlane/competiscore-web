import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { EVENT_ROLE_LABELS } from "@/lib/shared/roles";
import { getEventInviteLinkDetails } from "@/services/event-invitations";
import { AlertCircle, CalendarDays } from "lucide-react";
import { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { JoinButton } from "./join-button";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

const tokenSchema = z.string().min(1).max(100);

export const metadata: Metadata = {
  title: "Join Event",
};

export default async function EventInvitePage({
  searchParams,
}: InvitePageProps) {
  const sp = await searchParams;
  const parsed = tokenSchema.safeParse(sp.token);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Suspense fallback={<InviteSkeleton />}>
        <InviteContent token={parsed.data} />
      </Suspense>
    </div>
  );
}

async function InviteContent({ token }: { token: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const result = await getEventInviteLinkDetails(token);
  if (result.error || !result.data) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Invalid Invite Link</CardTitle>
          <CardDescription>
            {result.error || "This invite link is not valid."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { event, role, isValid, reason } = result.data;

  if (!isValid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Invite Link Expired</CardTitle>
          <CardDescription>
            {reason || "This invite link is no longer valid."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {event.logo ? (
          <div className="relative mx-auto mb-4 h-16 w-16 overflow-hidden rounded-lg border bg-muted">
            <Image
              src={event.logo}
              alt={event.name}
              fill
              className="object-cover p-2"
            />
          </div>
        ) : (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border bg-muted">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <CardTitle>{event.name}</CardTitle>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>You&apos;re invited to join as {EVENT_ROLE_LABELS[role]}</span>
        </div>

        {session ? (
          <JoinButton token={token} eventId={event.id} />
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Sign in to join this event
            </p>
            <Button asChild className="w-full">
              <Link href={`/?redirect=/events/invite?token=${token}`}>
                Sign In
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-lg" />
        <Skeleton className="mx-auto h-6 w-40" />
        <Skeleton className="mx-auto mt-2 h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mx-auto h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-full" />
      </CardContent>
    </Card>
  );
}
