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
  MAX_BEST_OF,
  MAX_FFA_GROUP_SIZE,
  MAX_FFA_TOURNAMENT_ROUNDS,
  MAX_SWISS_ROUNDS,
  MIN_FFA_GROUP_SIZE,
  MIN_SWISS_ROUNDS,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { updateEventTournamentSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, Trash2, Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateEventTournamentAction } from "../../../../actions";

const editFormSchema = updateEventTournamentSchema.pick({
  name: true,
  description: true,
  logo: true,
  tournamentType: true,
  seedingType: true,
  swissRounds: true,
  bestOf: true,
  roundBestOf: true,
  roundConfig: true,
  placementPointConfig: true,
});

type EditFormValues = z.input<typeof editFormSchema>;

type EditEventTournamentFormProps = {
  tournamentId: string;
  eventId: string;
  name: string;
  description: string | null;
  logo: string | null;
  status: string;
  tournamentType: string;
  seedingType: string;
  totalRounds: number | null;
  bestOf: number;
  roundBestOf: string | null;
  roundConfig: string | null;
  placementPointConfig: string | null;
  currentRound: number | null;
};

export function EditEventTournamentForm({
  tournamentId,
  eventId,
  name,
  description,
  logo,
  status,
  tournamentType,
  seedingType,
  totalRounds,
  bestOf,
  roundBestOf,
  roundConfig,
  placementPointConfig,
  currentRound,
}: EditEventTournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDraft = status === TournamentStatus.DRAFT;
  const isInProgress = status === TournamentStatus.IN_PROGRESS;
  const isCompleted = status === TournamentStatus.COMPLETED;

  const parsedRoundBestOf: Record<string, number> | undefined = (() => {
    if (!roundBestOf) return undefined;
    try {
      return JSON.parse(roundBestOf);
    } catch {
      return undefined;
    }
  })();

  const initialOverrides = parsedRoundBestOf
    ? Object.entries(parsedRoundBestOf).map(([round, bo]) => ({
        round,
        bestOf: String(bo),
      }))
    : [];

  const parsedRoundConfig = (() => {
    if (!roundConfig) return undefined;
    try {
      return JSON.parse(roundConfig) as Record<
        string,
        { groupSize: number; advanceCount: number }
      >;
    } catch {
      return undefined;
    }
  })();

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

  const [showPerRound, setShowPerRound] = useState(initialOverrides.length > 0);
  const [roundOverrides, setRoundOverrides] =
    useState<{ round: string; bestOf: string }[]>(initialOverrides);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name,
      description: description || "",
      logo: logo || undefined,
      tournamentType: tournamentType as TournamentType,
      seedingType: seedingType as SeedingType,
      swissRounds: totalRounds ?? undefined,
      bestOf,
      roundBestOf: parsedRoundBestOf,
      roundConfig:
        parsedRoundConfig ??
        (tournamentType === TournamentType.FFA_GROUP_STAGE
          ? {
              "1": { groupSize: 4, advanceCount: 1 },
              "2": { groupSize: 4, advanceCount: 0 },
            }
          : undefined),
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
  const isFFAGroupStage =
    watchedTournamentType === TournamentType.FFA_GROUP_STAGE;

  const updateRoundBestOfValue = (
    overrides: { round: string; bestOf: string }[],
  ) => {
    const config: Record<string, number> = {};
    for (const o of overrides) {
      const r = parseInt(o.round, 10);
      const b = parseInt(o.bestOf, 10);
      if (!isNaN(r) && r > 0 && !isNaN(b) && b > 0) {
        config[String(r)] = b;
      }
    }
    form.setValue(
      "roundBestOf",
      Object.keys(config).length > 0 ? config : undefined,
    );
  };

  const onSubmit = (values: EditFormValues) => {
    startTransition(async () => {
      const payload = isDraft
        ? values
        : {
            name: values.name,
            description: values.description,
            logo: values.logo,
            ...((isInProgress || isCompleted) && {
              placementPointConfig: values.placementPointConfig,
            }),
            ...(isInProgress && {
              bestOf: values.bestOf,
              roundBestOf: values.roundBestOf,
              ...(isSwiss && { swissRounds: values.swissRounds }),
            }),
          };
      const result = await updateEventTournamentAction(
        { eventTournamentId: tournamentId },
        payload,
      );
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof EditFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Tournament updated!");
        router.push(`/events/${eventId}/tournaments/${tournamentId}`);
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
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
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

        {isDraft && !isSwiss && !isFFAGroupStage && (
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

        {(isDraft || isInProgress) && isSwiss && (
          <FormField
            control={form.control}
            name="swissRounds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Number of Rounds{isDraft ? " (Optional)" : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={
                      isInProgress && currentRound
                        ? currentRound
                        : MIN_SWISS_ROUNDS
                    }
                    max={MAX_SWISS_ROUNDS}
                    placeholder={isDraft ? "Auto-calculated" : undefined}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : parseInt(value, 10));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {isDraft
                    ? "Leave blank to auto-calculate based on participant count (log2). Typically 3-7 rounds."
                    : `Currently on round ${currentRound ?? 0}. Set a higher number to add more rounds.`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isDraft && isFFAGroupStage && <EditFFARoundConfigEditor form={form} />}

        {(isDraft || isInProgress) && !isSwiss && !isFFAGroupStage && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="bestOf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Best Of</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v, 10))}
                      value={String(field.value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(
                          { length: Math.ceil(MAX_BEST_OF / 2) },
                          (_, i) => i * 2 + 1,
                        ).map((v) => (
                          <SelectItem key={v} value={String(v)}>
                            Best of {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Number of games per match (applies to all rounds by default)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!showPerRound ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPerRound(true)}
              >
                Customize Per Round
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Per-Round Overrides</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPerRound(false);
                      setRoundOverrides([]);
                      form.setValue("roundBestOf", undefined);
                    }}
                  >
                    Remove All
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Override the default best-of for specific rounds
                </p>
                {roundOverrides.map((override, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1">
                      {index === 0 && (
                        <label className="text-sm font-medium">Round</label>
                      )}
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="Round #"
                        value={override.round}
                        onChange={(e) => {
                          const updated = [...roundOverrides];
                          updated[index] = {
                            ...updated[index],
                            round: e.target.value,
                          };
                          setRoundOverrides(updated);
                          updateRoundBestOfValue(updated);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      {index === 0 && (
                        <label className="text-sm font-medium">Best Of</label>
                      )}
                      <Select
                        value={override.bestOf}
                        onValueChange={(v) => {
                          const updated = [...roundOverrides];
                          updated[index] = { ...updated[index], bestOf: v };
                          setRoundOverrides(updated);
                          updateRoundBestOfValue(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Best of..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: Math.ceil(MAX_BEST_OF / 2) },
                            (_, i) => i * 2 + 1,
                          ).map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              Bo{v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = roundOverrides.filter(
                          (_, i) => i !== index,
                        );
                        setRoundOverrides(updated);
                        updateRoundBestOfValue(updated);
                      }}
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
                    setRoundOverrides([
                      ...roundOverrides,
                      { round: "", bestOf: "1" },
                    ])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Round Override
                </Button>
              </div>
            )}
          </div>
        )}

        {(isDraft || isInProgress || isCompleted) && (
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

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
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

function EditFFARoundConfigEditor({
  form,
}: {
  form: ReturnType<typeof useForm<EditFormValues>>;
}) {
  const existingConfig = form.getValues("roundConfig");
  const initialRounds = (() => {
    if (existingConfig && typeof existingConfig === "object") {
      const entries = Object.entries(existingConfig).sort(
        ([a], [b]) => Number(a) - Number(b),
      );
      if (entries.length > 0) {
        return entries.map(([, v]) => ({
          groupSize: String(v.groupSize),
          advanceCount: String(v.advanceCount),
        }));
      }
    }
    return [
      { groupSize: "4", advanceCount: "1" },
      { groupSize: "4", advanceCount: "0" },
    ];
  })();

  const [rounds, setRounds] =
    useState<{ groupSize: string; advanceCount: string }[]>(initialRounds);

  const updateFormRoundConfig = (
    updated: { groupSize: string; advanceCount: string }[],
  ) => {
    const config: Record<string, { groupSize: number; advanceCount: number }> =
      {};
    for (let i = 0; i < updated.length; i++) {
      const gs = parseInt(updated[i].groupSize, 10);
      const ac = parseInt(updated[i].advanceCount, 10);
      if (!isNaN(gs) && !isNaN(ac)) {
        config[String(i + 1)] = { groupSize: gs, advanceCount: ac };
      }
    }
    form.setValue(
      "roundConfig",
      Object.keys(config).length > 0 ? config : undefined,
    );
  };

  const addRound = () => {
    const updated = [...rounds];
    if (updated.length > 0) {
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        advanceCount: "1",
      };
    }
    updated.push({ groupSize: "4", advanceCount: "0" });
    setRounds(updated);
    updateFormRoundConfig(updated);
  };

  const removeRound = () => {
    if (rounds.length <= 1) return;
    const updated = rounds.slice(0, -1);
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      advanceCount: "0",
    };
    setRounds(updated);
    updateFormRoundConfig(updated);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Round Configuration</h4>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeRound}
            disabled={rounds.length <= 1}
          >
            <Minus className="mr-1 h-3 w-3" />
            Remove Round
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRound}
            disabled={rounds.length >= MAX_FFA_TOURNAMENT_ROUNDS}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Round
          </Button>
        </div>
      </div>

      {rounds.map((round, index) => {
        const isFinal = index === rounds.length - 1;
        return (
          <div key={index} className="flex items-end gap-3">
            <div className="w-24 shrink-0 pb-2 text-sm font-medium">
              {isFinal ? "Final" : `Round ${index + 1}`}
            </div>
            <div className="flex-1">
              {index === 0 && (
                <label className="text-sm font-medium">Group Size</label>
              )}
              <Input
                type="number"
                min={MIN_FFA_GROUP_SIZE}
                max={MAX_FFA_GROUP_SIZE}
                step={1}
                value={round.groupSize}
                onChange={(e) => {
                  const updated = [...rounds];
                  updated[index] = {
                    ...updated[index],
                    groupSize: e.target.value,
                  };
                  setRounds(updated);
                  updateFormRoundConfig(updated);
                }}
              />
            </div>
            <div className="flex-1">
              {index === 0 && (
                <label className="text-sm font-medium">Advance Count</label>
              )}
              <Input
                type="number"
                min={0}
                step={1}
                value={isFinal ? "0" : round.advanceCount}
                disabled={isFinal}
                onChange={(e) => {
                  if (isFinal) return;
                  const updated = [...rounds];
                  updated[index] = {
                    ...updated[index],
                    advanceCount: e.target.value,
                  };
                  setRounds(updated);
                  updateFormRoundConfig(updated);
                }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-muted-foreground text-xs">
        Configure the group size and how many advance from each group per round.
        The final round advance count is always 0.
      </p>
    </div>
  );
}
