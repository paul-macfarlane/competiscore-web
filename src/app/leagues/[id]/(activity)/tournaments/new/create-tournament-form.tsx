"use client";

import { SimpleIconSelector } from "@/components/icon-selector";
import { Button } from "@/components/ui/button";
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
  TOURNAMENT_ICON_OPTIONS,
} from "@/lib/shared/constants";
import {
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { createTournamentSchema } from "@/validators/tournaments";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createTournamentAction } from "../actions";

type CreateTournamentFormValues = z.input<typeof createTournamentSchema>;

type CreateTournamentFormProps = {
  leagueId: string;
  gameTypes: GameType[];
};

export function CreateTournamentForm({
  leagueId,
  gameTypes,
}: CreateTournamentFormProps) {
  const router = useRouter();
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
      logo: undefined,
      participantType: ParticipantType.INDIVIDUAL,
      seedingType: SeedingType.RANDOM,
    },
    mode: "onChange",
  });

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
        router.push(`/leagues/${leagueId}/tournaments/${result.data.id}`);
      }
    });
  };

  if (h2hGameTypes.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <p>No head-to-head game types available.</p>
        <p className="text-sm mt-2">
          Create a head-to-head game type first to create a tournament.
        </p>
      </div>
    );
  }

  return (
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
                {(field.value || "").length}/{TOURNAMENT_DESCRIPTION_MAX_LENGTH}{" "}
                characters
              </FormDescription>
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
                      alt="Tournament icon"
                      fill
                      className="object-cover p-1"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                    <Trophy className="text-muted-foreground h-8 w-8" />
                  </div>
                )}
                <SimpleIconSelector
                  options={TOURNAMENT_ICON_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  trigger={
                    <Button variant="outline" type="button" size="sm">
                      {field.value ? "Change Icon" : "Select Icon"}
                    </Button>
                  }
                  title="Select a Tournament Icon"
                />
              </div>
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
                        ({GAME_CATEGORY_LABELS[gt.category as GameCategory]})
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
                  <SelectItem value={ParticipantType.TEAM}>Team</SelectItem>
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
                  {Object.entries(SEEDING_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
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

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Creating..." : "Create Tournament"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
