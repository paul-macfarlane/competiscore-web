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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GameCategory,
  ParticipantType,
  SEEDING_TYPE_LABELS,
  TOURNAMENT_ICON_OPTIONS,
} from "@/lib/shared/constants";
import {
  getPartnershipSize,
  isPartnershipGameType,
  parseH2HConfig,
} from "@/lib/shared/game-config-parser";
import {
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { MAX_BEST_OF } from "@/services/constants";
import { createEventTournamentSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Plus, Trash2, Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createEventTournamentAction } from "../../../actions";

type FormValues = z.input<typeof createEventTournamentSchema>;

type Props = {
  eventId: string;
  gameTypes: { id: string; name: string; category: string; config: string }[];
};

function BestOfSection({
  form,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
}) {
  const [showPerRound, setShowPerRound] = useState(false);
  const [roundOverrides, setRoundOverrides] = useState<
    { round: string; bestOf: string }[]
  >([]);

  const updateRoundBestOf = (
    overrides: { round: string; bestOf: string }[],
  ) => {
    const config: Record<string, number> = {};
    for (const o of overrides) {
      const round = parseInt(o.round, 10);
      const bestOf = parseInt(o.bestOf, 10);
      if (!isNaN(round) && round > 0 && !isNaN(bestOf) && bestOf > 0) {
        config[String(round)] = bestOf;
      }
    }
    form.setValue(
      "roundBestOf",
      Object.keys(config).length > 0 ? config : undefined,
    );
  };

  return (
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
            Override the default best-of for specific rounds (e.g., round 3 =
            semifinals)
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
                    updateRoundBestOf(updated);
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
                    updateRoundBestOf(updated);
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
                  const updated = roundOverrides.filter((_, i) => i !== index);
                  setRoundOverrides(updated);
                  updateRoundBestOf(updated);
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
              setRoundOverrides([...roundOverrides, { round: "", bestOf: "1" }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Round Override
          </Button>
        </div>
      )}
    </div>
  );
}

export function CreateEventTournamentForm({ eventId, gameTypes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(createEventTournamentSchema),
    defaultValues: {
      eventId,
      gameTypeId: gameTypes.length === 1 ? gameTypes[0].id : "",
      name: "",
      description: "",
      logo: "",
      participantType: ParticipantType.INDIVIDUAL,
      seedingType: "random",
      bestOf: 1,
      placementPointConfig: [
        { placement: 1, points: 10 },
        { placement: 2, points: 7 },
        { placement: 3, points: 5 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "placementPointConfig",
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await createEventTournamentAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof FormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Tournament created!");
        router.push(`/events/${eventId}/tournaments/${result.data.id}`);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Tournament name"
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
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tournament description"
                  maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
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
              <FormLabel>Icon (optional)</FormLabel>
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

        <FormField
          control={form.control}
          name="gameTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {gameTypes.map((gt) => (
                    <SelectItem key={gt.id} value={gt.id}>
                      {gt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={ParticipantType.INDIVIDUAL}
                      id="participant_type_individual"
                    />
                    <label htmlFor="participant_type_individual">
                      Individual
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={ParticipantType.TEAM}
                      id="participant_type_team"
                    />
                    <label htmlFor="participant_type_team">Team</label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Whether individuals or teams compete in the tournament
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {(() => {
          const selectedGameTypeId = form.watch("gameTypeId");
          const selectedParticipantType = form.watch("participantType");
          const selectedGameType = gameTypes.find(
            (gt) => gt.id === selectedGameTypeId,
          );
          if (
            selectedGameType &&
            selectedGameType.category === GameCategory.HEAD_TO_HEAD &&
            selectedParticipantType === ParticipantType.INDIVIDUAL
          ) {
            const h2hConfig = parseH2HConfig(selectedGameType.config);
            if (h2hConfig && isPartnershipGameType(h2hConfig)) {
              const size = getPartnershipSize(h2hConfig);
              return (
                <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>
                    This game type requires partnerships of {size} players per
                    side. You&apos;ll add partnerships during the draft phase
                    after creating the tournament.
                  </span>
                </div>
              );
            }
          }
          return null;
        })()}

        <FormField
          control={form.control}
          name="seedingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seeding Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seeding type" />
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
                How participants are seeded in the bracket
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <BestOfSection form={form} />

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Placement Points (optional)</h3>
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
                          field.onChange(value === "" ? "" : parseFloat(value));
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
            onClick={() => append({ placement: fields.length + 1, points: 0 })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Placement
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Tournament"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
