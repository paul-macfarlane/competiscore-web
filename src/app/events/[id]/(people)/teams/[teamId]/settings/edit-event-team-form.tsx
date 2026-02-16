"use client";

import { SimpleIconSelector } from "@/components/icon-selector";
import { TeamColorPicker } from "@/components/team-color-picker";
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
import type { EventTeam } from "@/db/schema";
import { TEAM_ICON_OPTIONS } from "@/lib/shared/constants";
import { MAX_EVENT_TEAM_NAME_MAX_LENGTH } from "@/services/constants";
import {
  type UpdateEventTeamInput,
  updateEventTeamSchema,
} from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateEventTeamAction } from "../../../../actions";

interface EditEventTeamFormProps {
  team: EventTeam & { memberCount: number; eventId: string };
  eventId: string;
}

export function EditEventTeamForm({ team }: EditEventTeamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateEventTeamInput>({
    resolver: zodResolver(updateEventTeamSchema),
    defaultValues: {
      name: team.name,
      logo: team.logo || undefined,
      color: team.color || undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: UpdateEventTeamInput) => {
    startTransition(async () => {
      const result = await updateEventTeamAction(
        { eventTeamId: team.id },
        values,
      );

      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof UpdateEventTeamInput, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Team updated successfully!");
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Team name"
                      maxLength={MAX_EVENT_TEAM_NAME_MAX_LENGTH}
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
                  <FormLabel>Team Logo</FormLabel>
                  <div className="flex items-center gap-3">
                    {field.value ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={field.value}
                          alt="Team logo"
                          fill
                          className="object-cover p-1"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                        <Users className="text-muted-foreground h-8 w-8" />
                      </div>
                    )}
                    <SimpleIconSelector
                      options={TEAM_ICON_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      onClear={() => field.onChange("")}
                      trigger={
                        <Button variant="outline" type="button" size="sm">
                          {field.value ? "Change Logo" : "Select Logo"}
                        </Button>
                      }
                      title="Select a Team Logo"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Color</FormLabel>
                  <FormControl>
                    <TeamColorPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
