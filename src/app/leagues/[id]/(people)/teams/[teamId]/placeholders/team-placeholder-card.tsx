"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { removeTeamMemberAction } from "../../actions";

type TeamPlaceholderCardProps = {
  teamMemberId: string;
  placeholder: {
    id: string;
    displayName: string;
  };
};

export function TeamPlaceholderCard({
  teamMemberId,
  placeholder,
}: TeamPlaceholderCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeTeamMemberAction({
        teamMemberId,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${placeholder.displayName} removed from team`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>
          {placeholder.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium wrap-break-word">{placeholder.displayName}</p>
        <p className="text-sm text-muted-foreground">Placeholder member</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRemove}
        disabled={isPending}
      >
        <UserMinus className="mr-2 h-4 w-4" />
        {isPending ? "Removing..." : "Remove"}
      </Button>
    </div>
  );
}
