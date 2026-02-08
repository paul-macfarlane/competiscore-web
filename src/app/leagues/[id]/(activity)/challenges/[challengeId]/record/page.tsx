import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { getGameTypeById } from "@/db/game-types";
import { auth } from "@/lib/server/auth";
import { MatchStatus } from "@/lib/shared/constants";
import { parseH2HConfig } from "@/lib/shared/game-config-parser";
import { getChallenge } from "@/services/challenges";
import { getLeagueWithRole } from "@/services/leagues";
import { isSuspended } from "@/services/shared";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { RecordChallengeForm } from "./record-challenge-form";

type PageProps = {
  params: Promise<{ id: string; challengeId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { challengeId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return {
      title: "Record Challenge",
    };
  }

  const challengeResult = await getChallenge(session.user.id, challengeId);
  if (challengeResult.error || !challengeResult.data) {
    return {
      title: "Challenge Not Found",
    };
  }

  const challenge = challengeResult.data;
  const gameType = await getGameTypeById(challenge.gameTypeId);

  return {
    title: `Record Challenge - ${gameType?.name ?? "Unknown Game"}`,
    description: `Record the result of your challenge match`,
  };
}

export default async function RecordChallengePage({ params }: PageProps) {
  const { id: leagueId, challengeId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [challengeResult, leagueResult] = await Promise.all([
    getChallenge(session.user.id, challengeId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (challengeResult.error || !challengeResult.data) {
    notFound();
  }

  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const challenge = challengeResult.data;
  const league = leagueResult.data;

  if (challenge.leagueId !== leagueId) {
    notFound();
  }

  if (challenge.status !== MatchStatus.ACCEPTED) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Challenges", href: `/leagues/${leagueId}/challenges` },
            { label: "Record Result" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Record Challenge Result
          </h1>
          <p className="text-destructive mt-4">
            This challenge must be accepted before recording a result.
          </p>
        </div>
      </div>
    );
  }

  const challengerParticipants = challenge.participants.filter(
    (p) => !p.isChallenged,
  );
  const challengedParticipants = challenge.participants.filter(
    (p) => p.isChallenged,
  );

  const isParticipant =
    challengerParticipants.some((p) => p.userId === session.user.id) ||
    challengedParticipants.some((p) => p.userId === session.user.id);

  if (!isParticipant) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Challenges", href: `/leagues/${leagueId}/challenges` },
            { label: "Record Result" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Record Challenge Result
          </h1>
          <p className="text-destructive mt-4">
            Only challenge participants can record the result.
          </p>
        </div>
      </div>
    );
  }

  if (isSuspended(league)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <LeagueBreadcrumb
          items={[
            { label: "League", href: `/leagues/${leagueId}` },
            { label: "Challenges", href: `/leagues/${leagueId}/challenges` },
            { label: "Record Result" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Record Challenge Result
          </h1>
          <p className="text-destructive mt-4">
            You cannot record challenge results while suspended.
          </p>
        </div>
      </div>
    );
  }

  const gameType = await getGameTypeById(challenge.gameTypeId);
  if (!gameType) {
    notFound();
  }

  const config = parseH2HConfig(gameType.config);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Challenges", href: `/leagues/${leagueId}/challenges` },
          { label: "Record Result" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          Record Challenge Result
        </h1>
        <p className="text-muted-foreground mt-1">{gameType.name}</p>
      </div>

      <RecordChallengeForm
        leagueId={leagueId}
        challengeId={challengeId}
        config={config}
        scoringType={config.scoringType}
        challengerParticipants={challengerParticipants}
        challengedParticipants={challengedParticipants}
      />
    </div>
  );
}
