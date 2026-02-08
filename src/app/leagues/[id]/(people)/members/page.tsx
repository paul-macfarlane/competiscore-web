import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsageIndicator } from "@/components/usage-indicator";
import { auth } from "@/lib/server/auth";
import { getLeagueMemberLimitInfo } from "@/lib/server/limits";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { DEFAULT_ITEMS_PER_PAGE } from "@/services/constants";
import { getLeagueWithRole } from "@/services/leagues";
import { getLeagueMembers } from "@/services/members";
import { getPlaceholdersPaginated } from "@/services/placeholder-members";
import { idParamSchema } from "@/validators/shared";
import { UserPlus, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MembersList } from "./members-list";
import { PlaceholdersList } from "./placeholders-list";

interface MembersPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placeholderPage?: string }>;
}

export default async function MembersPage({
  params,
  searchParams,
}: MembersPageProps) {
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
  const { placeholderPage: placeholderPageParam } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <LeagueBreadcrumb
            items={[
              { label: "League", href: `/leagues/${id}` },
              { label: "Members" },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Members</h1>
          <p className="text-muted-foreground text-sm">
            View and manage league members
          </p>
        </div>
      </div>
      <Suspense fallback={<MembersSkeleton />}>
        <MembersContent
          leagueId={id}
          userId={session.user.id}
          placeholderPageParam={placeholderPageParam}
        />
      </Suspense>
    </div>
  );
}

async function MembersContent({
  leagueId,
  userId,
  placeholderPageParam,
}: {
  leagueId: string;
  userId: string;
  placeholderPageParam?: string;
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

  const placeholderPage = Math.max(
    1,
    parseInt(placeholderPageParam || "1", 10),
  );
  const placeholderOffset = (placeholderPage - 1) * DEFAULT_ITEMS_PER_PAGE;

  const [membersResult, placeholdersResult, memberLimitInfo] =
    await Promise.all([
      getLeagueMembers(leagueId, userId),
      getPlaceholdersPaginated(leagueId, userId, {
        limit: DEFAULT_ITEMS_PER_PAGE,
        offset: placeholderOffset,
      }),
      getLeagueMemberLimitInfo(leagueId),
    ]);

  const members = membersResult.data ?? [];
  const placeholders = placeholdersResult.data;
  const placeholderItems = placeholders?.items ?? [];
  const placeholderTotal = placeholders?.total ?? 0;
  const placeholderTotalPages = Math.ceil(
    placeholderTotal / DEFAULT_ITEMS_PER_PAGE,
  );

  const isAtMemberLimit = memberLimitInfo.isAtLimit;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
            {memberLimitInfo.max !== null && (
              <UsageIndicator
                current={memberLimitInfo.current}
                max={memberLimitInfo.max}
                label="capacity"
                showProgressBar={false}
                className="text-xs"
              />
            )}
          </div>
          {canInvite && (
            <>
              {isAtMemberLimit ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button disabled size="sm">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invite Members
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        This league has reached its limit of{" "}
                        {memberLimitInfo.max} members
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button asChild size="sm">
                  <Link href={`/leagues/${leagueId}/members/invite`}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Members
                  </Link>
                </Button>
              )}
            </>
          )}
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto">
          <MembersList
            members={members}
            currentUserId={userId}
            currentUserRole={league.role}
            canManageRoles={canManageRoles}
            canRemove={canRemove}
            leagueId={leagueId}
          />
        </CardContent>
      </Card>

      {(placeholderTotal > 0 || canManagePlaceholders) && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                Placeholder Members ({placeholderTotal})
              </CardTitle>
              {canManagePlaceholders && (
                <Button asChild size="sm">
                  <Link href={`/leagues/${leagueId}/members/placeholders`}>
                    Manage
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <PlaceholdersList
                placeholders={placeholderItems}
                canManage={canManagePlaceholders}
                leagueId={leagueId}
              />
            </CardContent>
          </Card>
          <PaginationNav
            currentPage={placeholderPage}
            totalPages={placeholderTotalPages}
            total={placeholderTotal}
            offset={placeholderOffset}
            limit={DEFAULT_ITEMS_PER_PAGE}
            buildHref={(p) =>
              `/leagues/${leagueId}/members?placeholderPage=${p}`
            }
          />
        </>
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
