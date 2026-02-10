"use client";

import { cn } from "@/lib/shared/utils";
import { EVENT_TEAM_COLORS } from "@/services/constants";
import { Check } from "lucide-react";

type TeamColorPickerProps = {
  value?: string | null;
  onChange: (color: string | undefined) => void;
};

export function TeamColorPicker({ value, onChange }: TeamColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EVENT_TEAM_COLORS.map((color) => {
        const isSelected = value === color.value;
        return (
          <button
            key={color.value}
            type="button"
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-transform",
              isSelected && "ring-2 ring-offset-2 ring-primary scale-110",
            )}
            style={{ backgroundColor: color.bg }}
            onClick={() => onChange(isSelected ? undefined : color.value)}
            title={color.label}
          >
            {isSelected && (
              <Check className="h-4 w-4" style={{ color: color.text }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
