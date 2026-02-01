import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPlaceholderActivity } from "@/db/placeholder-members";
import { auth } from "@/lib/server/auth";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { getLeagueWithRole } from "@/services/leagues";
import {
  getPlaceholders,
  getRetiredPlaceholders,
} from "@/services/placeholder-members";
import { idParamSchema } from "@/validators/shared";
import { Archive, User, Users } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CreatePlaceholderForm } from "./create-placeholder-form";
import { PlaceholderCard } from "./placeholder-card";

interface PlaceholdersPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaceholdersPage({
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${id}` },
            { label: "Members", href: `/leagues/${id}/members` },
            { label: "Placeholders" },
          ]}
        />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">
          Placeholder Members
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage placeholder members for guests and temporary participants
        </p>
      </div>
      <Suspense fallback={<PlaceholdersSkeleton />}>
        <PlaceholdersContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function PlaceholdersContent({
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

  const canManagePlaceholders = canPerformAction(
    leagueResult.data.role,
    LeagueAction.CREATE_PLACEHOLDERS,
  );
  if (!canManagePlaceholders) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage placeholder members.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [activePlaceholdersResult, retiredPlaceholdersResult] =
    await Promise.all([
      getPlaceholders(leagueId, userId),
      getRetiredPlaceholders(leagueId, userId),
    ]);

  const activePlaceholders = activePlaceholdersResult.data ?? [];
  const retiredPlaceholders = retiredPlaceholdersResult.data ?? [];

  const activePlaceholdersWithActivity = await Promise.all(
    activePlaceholders.map(async (placeholder) => ({
      ...placeholder,
      hasActivity: await hasPlaceholderActivity(placeholder.id),
    })),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Placeholder</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePlaceholderForm leagueId={leagueId} />
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active
            {activePlaceholders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activePlaceholders.length}
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
                {activePlaceholders.length > 0 && (
                  <Badge variant="secondary">{activePlaceholders.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activePlaceholders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <User className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No active placeholder members. Create one above to get
                    started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activePlaceholdersWithActivity.map((placeholder) => (
                    <PlaceholderCard
                      key={placeholder.id}
                      placeholder={placeholder}
                      leagueId={leagueId}
                      hasActivity={placeholder.hasActivity}
                    />
                  ))}
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
                    No retired placeholder members.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {retiredPlaceholders.map((placeholder) => (
                    <PlaceholderCard
                      key={placeholder.id}
                      placeholder={placeholder}
                      leagueId={leagueId}
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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
