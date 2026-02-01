import { LeagueBreadcrumb } from "@/components/league-breadcrumb";
import { LeagueMemberWithUser, getLeagueMembers } from "@/db/league-members";
import { getActivePlaceholderMembersByLeague } from "@/db/placeholder-members";
import { PlaceholderMember, Team } from "@/db/schema";
import { getTeamsByLeagueId } from "@/db/teams";
import { auth } from "@/lib/server/auth";
import { GameCategory, MatchParticipantType } from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import {
  FFAConfig,
  H2HConfig,
  HighScoreConfig,
} from "@/lib/shared/game-templates";
import { getGameType } from "@/services/game-types";
import { getLeagueWithRole } from "@/services/leagues";
import { isSuspended } from "@/services/shared";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { RecordFFAMatchForm } from "./record-ffa-match-form";
import { RecordH2HMatchForm } from "./record-h2h-match-form";
import { SubmitHighScoreForm } from "./submit-high-score-form";

type PageProps = {
  params: Promise<{ id: string; gameTypeId: string }>;
};

export type ParticipantOption = {
  id: string;
  type: MatchParticipantType;
  name: string;
  image?: string | null;
  username?: string;
  isSuspended?: boolean;
};

export default async function RecordMatchPage({ params }: PageProps) {
  const { id: leagueId, gameTypeId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  const [gameTypeResult, leagueResult] = await Promise.all([
    getGameType(session.user.id, gameTypeId),
    getLeagueWithRole(leagueId, session.user.id),
  ]);

  if (gameTypeResult.error || !gameTypeResult.data) {
    notFound();
  }

  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const gameType = gameTypeResult.data;

  if (gameType.leagueId !== leagueId) {
    notFound();
  }

  const [members, teams, placeholders] = await Promise.all([
    getLeagueMembers(leagueId),
    getTeamsByLeagueId(leagueId),
    getActivePlaceholderMembersByLeague(leagueId),
  ]);

  const participantOptions = buildParticipantOptions(
    members,
    teams,
    placeholders,
  );

  const config = parseGameConfig(gameType.config, gameType.category);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LeagueBreadcrumb
        items={[
          { label: "League", href: `/leagues/${leagueId}` },
          { label: "Game Types", href: `/leagues/${leagueId}/game-types` },
          {
            label: gameType.name,
            href: `/leagues/${leagueId}/game-types/${gameTypeId}`,
          },
          {
            label:
              gameType.category === GameCategory.HIGH_SCORE
                ? "Submit Score"
                : "Record Match",
          },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          {gameType.category === GameCategory.HIGH_SCORE
            ? "Submit Score"
            : "Record Match"}
        </h1>
        <p className="text-muted-foreground mt-1">{gameType.name}</p>
      </div>

      {gameType.category === GameCategory.HEAD_TO_HEAD && (
        <RecordH2HMatchForm
          leagueId={leagueId}
          gameTypeId={gameTypeId}
          config={config as H2HConfig}
          participantOptions={participantOptions}
          currentUserId={session.user.id}
        />
      )}

      {gameType.category === GameCategory.FREE_FOR_ALL && (
        <RecordFFAMatchForm
          leagueId={leagueId}
          gameTypeId={gameTypeId}
          config={config as FFAConfig}
          participantOptions={participantOptions}
          currentUserId={session.user.id}
        />
      )}

      {gameType.category === GameCategory.HIGH_SCORE && (
        <SubmitHighScoreForm
          leagueId={leagueId}
          gameTypeId={gameTypeId}
          config={config as HighScoreConfig}
          participantOptions={participantOptions}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}

function buildParticipantOptions(
  members: LeagueMemberWithUser[],
  teams: Team[],
  placeholders: PlaceholderMember[],
): ParticipantOption[] {
  const options: ParticipantOption[] = [];

  for (const member of members) {
    options.push({
      id: member.userId,
      type: MatchParticipantType.USER,
      name: member.user.name,
      image: member.user.image,
      username: member.user.username,
      isSuspended: isSuspended(member),
    });
  }

  for (const team of teams) {
    if (!team.isArchived) {
      options.push({
        id: team.id,
        type: MatchParticipantType.TEAM,
        name: team.name,
        image: team.logo,
      });
    }
  }

  for (const placeholder of placeholders) {
    options.push({
      id: placeholder.id,
      type: MatchParticipantType.PLACEHOLDER,
      name: placeholder.displayName,
    });
  }

  return options;
}
