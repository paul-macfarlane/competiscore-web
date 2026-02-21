/* eslint-disable react-hooks/incompatible-library */
"use client";

import { TeamColorBadge } from "@/components/team-color-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DateTimePicker,
  formatLocalDateTime,
} from "@/components/ui/datetime-picker";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH,
  DISCRETIONARY_AWARD_NAME_MAX_LENGTH,
} from "@/services/constants";
import { updateDiscretionaryAwardSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateDiscretionaryAwardAction } from "../../../../actions";

type FormValues = z.input<typeof updateDiscretionaryAwardSchema>;

type TeamOption = {
  id: string;
  name: string;
  color: string | null;
};

interface EditDiscretionaryFormProps {
  awardId: string;
  eventId: string;
  teams: TeamOption[];
  defaultValues: {
    name: string;
    description: string;
    points: number;
    awardedAt: Date;
    recipientTeamIds: string[];
  };
}

export function EditDiscretionaryForm({
  awardId,
  eventId,
  teams,
  defaultValues,
}: EditDiscretionaryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(updateDiscretionaryAwardSchema),
    defaultValues: {
      name: defaultValues.name,
      description: defaultValues.description,
      points: defaultValues.points,
      awardedAt: formatLocalDateTime(defaultValues.awardedAt),
      recipients: defaultValues.recipientTeamIds.map((id) => ({
        eventTeamId: id,
      })),
    },
    mode: "onChange",
  });

  const selectedRecipients = form.watch("recipients") ?? [];

  const toggleTeam = (teamId: string) => {
    const current = form.getValues("recipients") ?? [];
    const exists = current.some((r) => r.eventTeamId === teamId);
    if (exists) {
      form.setValue(
        "recipients",
        current.filter((r) => r.eventTeamId !== teamId),
        { shouldValidate: true },
      );
    } else {
      form.setValue("recipients", [...current, { eventTeamId: teamId }], {
        shouldValidate: true,
      });
    }
  };

  const selectAll = () => {
    form.setValue(
      "recipients",
      teams.map((t) => ({ eventTeamId: t.id })),
      { shouldValidate: true },
    );
  };

  const deselectAll = () => {
    form.setValue("recipients", [], { shouldValidate: true });
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await updateDiscretionaryAwardAction({ awardId }, values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof FormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Award updated!");
        router.push(`/events/${eventId}/discretionary`);
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border p-4 md:p-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Cookie Bonus, Stair Challenge"
                  maxLength={DISCRETIONARY_AWARD_NAME_MAX_LENGTH}
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Why are these points being awarded?"
                  maxLength={DISCRETIONARY_AWARD_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="points"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Points</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : parseFloat(value));
                  }}
                  placeholder="Number of points to award"
                />
              </FormControl>
              <FormDescription>
                Each selected team will receive this many points
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="awardedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time Awarded</FormLabel>
              <FormControl>
                <DateTimePicker
                  date={field.value ? new Date(field.value) : undefined}
                  onDateChange={(date) =>
                    field.onChange(date ? formatLocalDateTime(date) : undefined)
                  }
                />
              </FormControl>
              <FormDescription>
                When the award was given. Defaults to now if not set.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipients"
          render={() => (
            <FormItem>
              <FormLabel>Recipient Teams</FormLabel>
              <div className="mb-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                >
                  Deselect All
                </Button>
              </div>
              <div className="space-y-2 rounded-md border p-3">
                {teams.map((team) => {
                  const isSelected = selectedRecipients.some(
                    (r) => r.eventTeamId === team.id,
                  );
                  return (
                    <label
                      key={team.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTeam(team.id)}
                      />
                      <TeamColorBadge name={team.name} color={team.color} />
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
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
