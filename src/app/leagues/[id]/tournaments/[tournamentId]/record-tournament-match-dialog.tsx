"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TournamentRoundMatchWithDetails } from "@/db/tournaments";
import { cn } from "@/lib/shared/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { recordTournamentMatchResultAction } from "../actions";

type RecordTournamentMatchDialogProps = {
  match: TournamentRoundMatchWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasScoring: boolean;
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

export function RecordTournamentMatchDialog({
  match,
  open,
  onOpenChange,
  hasScoring,
}: RecordTournamentMatchDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [side1Score, setSide1Score] = useState<string>("");
  const [side2Score, setSide2Score] = useState<string>("");

  if (!match) return null;

  const p1Name = getParticipantName(match.participant1);
  const p2Name = getParticipantName(match.participant2);

  const scoresValid = !hasScoring || (side1Score !== "" && side2Score !== "");

  const handleSubmit = () => {
    if (!selectedWinnerId) return;
    if (hasScoring && (side1Score === "" || side2Score === "")) return;
    startTransition(async () => {
      const input: Record<string, unknown> = {
        tournamentMatchId: match.id,
        winnerId: selectedWinnerId,
        playedAt: new Date(),
      };

      if (side1Score !== "") input.side1Score = parseFloat(side1Score);
      if (side2Score !== "") input.side2Score = parseFloat(side2Score);

      const result = await recordTournamentMatchResultAction(input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Match result recorded");
        onOpenChange(false);
        setSelectedWinnerId(null);
        setSide1Score("");
        setSide2Score("");
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Match Result</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm mb-2 block">Select Winner</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={
                  selectedWinnerId === match.participant1Id
                    ? "default"
                    : "outline"
                }
                className={cn("h-auto py-3 text-wrap")}
                onClick={() => setSelectedWinnerId(match.participant1Id)}
              >
                {p1Name}
              </Button>
              <Button
                type="button"
                variant={
                  selectedWinnerId === match.participant2Id
                    ? "default"
                    : "outline"
                }
                className={cn("h-auto py-3 text-wrap")}
                onClick={() => setSelectedWinnerId(match.participant2Id)}
              >
                {p2Name}
              </Button>
            </div>
          </div>

          {hasScoring && (
            <div>
              <Label className="text-sm mb-2 block">Scores</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {p1Name}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Score"
                    value={side1Score}
                    onChange={(e) => setSide1Score(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {p2Name}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Score"
                    value={side2Score}
                    onChange={(e) => setSide2Score(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedWinnerId || !scoresValid || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Result"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
