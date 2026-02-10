"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  HIGH_SCORE_SESSION_DESCRIPTION_MAX_LENGTH,
  HIGH_SCORE_SESSION_NAME_MAX_LENGTH,
} from "@/services/constants";
import {
  PlacementPointConfig,
  updateHighScoreSessionSchema,
} from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { updateHighScoreSessionAction } from "../../../../actions";

type FormValues = z.input<typeof updateHighScoreSessionSchema>;

type Props = {
  sessionId: string;
  eventId: string;
  defaultValues: {
    name: string;
    description: string;
    placementPointConfig: PlacementPointConfig;
  };
};

export function EditHighScoreSessionForm({
  sessionId,
  eventId,
  defaultValues,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(updateHighScoreSessionSchema),
    defaultValues: {
      sessionId,
      name: defaultValues.name,
      description: defaultValues.description,
      placementPointConfig: defaultValues.placementPointConfig,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "placementPointConfig",
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await updateHighScoreSessionAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof FormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Session updated successfully!");
        router.push(`/events/${eventId}/high-scores`);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placement Points (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optionally define how many points each placement earns when the
              session is closed. Leave empty for sessions that are just for fun
              or qualifiers.
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
              onClick={() =>
                append({ placement: fields.length + 1, points: 0 })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Placement
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
