"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { MatchParticipantType } from "@/lib/shared/constants";
import { ParticipantOption } from "@/lib/shared/participant-options";
import { cn } from "@/lib/shared/utils";
import { Check, ChevronsUpDown, User, Users } from "lucide-react";
import { useState } from "react";

type ParticipantSelectorProps = {
  options: ParticipantOption[];
  value?: { id: string; type: MatchParticipantType };
  onChange: (
    value: { id: string; type: MatchParticipantType } | undefined,
  ) => void;
  placeholder?: string;
};

export function ParticipantSelector({
  options,
  value,
  onChange,
  placeholder = "Select participant...",
}: ParticipantSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = value
    ? options.find((o) => o.id === value.id && o.type === value.type)
    : undefined;

  const users = options.filter((o) => o.type === MatchParticipantType.USER);
  const teams = options.filter((o) => o.type === MatchParticipantType.TEAM);
  const placeholders = options.filter(
    (o) => o.type === MatchParticipantType.PLACEHOLDER,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedOption ? (
            <div className="flex items-center gap-2 min-w-0">
              <ParticipantAvatar option={selectedOption} size="sm" />
              <div className="flex flex-col items-start min-w-0">
                <span className="truncate max-w-full text-sm leading-tight">
                  {selectedOption.name}
                </span>
                {selectedOption.username && (
                  <span className="text-muted-foreground text-xs truncate max-w-full leading-tight">
                    @{selectedOption.username}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(300px,calc(100vw-3rem))] max-h-[min(300px,var(--radix-popover-content-available-height,300px))] overflow-y-auto p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList className="max-h-none">
            <CommandEmpty>No participant found.</CommandEmpty>
            {users.length > 0 && (
              <CommandGroup heading="Members">
                {users.map((option) => (
                  <CommandItem
                    key={`user-${option.id}`}
                    value={`${option.name} ${option.username || ""}`}
                    disabled={option.isSuspended}
                    onSelect={() => {
                      if (option.isSuspended) return;
                      onChange(
                        value?.id === option.id && value?.type === option.type
                          ? undefined
                          : { id: option.id, type: option.type },
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === option.id && value?.type === option.type
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <ParticipantAvatar option={option} size="sm" />
                      <div className="flex flex-col">
                        <span>{option.name}</span>
                        {option.username && (
                          <span className="text-muted-foreground text-xs">
                            @{option.username}
                          </span>
                        )}
                        {option.isSuspended && (
                          <span className="text-destructive text-xs">
                            Suspended
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {teams.length > 0 && (
              <CommandGroup heading="Teams">
                {teams.map((option) => (
                  <CommandItem
                    key={`team-${option.id}`}
                    value={option.name}
                    onSelect={() => {
                      onChange(
                        value?.id === option.id && value?.type === option.type
                          ? undefined
                          : { id: option.id, type: option.type },
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === option.id && value?.type === option.type
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <ParticipantAvatar option={option} size="sm" />
                      <span>{option.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {placeholders.length > 0 && (
              <CommandGroup heading="Placeholder Members">
                {placeholders.map((option) => (
                  <CommandItem
                    key={`placeholder-${option.id}`}
                    value={option.name}
                    onSelect={() => {
                      onChange(
                        value?.id === option.id && value?.type === option.type
                          ? undefined
                          : { id: option.id, type: option.type },
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === option.id && value?.type === option.type
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <ParticipantAvatar option={option} size="sm" />
                      <span>{option.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ParticipantAvatar({
  option,
  size = "md",
}: {
  option: ParticipantOption;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <Avatar className={sizeClass}>
      {option.image && <AvatarImage src={option.image} alt={option.name} />}
      <AvatarFallback className={size === "sm" ? "text-xs" : "text-sm"}>
        {option.type === MatchParticipantType.TEAM ? (
          <Users className="h-3 w-3" />
        ) : (
          <User className="h-3 w-3" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
