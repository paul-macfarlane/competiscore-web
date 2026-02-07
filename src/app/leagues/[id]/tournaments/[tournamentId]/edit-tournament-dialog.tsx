"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  TOURNAMENT_NAME_MAX_LENGTH,
} from "@/services/constants";
import { updateTournamentSchema } from "@/validators/tournaments";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateTournamentAction } from "../actions";

const editTournamentFormSchema = updateTournamentSchema.pick({
  name: true,
  description: true,
});

type EditTournamentFormValues = z.input<typeof editTournamentFormSchema>;

type EditTournamentDialogProps = {
  tournamentId: string;
  name: string;
  description: string | null;
};

export function EditTournamentDialog({
  tournamentId,
  name,
  description,
}: EditTournamentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditTournamentFormValues>({
    resolver: zodResolver(editTournamentFormSchema),
    defaultValues: {
      name,
      description: description || "",
    },
    mode: "onChange",
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset({ name, description: description || "" });
    }
  };

  const onSubmit = (values: EditTournamentFormValues) => {
    startTransition(async () => {
      const result = await updateTournamentAction({ tournamentId }, values);
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
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit tournament</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
        </DialogHeader>

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
                    {(field.value || "").length}/
                    {TOURNAMENT_DESCRIPTION_MAX_LENGTH} characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
