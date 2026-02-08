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
import { createPlaceholderSchema } from "@/validators/members";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createPlaceholderAction } from "./actions";

interface CreatePlaceholderFormProps {
  leagueId: string;
}

const formSchema = createPlaceholderSchema;
type FormValues = z.infer<typeof formSchema>;

export function CreatePlaceholderForm({
  leagueId,
}: CreatePlaceholderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const result = await createPlaceholderAction({
      leagueId,
      ...values,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Placeholder created successfully");
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Guest Player 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Placeholder"}
        </Button>
      </form>
    </Form>
  );
}
