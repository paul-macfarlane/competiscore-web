"use client";

import {
  ParticipantData,
  ParticipantDisplay,
} from "@/components/participant-display";
import {
  RecordH2HMatchForm,
  TournamentMatchProps,
} from "@/components/record-h2h-match-form";
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
import {
  TournamentParticipantWithDetails,
  TournamentRoundMatchWithDetails,
} from "@/db/tournaments";
import { H2HConfig } from "@/lib/shared/game-templates";
import {
  SwissMatchRecord,
  computeSwissStandings,
  getSwissRanking,
} from "@/lib/shared/swiss-pairing";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { recordTournamentMatchResultAction } from "../actions";

type SwissTournamentViewProps = {
  bracket: TournamentRoundMatchWithDetails[];
  participants: TournamentParticipantWithDetails[];
  totalRounds: number;
  canManage: boolean;
  config: H2HConfig;
  leagueId: string;
  gameTypeId: string;
  isCompleted: boolean;
};

function getParticipantName(
  participant: TournamentRoundMatchWithDetails["participant1"],
): string {
  if (!participant) return "TBD";
  if (participant.user) return participant.user.name;
  if (participant.team) return participant.team.name;
  if (participant.placeholderMember)
    return participant.placeholderMember.displayName;
  return "TBD";
}

function renderParticipant(
  participant: TournamentRoundMatchWithDetails["participant1"],
) {
  if (!participant) return <span className="text-muted-foreground">TBD</span>;

  const data: ParticipantData = {
    user: participant.user,
    team: participant.team,
    placeholderMember: participant.placeholderMember,
  };

  return <ParticipantDisplay participant={data} showAvatar size="sm" />;
}

export function SwissTournamentView({
  bracket,
  participants,
  totalRounds,
  canManage,
  config,
  leagueId,
  gameTypeId,
  isCompleted,
}: SwissTournamentViewProps) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] =
    useState<TournamentRoundMatchWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const standings = useMemo(() => {
    const participantNames = participants.map((p) => ({
      id: p.id,
      name:
        p.user?.name ??
        p.team?.name ??
        p.placeholderMember?.displayName ??
        "Unknown",
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
  }, [bracket, participants]);

  const ranking = useMemo(() => getSwissRanking(standings), [standings]);

  const participantMap = useMemo(() => {
    const map = new Map<string, TournamentParticipantWithDetails>();
    for (const p of participants) {
      map.set(p.id, p);
    }
    return map;
  }, [participants]);

  const currentRound = Math.max(...bracket.map((m) => m.round), 0);
  const rounds = Array.from({ length: currentRound }, (_, i) => i + 1);

  const handleMatchClick = (match: TournamentRoundMatchWithDetails) => {
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
        side1Name: getParticipantName(selectedMatch.participant1),
        side2Name: getParticipantName(selectedMatch.participant2),
        side1Participant: selectedMatch.participant1
          ? {
              user: selectedMatch.participant1.user,
              team: selectedMatch.participant1.team,
              placeholderMember: selectedMatch.participant1.placeholderMember,
            }
          : undefined,
        side2Participant: selectedMatch.participant2
          ? {
              user: selectedMatch.participant2.user,
              team: selectedMatch.participant2.team,
              placeholderMember: selectedMatch.participant2.placeholderMember,
            }
          : undefined,
        allowDraw: true,
        onSubmitAction: recordTournamentMatchResultAction,
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
                      {p ? (
                        <ParticipantDisplay
                          participant={{
                            user: p.user,
                            team: p.team,
                            placeholderMember: p.placeholderMember,
                          }}
                          showAvatar
                          size="sm"
                        />
                      ) : (
                        s.name
                      )}
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
                              {renderParticipant(match.participant1)}
                              <span className="text-sm text-muted-foreground">
                                (Bye)
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {renderParticipant(match.participant1)}
                              <span className="text-sm text-muted-foreground">
                                vs
                              </span>
                              {renderParticipant(match.participant2)}
                              {match.participant1Score !== null && (
                                <span className="text-sm text-muted-foreground">
                                  ({match.participant1Score} -{" "}
                                  {match.participant2Score})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 ml-2">
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
                                  ? getParticipantName(match.participant1)
                                  : getParticipantName(match.participant2)}{" "}
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
              leagueId={leagueId}
              gameTypeId={gameTypeId}
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
