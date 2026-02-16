"use client";

import { SimpleIconSelector } from "@/components/icon-selector";
import { TeamColorPicker } from "@/components/team-color-picker";
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
import { TEAM_ICON_OPTIONS } from "@/lib/shared/constants";
import { MAX_EVENT_TEAM_NAME_MAX_LENGTH } from "@/services/constants";
import { createEventTeamSchema } from "@/validators/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createEventTeamAction } from "../../../actions";

interface CreateEventTeamFormProps {
  eventId: string;
}

type CreateEventTeamFormValues = z.input<typeof createEventTeamSchema>;

export function CreateEventTeamForm({ eventId }: CreateEventTeamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateEventTeamFormValues>({
    resolver: zodResolver(createEventTeamSchema),
    defaultValues: {
      eventId,
      name: "",
      logo: undefined,
      color: undefined,
    },
    mode: "onChange",
  });

  const onSubmit = (values: CreateEventTeamFormValues) => {
    startTransition(async () => {
      const result = await createEventTeamAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof CreateEventTeamFormValues, {
              message,
            });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Team created!");
        router.push(`/events/${eventId}/teams`);
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
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="The Champions"
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
              <FormLabel>Team Logo (Optional)</FormLabel>
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
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Users className="h-8 w-8 text-muted-foreground" />
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
              <FormLabel>Team Color (Optional)</FormLabel>
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
          className="w-full"
          disabled={isPending || !form.formState.isValid}
        >
          {isPending ? "Creating..." : "Create Team"}
        </Button>
      </form>
    </Form>
  );
}
