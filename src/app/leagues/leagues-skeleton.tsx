import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LeaguesSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="mt-3 flex items-center gap-1">
              <Skeleton className="h-4 w-20" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
