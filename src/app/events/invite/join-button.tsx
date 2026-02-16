"use client";

import { acceptEventInvitationAction } from "@/app/events/[id]/actions";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface JoinButtonProps {
  token: string;
  eventId: string;
}

export function JoinButton({ token, eventId }: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptEventInvitationAction({ token });
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        toast.success("Successfully joined event!");
        router.push(`/events/${eventId}`);
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
        Join Event
      </Button>
    </div>
  );
}
