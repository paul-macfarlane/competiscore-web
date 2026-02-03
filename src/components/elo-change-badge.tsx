import { cn } from "@/lib/shared/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface EloChangeBadgeProps {
  change: number;
  className?: string;
}

export function EloChangeBadge({ change, className }: EloChangeBadgeProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const roundedChange = Math.round(Math.abs(change));

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isPositive && "text-green-600 dark:text-green-400",
        !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground",
        className,
      )}
    >
      {isPositive ? (
        <ArrowUp className="h-3 w-3" />
      ) : isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      <span>
        {isPositive && "+"}
        {roundedChange}
      </span>
    </div>
  );
}
