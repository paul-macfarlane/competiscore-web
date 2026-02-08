import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/server/auth";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { LeaguePage, canAccessPage } from "@/lib/shared/permissions";
import { getExecutiveCount, getLeagueWithRole } from "@/services/leagues";
import { idParamSchema } from "@/validators/shared";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ArchiveLeagueSection } from "./archive-league-section";
import { DeleteLeagueSection } from "./delete-league-section";
import { LeagueSettingsForm } from "./league-settings-form";
import { LeaveLeagueSection } from "./leave-league-section";

interface LeagueSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeagueSettingsPage({
  params,
}: LeagueSettingsPageProps) {
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
      <div>
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${id}` },
            { label: "Settings" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">League Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your league settings
        </p>
      </div>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent leagueId={id} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function SettingsContent({
  leagueId,
  userId,
}: {
  leagueId: string;
  userId: string;
}) {
  const result = await getLeagueWithRole(leagueId, userId);
  if (result.error || !result.data) {
    notFound();
  }

  const league = result.data;
  if (!canAccessPage(league.role, LeaguePage.SETTINGS)) {
    redirect(`/leagues/${leagueId}`);
  }

  const executiveCount = await getExecutiveCount(leagueId);
  const isSoleExecutive =
    league.role === LeagueMemberRole.EXECUTIVE && executiveCount <= 1;

  return (
    <div className="space-y-6">
      <LeagueSettingsForm league={league} />
      <LeaveLeagueSection
        leagueId={leagueId}
        isSoleExecutive={isSoleExecutive}
      />
      <ArchiveLeagueSection leagueId={leagueId} />
      <DeleteLeagueSection leagueId={leagueId} leagueName={league.name} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
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
