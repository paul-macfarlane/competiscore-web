import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { getUserPendingInvitations } from "@/services/invitations";
import { Mail } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { InvitationsList } from "./invitations-list";

export default async function InvitationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Invitations</h1>
        <p className="text-muted-foreground text-sm">
          League invitations waiting for your response
        </p>
      </div>
      <Suspense fallback={<InvitationsSkeleton />}>
        <InvitationsContent userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function InvitationsContent({ userId }: { userId: string }) {
  const result = await getUserPendingInvitations(userId);
  const invitations = result.data ?? [];

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No pending invitations</h3>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            When someone invites you to a league, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations ({invitations.length})
        </CardTitle>
        <CardDescription>
          Accept or decline invitations to join leagues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InvitationsList invitations={invitations} />
      </CardContent>
    </Card>
  );
}

function InvitationsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
