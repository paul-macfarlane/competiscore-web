import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeagueMembers } from "@/db/league-members";
import { auth } from "@/lib/server/auth";
import { DEFAULT_ITEMS_PER_PAGE } from "@/services/constants";
import {
  getPendingReportsPaginated,
  getSuspendedMembersPaginated,
} from "@/services/moderation";
import { idParamSchema } from "@/validators/shared";
import { Flag, Shield } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ReportsList } from "./reports-list";
import { SubmitReportDialog } from "./submit-report-dialog";
import { SuspendedMembersList } from "./suspended-members-list";

const TABS = ["pending", "suspended"] as const;

interface ModerationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    pendingPage?: string;
    suspendedPage?: string;
  }>;
}

export default async function ModerationPage({
  params,
  searchParams,
}: ModerationPageProps) {
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
  const sp = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${id}` },
            { label: "Moderation" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Moderation</h1>
        <p className="text-muted-foreground text-sm">
          Manage reports and suspended members
        </p>
      </div>
      <Suspense fallback={<ModerationSkeleton />}>
        <ModerationContent
          leagueId={id}
          userId={session.user.id}
          searchParams={sp}
        />
      </Suspense>
    </div>
  );
}

function buildTabHref(
  leagueId: string,
  tab: string,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "tab") {
      params.set(key, value);
    }
  }
  return `/leagues/${leagueId}/moderation?${params.toString()}`;
}

async function ModerationContent({
  leagueId,
  userId,
  searchParams,
}: {
  leagueId: string;
  userId: string;
  searchParams: {
    tab?: string;
    pendingPage?: string;
    suspendedPage?: string;
  };
}) {
  const members = await getLeagueMembers(leagueId);
  const filteredMembers = members.filter((m) => m.userId !== userId);

  const activeTab = TABS.includes(searchParams.tab as (typeof TABS)[number])
    ? (searchParams.tab as (typeof TABS)[number])
    : "pending";

  const pendingPage = Math.max(
    1,
    parseInt(searchParams.pendingPage || "1", 10),
  );
  const suspendedPage = Math.max(
    1,
    parseInt(searchParams.suspendedPage || "1", 10),
  );

  const pendingOffset = (pendingPage - 1) * DEFAULT_ITEMS_PER_PAGE;
  const suspendedOffset = (suspendedPage - 1) * DEFAULT_ITEMS_PER_PAGE;

  const [pendingResult, suspendedResult] = await Promise.all([
    getPendingReportsPaginated(userId, leagueId, {
      limit: activeTab === "pending" ? DEFAULT_ITEMS_PER_PAGE : 0,
      offset: activeTab === "pending" ? pendingOffset : 0,
    }),
    getSuspendedMembersPaginated(userId, leagueId, {
      limit: activeTab === "suspended" ? DEFAULT_ITEMS_PER_PAGE : 0,
      offset: activeTab === "suspended" ? suspendedOffset : 0,
    }),
  ]);

  const pendingData = pendingResult?.data;
  const suspendedData = suspendedResult?.data;

  const pendingCount = pendingData?.total ?? 0;
  const suspendedCount = suspendedData?.total ?? 0;

  const pendingTotalPages = Math.ceil(pendingCount / DEFAULT_ITEMS_PER_PAGE);
  const suspendedTotalPages = Math.ceil(
    suspendedCount / DEFAULT_ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SubmitReportDialog leagueId={leagueId} members={filteredMembers} />
      </div>
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" asChild>
            <Link href={buildTabHref(leagueId, "pending", searchParams)}>
              Pending
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="suspended" asChild>
            <Link href={buildTabHref(leagueId, "suspended", searchParams)}>
              Suspended
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Pending Reports
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportsList
                reports={pendingData?.items ?? []}
                leagueId={leagueId}
              />
              <PaginationNav
                currentPage={pendingPage}
                totalPages={pendingTotalPages}
                total={pendingCount}
                offset={pendingOffset}
                limit={DEFAULT_ITEMS_PER_PAGE}
                buildHref={(p) => {
                  const params = new URLSearchParams();
                  params.set("tab", "pending");
                  params.set("pendingPage", String(p));
                  return `/leagues/${leagueId}/moderation?${params.toString()}`;
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Suspended Members
                {suspendedCount > 0 && (
                  <Badge variant="secondary">{suspendedCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SuspendedMembersList
                members={suspendedData?.items ?? []}
                leagueId={leagueId}
              />
              <PaginationNav
                currentPage={suspendedPage}
                totalPages={suspendedTotalPages}
                total={suspendedCount}
                offset={suspendedOffset}
                limit={DEFAULT_ITEMS_PER_PAGE}
                buildHref={(p) => {
                  const params = new URLSearchParams();
                  params.set("tab", "suspended");
                  params.set("suspendedPage", String(p));
                  return `/leagues/${leagueId}/moderation?${params.toString()}`;
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModerationSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
