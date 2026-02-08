"use client";

import { SimpleIconSelector } from "@/components/icon-selector";
import { MarkdownInput } from "@/components/markdown-input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GameType } from "@/db/schema";
import { GAME_ICON_OPTIONS, GameCategory } from "@/lib/shared/constants";
import { parseGameConfig } from "@/lib/shared/game-config-parser";
import {
  GAME_TYPE_DESCRIPTION_MAX_LENGTH,
  GAME_TYPE_NAME_MAX_LENGTH,
  RULES_MAX_LENGTH,
} from "@/services/constants";
import {
  UpdateGameTypeFormValues,
  updateGameTypeFormSchema,
} from "@/validators/game-types";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  archiveGameTypeAction,
  deleteGameTypeAction,
  updateGameTypeAction,
} from "../actions";

type EditGameTypeFormProps = {
  gameType: GameType;
  leagueId: string;
};

export function EditGameTypeForm({
  gameType,
  leagueId,
}: EditGameTypeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDelete = deleteConfirmText === gameType.name;

  const config = parseGameConfig(gameType.config, gameType.category);
  const rules = "rules" in config ? config.rules : undefined;

  const form = useForm<UpdateGameTypeFormValues>({
    resolver: zodResolver(updateGameTypeFormSchema),
    defaultValues: {
      category: gameType.category as GameCategory,
      name: gameType.name,
      description: gameType.description || "",
      logo: gameType.logo || undefined,
      config: {
        rules: rules || "",
      },
    },
    mode: "onChange",
  });

  const onSubmit = (values: UpdateGameTypeFormValues) => {
    startTransition(async () => {
      const result = await updateGameTypeAction(
        { gameTypeId: gameType.id },
        values,
      );

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof UpdateGameTypeFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Game type updated successfully!");
        router.refresh();
      }
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveGameTypeAction({ gameTypeId: gameType.id });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Game type archived successfully!");
        router.push(`/leagues/${leagueId}/game-types`);
      }
    });
  };

  const handleDelete = () => {
    if (!canDelete) return;
    setDeleteError(null);

    startTransition(async () => {
      const result = await deleteGameTypeAction({ gameTypeId: gameType.id });

      if (result.error) {
        setDeleteError(result.error);
      } else {
        setIsDeleteDialogOpen(false);
        toast.success("Game type deleted successfully!");
        router.push(`/leagues/${leagueId}/game-types`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 rounded-lg border bg-card text-card-foreground p-4 md:p-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Game Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ping Pong"
                    maxLength={GAME_TYPE_NAME_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the game..."
                    maxLength={GAME_TYPE_DESCRIPTION_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icon (Optional)</FormLabel>
                <div className="flex items-center gap-3">
                  {field.value ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      <Image
                        src={field.value}
                        alt="Game icon"
                        fill
                        className="object-cover p-1"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                      <span className="text-muted-foreground text-xs">
                        No icon
                      </span>
                    </div>
                  )}
                  <SimpleIconSelector
                    options={GAME_ICON_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    trigger={
                      <Button variant="outline" type="button" size="sm">
                        {field.value ? "Change Icon" : "Select Icon"}
                      </Button>
                    }
                    title="Select a Game Icon"
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="config.rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rules (Optional)</FormLabel>
                <FormControl>
                  <MarkdownInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Enter rules in markdown format..."
                    maxLength={RULES_MAX_LENGTH}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Game category and scoring configuration
              cannot be changed after creation to preserve historical data
              integrity. If you need different settings, create a new game type.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>

      <div className="rounded-lg border border-destructive/50 bg-card text-card-foreground p-4 md:p-6 space-y-4">
        <div>
          <h3 className="font-medium text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Irreversible actions for this game type
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Archive Game Type</p>
              <p className="text-sm text-muted-foreground">
                Hide this game type from the list (preserves history)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={isPending}
            >
              Archive
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Game Type</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this game type and all associated data
              </p>
            </div>
            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) {
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={isPending}>
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this game type permanently?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the game type and all
                    associated match history. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  <Label htmlFor="delete-confirm">
                    Type <span className="font-semibold">{gameType.name}</span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={gameType.name}
                  />
                </div>
                {deleteError && (
                  <div className="bg-destructive/10 rounded-md p-3">
                    <p className="text-destructive text-sm">{deleteError}</p>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending || !canDelete}
                  >
                    {isPending ? "Deleting..." : "Delete Forever"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
