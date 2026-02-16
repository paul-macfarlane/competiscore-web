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
  ParticipantType,
  SEEDING_TYPE_LABELS,
  TOURNAMENT_ICON_OPTIONS,
} from "@/lib/shared/constants";
import {
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { createEventTournamentSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Trophy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createEventTournamentAction } from "../../../actions";

type FormValues = z.input<typeof createEventTournamentSchema>;

type Props = {
  eventId: string;
  gameTypes: { id: string; name: string; category: string }[];
};

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

        <FormField
          control={form.control}
          name="bestOf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Best Of</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : parseInt(value, 10));
                  }}
                />
              </FormControl>
              <FormDescription>
                Number of games per match (e.g., best of 3)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
