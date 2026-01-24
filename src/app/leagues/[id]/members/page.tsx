import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { LeagueAction, canPerformAction } from "@/lib/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import { getLeagueMembers } from "@/services/members";
import {
  getPlaceholders,
  getRetiredPlaceholders,
} from "@/services/placeholder-members";
import { idParamSchema } from "@/validators/shared";
import { UserPlus, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MembersList } from "./members-list";
import { PlaceholdersList, RetiredPlaceholdersList } from "./placeholders-list";

interface MembersPageProps {
  params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
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
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/leagues/${id}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Back to league
          </Link>
          <h1 className="mt-2 text-xl font-bold md:text-2xl">Members</h1>
          <p className="text-muted-foreground text-sm">
            View and manage league members
          </p>
        </div>
      </div>
      <Suspense fallback={<MembersSkeleton />}>
        <MembersContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function MembersContent({
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
  const canInvite = canPerformAction(league.role, LeagueAction.INVITE_MEMBERS);
  const canManageRoles = canPerformAction(
    league.role,
    LeagueAction.MANAGE_ROLES,
  );
  const canRemove = canPerformAction(league.role, LeagueAction.REMOVE_MEMBERS);
  const canManagePlaceholders = canPerformAction(
    league.role,
    LeagueAction.CREATE_PLACEHOLDERS,
  );
  const canReport = canPerformAction(league.role, LeagueAction.REPORT_MEMBER);

  const [membersResult, placeholdersResult, retiredPlaceholdersResult] =
    await Promise.all([
      getLeagueMembers(leagueId, userId),
      getPlaceholders(leagueId, userId),
      canManagePlaceholders
        ? getRetiredPlaceholders(leagueId, userId)
        : Promise.resolve({ data: [] }),
    ]);

  const members = membersResult.data ?? [];
  const placeholders = placeholdersResult.data ?? [];
  const retiredPlaceholders = retiredPlaceholdersResult.data ?? [];

  return (
    <div className="space-y-6">
      {canInvite && (
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/leagues/${leagueId}/members/invite`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Members
            </Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MembersList
            members={members}
            currentUserId={userId}
            currentUserRole={league.role}
            canManageRoles={canManageRoles}
            canRemove={canRemove}
            canReport={canReport}
            leagueId={leagueId}
          />
        </CardContent>
      </Card>

      {(placeholders.length > 0 || canManagePlaceholders) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              Placeholder Members ({placeholders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholdersList
              placeholders={placeholders}
              canManage={canManagePlaceholders}
              leagueId={leagueId}
            />
          </CardContent>
        </Card>
      )}

      {canManagePlaceholders && retiredPlaceholders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              Retired Placeholders ({retiredPlaceholders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RetiredPlaceholdersList
              placeholders={retiredPlaceholders}
              leagueId={leagueId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-36" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
