import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/server/auth";
import {
  ChallengeType,
  MATCH_STATUS_LABELS,
  MatchStatus,
} from "@/lib/shared/constants";
import { getPendingChallenges, getSentChallenges } from "@/services/challenges";
import { formatDistanceToNow } from "date-fns";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ChallengeActions } from "./challenge-actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChallengesPage({ params }: PageProps) {
  const { id: leagueId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [pendingResult, sentResult] = await Promise.all([
    getPendingChallenges(session.user.id, leagueId),
    getSentChallenges(session.user.id, leagueId),
  ]);

  if (pendingResult.error || sentResult.error) {
    notFound();
  }

  const pending = pendingResult.data || [];
  const sent = sentResult.data || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Challenges" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Challenges</h1>
        <p className="text-muted-foreground mt-1">
          Manage your pending and sent challenges
        </p>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Received
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent
            {sent.filter((c) => c.status === MatchStatus.PENDING).length >
              0 && (
              <Badge variant="secondary" className="ml-2">
                {sent.filter((c) => c.status === MatchStatus.PENDING).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No pending challenges.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pending.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  leagueId={leagueId}
                  type={ChallengeType.RECEIVED}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sent.length === 0 ? (
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
              {sent.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  leagueId={leagueId}
                  type={ChallengeType.SENT}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ChallengeCardProps = {
  challenge: {
    id: string;
    status: string;
    playedAt: Date;
    challengedAt: Date | null;
    gameType?: { id: string; name: string; category: string } | null;
    participants: Array<{
      id: string;
      side: number | null;
      result: string | null;
      score: number | null;
      isChallenged: boolean | null;
      user?: {
        id: string;
        name: string;
        username: string;
        image: string | null;
      } | null;
      team?: { id: string; name: string; logo: string | null } | null;
      placeholderMember?: { id: string; displayName: string } | null;
    }>;
  };
  leagueId: string;
  type: ChallengeType;
};

function ChallengeCard({ challenge, leagueId, type }: ChallengeCardProps) {
  const gameType = challenge.gameType;
  const challengers = challenge.participants.filter(
    (p) => p.isChallenged === false,
  );
  const challenged = challenge.participants.filter(
    (p) => p.isChallenged === true,
  );

  const getParticipantName = (
    p: ChallengeCardProps["challenge"]["participants"][0],
  ) => {
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
          <CardTitle className="text-lg">
            {gameType?.name || "Unknown Game"}
          </CardTitle>
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
          gameTypeId={gameType?.id}
        />
      </CardContent>
    </Card>
  );
}
