"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { leaveLeagueAction } from "./(manage)/settings/actions";

interface LeaveLeagueButtonProps {
  leagueId: string;
  isSoleExecutive: boolean;
}

export function LeaveLeagueButton({
  leagueId,
  isSoleExecutive,
}: LeaveLeagueButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleLeave = () => {
    setError(null);

    startTransition(async () => {
      const result = await leaveLeagueAction({ leagueId });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push("/leagues");
      }
    });
  };

  if (isSoleExecutive) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <LogOut className="mr-2 h-4 w-4" />
          Leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave this league?</DialogTitle>
          <DialogDescription>
            You will no longer be able to access this league unless you rejoin.
            Your match history will be preserved.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/10 rounded-md p-3">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={isPending}
          >
            {isPending ? "Leaving..." : "Leave League"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
