import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import { TournamentStatus } from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import { DEFAULT_ITEMS_PER_PAGE } from "@/services/constants";
import { getLeagueWithRole } from "@/services/leagues";
import { getLeagueTournamentsPaginated } from "@/services/tournaments";
import { Plus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TournamentCard } from "./tournament-card";

const ACTIVE_STATUSES = [TournamentStatus.DRAFT, TournamentStatus.IN_PROGRESS];
const COMPLETED_STATUSES = [TournamentStatus.COMPLETED];

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activePage?: string; completedPage?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Tournaments" };

  const leagueResult = await getLeagueWithRole(leagueId, session.user.id);
  if (!leagueResult.data) return { title: "Tournaments" };

  return {
    title: `Tournaments | ${leagueResult.data.name}`,
  };
}

export default async function TournamentsPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId } = await params;
  const { activePage: activePageParam, completedPage: completedPageParam } =
    await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const activePage = Math.max(1, parseInt(activePageParam || "1", 10));
  const completedPage = Math.max(1, parseInt(completedPageParam || "1", 10));
  const activeOffset = (activePage - 1) * DEFAULT_ITEMS_PER_PAGE;
  const completedOffset = (completedPage - 1) * DEFAULT_ITEMS_PER_PAGE;

  const [leagueResult, activeResult, completedResult] = await Promise.all([
    getLeagueWithRole(leagueId, session.user.id),
    getLeagueTournamentsPaginated(session.user.id, leagueId, {
      statuses: ACTIVE_STATUSES,
      limit: DEFAULT_ITEMS_PER_PAGE,
      offset: activeOffset,
    }),
    getLeagueTournamentsPaginated(session.user.id, leagueId, {
      statuses: COMPLETED_STATUSES,
      limit: DEFAULT_ITEMS_PER_PAGE,
      offset: completedOffset,
    }),
  ]);

  if (leagueResult.error || activeResult.error || completedResult.error) {
    notFound();
  }

  const league = leagueResult.data!;
  const active = activeResult.data!;
  const completed = completedResult.data!;
  const canCreate = canPerformAction(
    league.role,
    LeagueAction.CREATE_TOURNAMENTS,
  );

  const activeTotalPages = Math.ceil(active.total / DEFAULT_ITEMS_PER_PAGE);
  const completedTotalPages = Math.ceil(
    completed.total / DEFAULT_ITEMS_PER_PAGE,
  );
  const hasNoTournaments = active.total === 0 && completed.total === 0;

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: league.name, href: `/leagues/${leagueId}` },
          { label: "Tournaments" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Tournaments</h1>
          <p className="text-muted-foreground mt-1">
            Compete in organized bracket tournaments
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/leagues/${leagueId}/tournaments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Link>
          </Button>
        )}
      </div>

      {hasNoTournaments ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No tournaments yet.</p>
            {canCreate && (
              <p className="text-sm mt-2">
                Create a tournament to organize bracket competitions.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {active.total > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active</h2>
              <div className="space-y-3">
                {active.items.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    leagueId={leagueId}
                  />
                ))}
              </div>
              <PaginationNav
                currentPage={activePage}
                totalPages={activeTotalPages}
                total={active.total}
                offset={activeOffset}
                limit={DEFAULT_ITEMS_PER_PAGE}
                buildHref={(p) => {
                  const params = new URLSearchParams();
                  params.set("activePage", String(p));
                  if (completedPage > 1)
                    params.set("completedPage", String(completedPage));
                  return `/leagues/${leagueId}/tournaments?${params.toString()}`;
                }}
              />
            </div>
          )}

          {completed.total > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Completed</h2>
              <div className="space-y-3">
                {completed.items.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    leagueId={leagueId}
                  />
                ))}
              </div>
              <PaginationNav
                currentPage={completedPage}
                totalPages={completedTotalPages}
                total={completed.total}
                offset={completedOffset}
                limit={DEFAULT_ITEMS_PER_PAGE}
                buildHref={(p) => {
                  const params = new URLSearchParams();
                  if (activePage > 1)
                    params.set("activePage", String(activePage));
                  params.set("completedPage", String(p));
                  return `/leagues/${leagueId}/tournaments?${params.toString()}`;
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
