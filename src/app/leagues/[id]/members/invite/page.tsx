import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getAssignableRoles } from "@/lib/shared/roles";
import { getLeaguePendingInvitations } from "@/services/invitations";
import { getLeagueWithRole } from "@/services/leagues";
import { idParamSchema } from "@/validators/shared";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CreatePlaceholderForm } from "./create-placeholder-form";
import { InviteLinkGenerator } from "./invite-link-generator";
import { PendingInvitationsList } from "./pending-invitations-list";
import { UserInviteForm } from "./user-invite-form";

interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${id}` },
            { label: "Members", href: `/leagues/${id}/members` },
            { label: "Invite" },
          ]}
        />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">Invite Members</h1>
        <p className="text-muted-foreground text-sm">
          Invite users to join this league
        </p>
      </div>
      <Suspense fallback={<InviteSkeleton />}>
        <InviteContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function InviteContent({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const leagueResult = await getLeagueWithRole(leagueId, userId);
  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const league = leagueResult.data;

  if (!canPerformAction(league.role, LeagueAction.INVITE_MEMBERS)) {
    redirect(`/leagues/${leagueId}/members`);
  }

  const pendingResult = await getLeaguePendingInvitations(leagueId, userId);
  const pendingInvitations = pendingResult.data ?? [];

  const availableRoles = getAssignableRoles(league.role);

  const canCreatePlaceholders = canPerformAction(
    league.role,
    LeagueAction.CREATE_PLACEHOLDERS,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite by Username</CardTitle>
          <CardDescription>
            Search for a user by their name or username to send them an
            invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserInviteForm leagueId={leagueId} availableRoles={availableRoles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Invite Link</CardTitle>
          <CardDescription>
            Create a shareable link that anyone can use to join the league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteLinkGenerator
            leagueId={leagueId}
            availableRoles={availableRoles}
          />
        </CardContent>
      </Card>

      {canCreatePlaceholders && (
        <Card>
          <CardHeader>
            <CardTitle>Create Placeholder Member</CardTitle>
            <CardDescription>
              Create a placeholder for someone who hasn&apos;t signed up yet.
              They can be linked to a real account later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatePlaceholderForm leagueId={leagueId} />
          </CardContent>
        </Card>
      )}

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that haven&apos;t been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitationsList
              invitations={pendingInvitations}
              leagueId={leagueId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InviteSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
