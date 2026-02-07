"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GameType } from "@/db/schema";
import {
  GAME_CATEGORY_LABELS,
  GameCategory,
  ParticipantType,
  SEEDING_TYPE_LABELS,
  SeedingType,
} from "@/lib/shared/constants";
import {
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { createTournamentSchema } from "@/validators/tournaments";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ReactNode, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createTournamentAction } from "./actions";

type CreateTournamentFormValues = z.input<typeof createTournamentSchema>;

type CreateTournamentDialogProps = {
  leagueId: string;
  gameTypes: GameType[];
  trigger: ReactNode;
};

export function CreateTournamentDialog({
  leagueId,
  gameTypes,
  trigger,
}: CreateTournamentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const h2hGameTypes = gameTypes.filter(
    (gt) => gt.category === GameCategory.HEAD_TO_HEAD && !gt.isArchived,
  );

  const form = useForm<CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      leagueId,
      gameTypeId: h2hGameTypes.length === 1 ? h2hGameTypes[0].id : undefined,
      name: "",
      description: "",
      participantType: ParticipantType.INDIVIDUAL,
      seedingType: SeedingType.RANDOM,
    },
    mode: "onChange",
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const onSubmit = (values: CreateTournamentFormValues) => {
    startTransition(async () => {
      const result = await createTournamentAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof CreateTournamentFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Tournament created!");
        setOpen(false);
        form.reset();
        router.push(`/leagues/${leagueId}/tournaments/${result.data.id}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tournament</DialogTitle>
        </DialogHeader>

        {h2hGameTypes.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            <p>No head-to-head game types available.</p>
            <p className="text-sm mt-2">
              Create a head-to-head game type first to create a tournament.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="March Madness"
                        maxLength={TOURNAMENT_NAME_MAX_LENGTH}
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
                        placeholder="Describe the tournament..."
                        rows={3}
                        maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {(field.value || "").length}/
                      {TOURNAMENT_DESCRIPTION_MAX_LENGTH} characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gameTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a game type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {h2hGameTypes.map((gt) => (
                          <SelectItem key={gt.id} value={gt.id}>
                            {gt.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              (
                              {
                                GAME_CATEGORY_LABELS[
                                  gt.category as GameCategory
                                ]
                              }
                              )
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only head-to-head game types are supported.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participantType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participant Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ParticipantType.INDIVIDUAL}>
                          Individual
                        </SelectItem>
                        <SelectItem value={ParticipantType.TEAM}>
                          Team
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Whether individuals or teams compete in the bracket.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seedingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seeding</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SEEDING_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === SeedingType.RANDOM
                        ? "Participants will be randomly placed in the bracket."
                        : "You assign seed numbers to control bracket placement."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Tournament"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
