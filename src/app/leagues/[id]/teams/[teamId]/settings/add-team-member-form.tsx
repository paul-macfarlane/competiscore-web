"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlaceholderMember } from "@/db/schema";
import { cn } from "@/lib/shared/utils";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addTeamMemberAction } from "../../actions";

type AddTeamMemberFormProps = {
  teamId: string;
  availablePlaceholders: PlaceholderMember[];
};

export function AddTeamMemberForm({
  teamId,
  availablePlaceholders,
}: AddTeamMemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<PlaceholderMember | null>(null);

  const handleAdd = () => {
    if (!selectedMember) return;

    startTransition(async () => {
      const result = await addTeamMemberAction(
        { teamId },
        { placeholderMemberId: selectedMember.id },
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${selectedMember.displayName} added to team`);
        setSelectedMember(null);
        router.refresh();
      }
    });
  };

  if (availablePlaceholders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Placeholder Members</CardTitle>
        <CardDescription>
          Add placeholder members directly to the team. They can be linked to
          real accounts later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="flex-1 justify-between"
              >
                {selectedMember ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {selectedMember.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedMember.displayName}</span>
                  </div>
                ) : (
                  "Select a placeholder member..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-100 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search placeholder members..." />
                <CommandList>
                  <CommandEmpty>No placeholder member found.</CommandEmpty>
                  <CommandGroup>
                    {availablePlaceholders.map((placeholder) => (
                      <CommandItem
                        key={placeholder.id}
                        value={placeholder.displayName}
                        onSelect={() => {
                          setSelectedMember(placeholder);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedMember?.id === placeholder.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">
                            {placeholder.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{placeholder.displayName}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={handleAdd} disabled={!selectedMember || isPending}>
            <UserPlus className="mr-2 h-4 w-4" />
            {isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
