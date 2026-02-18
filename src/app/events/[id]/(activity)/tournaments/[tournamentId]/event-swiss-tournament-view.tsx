"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import {
  RecordH2HMatchForm,
  TournamentMatchProps,
} from "@/components/record-h2h-match-form";
import { TeamColorBadge } from "@/components/team-color-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { H2HConfig } from "@/lib/shared/game-templates";
import {
  SwissMatchRecord,
  computeSwissStandings,
  getSwissRanking,
} from "@/lib/shared/swiss-pairing";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { recordEventTournamentMatchResultAction } from "../../../actions";

type PartnershipMember = {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  placeholderParticipant: { id: string; displayName: string } | null;
};

type BracketParticipant = {
  id: string;
  team: {
    id: string;
    name: string;
    logo: string | null;
    color: string | null;
  };
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  placeholderParticipant: { id: string; displayName: string } | null;
  members?: PartnershipMember[];
};

type BracketMatch = {
  id: string;
  round: number;
  position: number;
  participant1Id: string | null;
  participant2Id: string | null;
  participant1?: BracketParticipant | null;
  participant2?: BracketParticipant | null;
  participant1Score: number | null;
  participant2Score: number | null;
  winnerId: string | null;
  isDraw: boolean;
  isBye: boolean;
  isForfeit: boolean;
};

type Props = {
  bracket: BracketMatch[];
  participants: {
    id: string;
    team: {
      id: string;
      name: string;
      logo: string | null;
      color: string | null;
    };
    user: {
      id: string;
      name: string;
      username: string;
      image: string | null;
    } | null;
    placeholderParticipant: { id: string; displayName: string } | null;
    members?: PartnershipMember[];
  }[];
  totalRounds: number;
  canManage: boolean;
  eventId: string;
  isTeamTournament: boolean;
  isCompleted: boolean;
  config: H2HConfig;
};

function getParticipantName(
  participant: BracketParticipant | null | undefined,
  isTeamTournament?: boolean,
): string {
  if (!participant) return "TBD";
  if (participant.members && participant.members.length > 0) {
    return participant.members
      .map(
        (m) =>
          m.user?.name ?? m.placeholderParticipant?.displayName ?? "Unknown",
      )
      .join(" & ");
  }
  if (isTeamTournament) return participant.team.name;
  return (
    participant.user?.name ??
    participant.placeholderParticipant?.displayName ??
    "TBD"
  );
}

function renderParticipant(
  participant: BracketParticipant | null | undefined,
  isTeamTournament: boolean,
) {
  if (!participant) return <span className="text-muted-foreground">TBD</span>;

  if (participant.members && participant.members.length > 0) {
    const name = participant.members
      .map(
        (m) =>
          m.user?.name ?? m.placeholderParticipant?.displayName ?? "Unknown",
      )
      .join(" & ");
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        {name}
        {!isTeamTournament &&
          (participant.team.color ? (
            <TeamColorBadge
              name={participant.team.name}
              color={participant.team.color}
            />
          ) : (
            <span className="text-muted-foreground text-xs font-normal">
              ({participant.team.name})
            </span>
          ))}
      </span>
    );
  }

  const data: ParticipantData = isTeamTournament
    ? { team: participant.team }
    : {
        user: participant.user,
        placeholderMember: participant.placeholderParticipant,
      };

  return (
    <ParticipantDisplay
      participant={data}
      showAvatar
      size="sm"
      teamName={!isTeamTournament ? participant.team.name : undefined}
      teamColor={!isTeamTournament ? participant.team.color : undefined}
    />
  );
}

export function EventSwissTournamentView({
  bracket,
  participants,
  totalRounds,
  canManage,
  eventId,
  isTeamTournament,
  isCompleted,
  config,
}: Props) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const standings = useMemo(() => {
    const participantNames = participants.map((p) => ({
      id: p.id,
      name: getParticipantName(
        {
          ...p,
          members: p.members,
        },
        isTeamTournament,
      ),
    }));

    const matchRecords: SwissMatchRecord[] = bracket.map((m) => ({
      participant1Id: m.participant1Id,
      participant2Id: m.participant2Id,
      winnerId: m.winnerId,
      isDraw: m.isDraw,
      isBye: m.isBye,
      isForfeit: m.isForfeit,
    }));

    return computeSwissStandings(participantNames, matchRecords);
  }, [bracket, participants, isTeamTournament]);

  const ranking = useMemo(() => getSwissRanking(standings), [standings]);

  const participantMap = useMemo(() => {
    const map = new Map<string, (typeof participants)[0]>();
    for (const p of participants) {
      map.set(p.id, p);
    }
    return map;
  }, [participants]);

  const currentRound = Math.max(...bracket.map((m) => m.round), 0);
  const rounds = Array.from({ length: currentRound }, (_, i) => i + 1);

  const handleMatchClick = (match: BracketMatch) => {
    setSelectedMatch(match);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    router.refresh();
  };

  const handleCancel = () => {
    setDialogOpen(false);
  };

  const tournamentMatch: TournamentMatchProps | undefined = selectedMatch
    ? {
        tournamentMatchId: selectedMatch.id,
        side1Name: getParticipantName(
          selectedMatch.participant1,
          isTeamTournament,
        ),
        side2Name: getParticipantName(
          selectedMatch.participant2,
          isTeamTournament,
        ),
        side1Participant: selectedMatch.participant1
          ? {
              user: selectedMatch.participant1.user,
              team: selectedMatch.participant1.team,
              placeholderMember:
                selectedMatch.participant1.placeholderParticipant,
            }
          : undefined,
        side2Participant: selectedMatch.participant2
          ? {
              user: selectedMatch.participant2.user,
              team: selectedMatch.participant2.team,
              placeholderMember:
                selectedMatch.participant2.placeholderParticipant,
            }
          : undefined,
        side1TeamName: !isTeamTournament
          ? selectedMatch.participant1?.team.name
          : undefined,
        side2TeamName: !isTeamTournament
          ? selectedMatch.participant2?.team.name
          : undefined,
        side1TeamColor: !isTeamTournament
          ? selectedMatch.participant1?.team.color
          : undefined,
        side2TeamColor: !isTeamTournament
          ? selectedMatch.participant2?.team.color
          : undefined,
        allowDraw: true,
        onSubmitAction: recordEventTournamentMatchResultAction,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Standings</span>
            <Badge variant="outline">
              Round {currentRound} of {totalRounds}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">W-D-L</TableHead>
                <TableHead className="text-center">Buchholz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((s, i) => {
                const p = participantMap.get(s.participantId);
                return (
                  <TableRow key={s.participantId}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      {p ? renderParticipant(p, isTeamTournament) : s.name}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {s.points}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {s.wins}-{s.draws}-{s.losses}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {s.buchholz}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {rounds
        .slice()
        .reverse()
        .map((round) => {
          const roundMatches = bracket
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position);

          return (
            <Card key={round}>
              <CardHeader>
                <CardTitle className="text-base">Round {round}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roundMatches.map((match) => {
                    const isResolved =
                      match.winnerId !== null || match.isDraw || match.isBye;
                    const isPending =
                      !isResolved &&
                      match.participant1Id &&
                      match.participant2Id;

                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          {match.isBye ? (
                            <div className="flex items-center gap-2">
                              {renderParticipant(
                                match.participant1,
                                isTeamTournament,
                              )}
                              <span className="text-sm text-muted-foreground">
                                (Bye)
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {renderParticipant(
                                match.participant1,
                                isTeamTournament,
                              )}
                              <span className="text-sm text-muted-foreground">
                                vs
                              </span>
                              {renderParticipant(
                                match.participant2,
                                isTeamTournament,
                              )}
                              {match.participant1Score !== null && (
                                <span className="text-sm text-muted-foreground">
                                  ({match.participant1Score} -{" "}
                                  {match.participant2Score})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-2 shrink-0">
                          {match.isDraw && (
                            <Badge variant="secondary">Draw</Badge>
                          )}
                          {match.isForfeit && (
                            <Badge variant="outline">Forfeit</Badge>
                          )}
                          {!match.isBye &&
                            !match.isDraw &&
                            !match.isForfeit &&
                            match.winnerId && (
                              <Badge variant="default">
                                {match.winnerId === match.participant1Id
                                  ? getParticipantName(
                                      match.participant1,
                                      isTeamTournament,
                                    )
                                  : getParticipantName(
                                      match.participant2,
                                      isTeamTournament,
                                    )}{" "}
                                wins
                              </Badge>
                            )}
                          {isPending && canManage && !isCompleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMatchClick(match)}
                            >
                              Record Result
                            </Button>
                          )}
                          {isPending && !canManage && (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Match Result</DialogTitle>
          </DialogHeader>
          {tournamentMatch && (
            <RecordH2HMatchForm
              leagueId={eventId}
              gameTypeId=""
              config={config}
              participantOptions={[]}
              currentUserId=""
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              tournamentMatch={tournamentMatch}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
