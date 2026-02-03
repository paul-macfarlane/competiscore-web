import { Badge } from "@/components/ui/badge";
import { ELO_CONSTANTS } from "@/lib/shared/constants";
import { cn } from "@/lib/shared/utils";

interface EloRatingBadgeProps {
  rating: number;
  isProvisional: boolean;
  className?: string;
}

export function EloRatingBadge({
  rating,
  isProvisional,
  className,
}: EloRatingBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-semibold">{Math.round(rating)}</span>
      {isProvisional && (
        <Badge variant="secondary" className="text-xs">
          Provisional
        </Badge>
      )}
    </div>
  );
}
