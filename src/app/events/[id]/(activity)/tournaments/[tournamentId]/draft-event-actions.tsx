"use client";

import { Button } from "@/components/ui/button";
import { Brackets } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { generateEventBracketAction } from "../../../actions";

type Props = {
  tournamentId: string;
  participantCount: number;
};

export function DraftEventActions({ tournamentId, participantCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleGenerateBracket = () => {
    startTransition(async () => {
      const result = await generateEventBracketAction({
        eventTournamentId: tournamentId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bracket generated!");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleGenerateBracket}
        disabled={isPending || participantCount < 2}
      >
        <Brackets className="mr-1 h-4 w-4" />
        {isPending ? "Generating..." : "Generate Bracket"}
      </Button>
    </div>
  );
}
