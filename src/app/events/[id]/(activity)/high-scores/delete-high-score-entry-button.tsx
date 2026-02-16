"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteHighScoreEntryAction } from "../../actions";

type Props = {
  entryId: string;
};

export function DeleteHighScoreEntryButton({ entryId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteHighScoreEntryAction({ entryId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Score deleted");
        router.refresh();
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
