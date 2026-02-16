"use client";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH,
  HIGH_SCORE_SESSION_NAME_MAX_LENGTH,
} from "@/services/constants";
import { openHighScoreSessionSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { openHighScoreSessionAction } from "../../../actions";

type OpenHighScoreSessionFormValues = z.input<
  typeof openHighScoreSessionSchema
>;

interface OpenHighScoreSessionFormProps {
  eventId: string;
  gameTypes: { id: string; name: string }[];
}

export function OpenHighScoreSessionForm({
  eventId,
  gameTypes,
}: OpenHighScoreSessionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<OpenHighScoreSessionFormValues>({
    resolver: zodResolver(openHighScoreSessionSchema),
    defaultValues: {
      eventId,
      gameTypeId: gameTypes[0]?.id,
      name: "",
      description: "",
      placementPointConfig: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "placementPointConfig",
  });

  const onSubmit = (values: OpenHighScoreSessionFormValues) => {
    startTransition(async () => {
      const result = await openHighScoreSessionAction(values);

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof OpenHighScoreSessionFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Best score session opened!");
        router.push(`/events/${eventId}/high-scores`);
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
              <FormLabel>Session Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Round 1 Best Scores"
                  maxLength={HIGH_SCORE_SESSION_NAME_MAX_LENGTH}
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
                  placeholder="Describe this session..."
                  maxLength={HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  {...field}
                />
              </FormControl>
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
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game type" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameTypes.map((gt) => (
                      <SelectItem key={gt.id} value={gt.id}>
                        {gt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <Label>Placement Point Configuration (optional)</Label>
          <p className="text-muted-foreground text-sm">
            Optionally define how many points each placement earns when the
            session is closed. Leave empty for sessions that are just for fun or
            qualifiers.
          </p>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="w-16 text-sm">#{index + 1}</Label>
                  <FormField
                    control={form.control}
                    name={`placementPointConfig.${index}.points`}
                    render={({ field: pointsField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Points"
                            value={pointsField.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              pointsField.onChange(
                                value === "" ? "" : parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    remove(index);
                    // Re-index placements after removal
                    const currentValues = form.getValues(
                      "placementPointConfig",
                    );
                    if (currentValues) {
                      currentValues.forEach((_, i) => {
                        form.setValue(
                          `placementPointConfig.${i}.placement`,
                          i + 1,
                        );
                      });
                    }
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ placement: fields.length + 1, points: 0 })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Placement
          </Button>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Opening..." : "Open Session"}
        </Button>
      </form>
    </Form>
  );
}
