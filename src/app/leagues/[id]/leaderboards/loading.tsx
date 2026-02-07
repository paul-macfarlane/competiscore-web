import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-9 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 py-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
