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
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/client/auth";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAccountAction } from "./actions";

const CONFIRMATION_TEXT = "DELETE";

export function DeleteAccountSection() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmText === CONFIRMATION_TEXT;

  const handleDelete = () => {
    if (!isConfirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result.error) {
        setError(result.error);
        return;
      }

      await authClient.signOut();

      router.push("/");
      router.refresh();
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmText("");
      setError(null);
    }
  };

  return (
    <div className="rounded-lg border border-destructive/50 p-4 md:p-6">
      <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Permanently delete your account and all associated data. This action
        cannot be undone.
      </p>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            Delete Account
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. Your account will
              be anonymized and you will no longer be able to sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To confirm, type{" "}
              <span className="font-mono font-semibold text-foreground">
                {CONFIRMATION_TEXT}
              </span>{" "}
              below:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              disabled={isPending}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmed || isPending}
            >
              {isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
