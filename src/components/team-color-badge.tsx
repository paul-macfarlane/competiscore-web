import { cn } from "@/lib/shared/utils";
import { EVENT_TEAM_COLORS } from "@/services/constants";

type TeamColorBadgeProps = {
  name: string;
  color: string | null;
  className?: string;
};

export function TeamColorBadge({
  name,
  color,
  className,
}: TeamColorBadgeProps) {
  const colorConfig = color
    ? EVENT_TEAM_COLORS.find((c) => c.value === color)
    : null;

  if (!colorConfig) {
    return (
      <span
        className={cn(
          "inline-flex self-start items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          className,
        )}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex self-start items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: colorConfig.bg, color: colorConfig.text }}
    >
      {name}
    </span>
  );
}
