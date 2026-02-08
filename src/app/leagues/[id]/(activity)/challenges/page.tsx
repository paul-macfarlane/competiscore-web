import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/server/auth";
import {
  ChallengeType,
  GameCategory,
  MATCH_STATUS_LABELS,
  MatchStatus,
} from "@/lib/shared/constants";
import { LeagueAction, canPerformAction } from "@/lib/shared/permissions";
import {
  ChallengeWithDetails,
  getPendingChallengesPaginated,
  getSentChallengesPaginated,
} from "@/services/challenges";
import { DEFAULT_ITEMS_PER_PAGE } from "@/services/constants";
import { getLeagueGameTypes } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import { formatDistanceToNow } from "date-fns";
import { Swords } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChallengeActions } from "./challenge-actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    receivedPage?: string;
    sentPage?: string;
  }>;
};

export default async function ChallengesPage({
  params,
  searchParams,
}: PageProps) {
  const { id: leagueId } = await params;
  const {
    tab = "received",
    receivedPage: receivedPageParam,
    sentPage: sentPageParam,
  } = await searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const activeTab = tab === "sent" ? "sent" : "received";
  const receivedPage = Math.max(1, parseInt(receivedPageParam || "1", 10));
  const sentPage = Math.max(1, parseInt(sentPageParam || "1", 10));
  const receivedOffset = (receivedPage - 1) * DEFAULT_ITEMS_PER_PAGE;
  const sentOffset = (sentPage - 1) * DEFAULT_ITEMS_PER_PAGE;

  const [pendingResult, sentResult, gameTypesResult, leagueResult] =
    await Promise.all([
      getPendingChallengesPaginated(session.user.id, leagueId, {
        limit: DEFAULT_ITEMS_PER_PAGE,
        offset: receivedOffset,
      }),
      getSentChallengesPaginated(session.user.id, leagueId, {
        limit: DEFAULT_ITEMS_PER_PAGE,
        offset: sentOffset,
      }),
      getLeagueGameTypes(session.user.id, leagueId),
      getLeagueWithRole(leagueId, session.user.id),
    ]);

  if (pendingResult.error || sentResult.error) {
    notFound();
  }

  const pending = pendingResult.data!;
  const sent = sentResult.data!;
  const sentPendingCount = sent.items.filter(
    (c) => c.status === MatchStatus.PENDING,
  ).length;

  const allGameTypes = gameTypesResult.data ?? [];
  const h2hGameTypes = allGameTypes.filter(
    (gt) => !gt.isArchived && gt.category === GameCategory.HEAD_TO_HEAD,
  );
  const canPlay =
    leagueResult.data &&
    canPerformAction(leagueResult.data.role, LeagueAction.PLAY_GAMES);
  const isSuspended =
    leagueResult.data?.suspendedUntil &&
    leagueResult.data.suspendedUntil > new Date();
  const showChallengeButton =
    canPlay && !isSuspended && h2hGameTypes.length > 0;

  const receivedTotalPages = Math.ceil(pending.total / DEFAULT_ITEMS_PER_PAGE);
  const sentTotalPages = Math.ceil(sent.total / DEFAULT_ITEMS_PER_PAGE);

  const buildTabHref = (tabValue: string) => {
    const params = new URLSearchParams();
    params.set("tab", tabValue);
    if (tabValue === "received" && receivedPage > 1)
      params.set("receivedPage", String(receivedPage));
    if (tabValue === "sent" && sentPage > 1)
      params.set("sentPage", String(sentPage));
    return `/leagues/${leagueId}/challenges?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Challenges" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Challenges</h1>
          <p className="text-muted-foreground mt-1">
            Manage your pending and sent challenges
          </p>
        </div>
        {showChallengeButton && (
          <Button asChild>
            <Link href={`/leagues/${leagueId}/challenges/new`}>
              <Swords className="mr-2 h-4 w-4" />
              Challenge
            </Link>
          </Button>
        )}
      </div>

      {h2hGameTypes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No head-to-head game types available.</p>
            <p className="text-sm mt-2">
              Challenges require a head-to-head game type. A league manager
              needs to create one before challenges can be sent.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" asChild>
            <a href={buildTabHref("received")}>
              Received
              {pending.total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pending.total}
                </Badge>
              )}
            </a>
          </TabsTrigger>
          <TabsTrigger value="sent" asChild>
            <a href={buildTabHref("sent")}>
              Sent
              {sentPendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {sentPendingCount}
                </Badge>
              )}
            </a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          {pending.items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No pending challenges.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pending.items.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  leagueId={leagueId}
                  type={ChallengeType.RECEIVED}
                />
              ))}
              <PaginationNav
                currentPage={receivedPage}
                totalPages={receivedTotalPages}
                total={pending.total}
                offset={receivedOffset}
                limit={DEFAULT_ITEMS_PER_PAGE}
                buildHref={(p) => {
                  const params = new URLSearchParams();
                  params.set("tab", "received");
                  params.set("receivedPage", String(p));
                  if (sentPage > 1) params.set("sentPage", String(sentPage));
                  return `/leagues/${leagueId}/challenges?${params.toString()}`;
                }}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sent.items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No sent challenges.</p>
                <p className="text-sm mt-2">
                  Go to a Head-to-Head game type and create a challenge.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sent.items.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  leagueId={leagueId}
                  type={ChallengeType.SENT}
                />
              ))}
              <PaginationNav
                currentPage={sentPage}
                totalPages={sentTotalPages}
                total={sent.total}
                offset={sentOffset}
                limit={DEFAULT_ITEMS_PER_PAGE}
                buildHref={(p) => {
                  const params = new URLSearchParams();
                  params.set("tab", "sent");
                  params.set("sentPage", String(p));
                  if (receivedPage > 1)
                    params.set("receivedPage", String(receivedPage));
                  return `/leagues/${leagueId}/challenges?${params.toString()}`;
                }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ChallengeCardProps = {
  challenge: ChallengeWithDetails;
  leagueId: string;
  type: ChallengeType;
};

function ChallengeCard({ challenge, leagueId, type }: ChallengeCardProps) {
  const challengers = challenge.participants.filter(
    (p) => p.isChallenged === false,
  );
  const challenged = challenge.participants.filter(
    (p) => p.isChallenged === true,
  );

  const getParticipantName = (p: ChallengeWithDetails["participants"][0]) => {
    if (p.user) return p.user.name;
    if (p.team) return p.team.name;
    if (p.placeholderMember) return p.placeholderMember.displayName;
    return "Unknown";
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case MatchStatus.ACCEPTED:
        return "default";
      case MatchStatus.PENDING:
        return "secondary";
      case MatchStatus.DECLINED:
      case MatchStatus.CANCELLED:
        return "destructive";
      default:
        return "secondary";
    }
  };

  const challengerNames = challengers.map(getParticipantName).join(", ");
  const challengedNames = challenged.map(getParticipantName).join(", ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{challenge.gameType.name}</CardTitle>
          <Badge variant={statusBadgeVariant(challenge.status)}>
            {MATCH_STATUS_LABELS[challenge.status as MatchStatus]}
          </Badge>
        </div>
        {challenge.challengedAt && (
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(challenge.challengedAt), {
              addSuffix: true,
            })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {type === "received" ? "From:" : "Challenger:"}
            </span>
            <span className="font-medium">{challengerNames}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span className="text-muted-foreground">
              {type === "received" ? "To:" : "Challenged:"}
            </span>
            <span className="font-medium">{challengedNames}</span>
          </div>
        </div>

        <ChallengeActions
          challengeId={challenge.id}
          status={challenge.status}
          type={type}
          leagueId={leagueId}
          gameTypeId={challenge.gameType.id}
        />
      </CardContent>
    </Card>
  );
}
