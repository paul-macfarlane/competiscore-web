import { Skeleton } from "@/components/ui/skeleton";

export function EventsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 md:p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-8 w-20 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
