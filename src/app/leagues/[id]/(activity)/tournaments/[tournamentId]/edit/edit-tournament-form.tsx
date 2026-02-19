/* eslint-disable react-hooks/incompatible-library */
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
import {
  SEEDING_TYPE_LABELS,
  SeedingType,
  TOURNAMENT_ICON_OPTIONS,
  TOURNAMENT_TYPE_LABELS,
  TournamentStatus,
  TournamentType,
} from "@/lib/shared/constants";
import {
  MAX_SWISS_ROUNDS,
  MIN_SWISS_ROUNDS,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { updateTournamentSchema } from "@/validators/tournaments";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateTournamentAction } from "../../actions";

const editTournamentFormSchema = updateTournamentSchema.pick({
  name: true,
  description: true,
  logo: true,
  tournamentType: true,
  seedingType: true,
  swissRounds: true,
  placementPointConfig: true,
});

type EditTournamentFormValues = z.input<typeof editTournamentFormSchema>;

type EditTournamentFormProps = {
  tournamentId: string;
  leagueId: string;
  name: string;
  description: string | null;
  logo: string | null;
  status: string;
  tournamentType: string;
  seedingType: string;
  totalRounds: number | null;
  placementPointConfig: string | null;
};

export function EditTournamentForm({
  tournamentId,
  leagueId,
  name,
  description,
  logo,
  status,
  tournamentType,
  seedingType,
  totalRounds,
  placementPointConfig,
}: EditTournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDraft = status === TournamentStatus.DRAFT;

  const parsedPlacementPoints = (() => {
    if (!placementPointConfig) return [];
    try {
      return JSON.parse(placementPointConfig) as Array<{
        placement: number;
        points: number;
      }>;
    } catch {
      return [];
    }
  })();

  const form = useForm<EditTournamentFormValues>({
    resolver: zodResolver(editTournamentFormSchema),
    defaultValues: {
      name,
      description: description || "",
      logo: logo || undefined,
      tournamentType: tournamentType as TournamentType,
      seedingType: seedingType as SeedingType,
      swissRounds: totalRounds ?? undefined,
      placementPointConfig: parsedPlacementPoints,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "placementPointConfig",
  });

  const watchedTournamentType = form.watch("tournamentType");
  const isSwiss = watchedTournamentType === TournamentType.SWISS;

  const onSubmit = (values: EditTournamentFormValues) => {
    startTransition(async () => {
      const payload = isDraft
        ? values
        : {
            name: values.name,
            description: values.description,
            logo: values.logo,
          };
      const result = await updateTournamentAction({ tournamentId }, payload);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof EditTournamentFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Tournament updated!");
        router.push(`/leagues/${leagueId}/tournaments/${tournamentId}`);
      }
    });
  };

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
                  onClear={() => field.onChange("")}
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

        {isDraft && (
          <FormField
            control={form.control}
            name="tournamentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tournament Format</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    if (val === TournamentType.SWISS) {
                      form.setValue("seedingType", undefined);
                    } else {
                      form.setValue("seedingType", SeedingType.RANDOM);
                      form.setValue("swissRounds", undefined);
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TOURNAMENT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {isSwiss
                    ? "Participants play a fixed number of rounds against opponents with similar scores. No one is eliminated."
                    : "Lose and you're out. Last one standing wins."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isDraft && !isSwiss && (
          <FormField
            control={form.control}
            name="seedingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seeding</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? SeedingType.RANDOM}
                >
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
        )}

        {isDraft && isSwiss && (
          <FormField
            control={form.control}
            name="swissRounds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Rounds (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={MIN_SWISS_ROUNDS}
                    max={MAX_SWISS_ROUNDS}
                    placeholder="Auto-calculated"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseInt(value, 10),
                      );
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Leave blank to auto-calculate based on participant count
                  (log2). Typically 3-7 rounds.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isDraft && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">
                Placement Points (Optional)
              </h3>
              <p className="text-muted-foreground text-sm">
                Points awarded based on final tournament placement
              </p>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`placementPointConfig.${index}.placement`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {index === 0 && <FormLabel>Placement</FormLabel>}
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="Place"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === "" ? "" : parseInt(value, 10),
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`placementPointConfig.${index}.points`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {index === 0 && <FormLabel>Points</FormLabel>}
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Points"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === "" ? "" : parseFloat(value),
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ placement: fields.length + 1, points: 0 })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Placement
            </Button>
          </div>
        )}

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
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
