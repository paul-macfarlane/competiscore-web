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
  TOURNAMENT_ICON_OPTIONS,
  TournamentStatus,
  TournamentType,
} from "@/lib/shared/constants";
import {
  MAX_BEST_OF,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { updateEventTournamentSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateEventTournamentAction } from "../../../../actions";

const editFormSchema = updateEventTournamentSchema.pick({
  name: true,
  description: true,
  logo: true,
  bestOf: true,
  roundBestOf: true,
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
  bestOf: number;
  roundBestOf: string | null;
};

export function EditEventTournamentForm({
  tournamentId,
  eventId,
  name,
  description,
  logo,
  status,
  tournamentType,
  bestOf,
  roundBestOf,
}: EditEventTournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDraft = status === TournamentStatus.DRAFT;

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

  const [showPerRound, setShowPerRound] = useState(initialOverrides.length > 0);
  const [roundOverrides, setRoundOverrides] =
    useState<{ round: string; bestOf: string }[]>(initialOverrides);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name,
      description: description || "",
      logo: logo || undefined,
      bestOf,
      roundBestOf: parsedRoundBestOf,
    },
    mode: "onChange",
  });

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
      const result = await updateEventTournamentAction(
        { eventTournamentId: tournamentId },
        values,
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

        {isDraft && tournamentType !== TournamentType.SWISS && (
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
