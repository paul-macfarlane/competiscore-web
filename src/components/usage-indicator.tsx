import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/shared/utils";

type UsageIndicatorProps = {
  current: number;
  max: number | null;
  label: string;
  showProgressBar?: boolean;
  className?: string;
};

export function UsageIndicator({
  current,
  max,
  label,
  showProgressBar = true,
  className,
}: UsageIndicatorProps) {
  const isUnlimited = max === null;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isAtLimit = !isUnlimited && current >= max;
  const isNearLimit = !isUnlimited && !isAtLimit && current >= max - 1;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-medium",
            isAtLimit && "text-destructive",
            isNearLimit && "text-warning",
          )}
        >
          {isUnlimited ? (
            <>{current} (unlimited)</>
          ) : (
            <>
              {current} of {max}
            </>
          )}
        </span>
      </div>
      {showProgressBar && !isUnlimited && (
        <Progress
          value={percentage}
          className={cn(
            "h-2",
            isAtLimit && "[&>div]:bg-destructive",
            isNearLimit && "[&>div]:bg-warning",
          )}
        />
      )}
    </div>
  );
}
