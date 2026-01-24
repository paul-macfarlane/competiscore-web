"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { joinViaInviteLinkAction } from "./actions";

interface JoinButtonProps {
  token: string;
  leagueId: string;
}

export function JoinButton({ token, leagueId }: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      const result = await joinViaInviteLinkAction(token);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        toast.success("Successfully joined league!");
        router.push(`/leagues/${leagueId}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      <Button onClick={handleJoin} disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Join League
      </Button>
    </div>
  );
}
