import { EventCard } from "@/components/event-card";
import { getUserEvents } from "@/services/events";
import { CalendarDays } from "lucide-react";

export async function EventsList({ userId }: { userId: string }) {
  const result = await getUserEvents(userId);
  if (result.error || !result.data) {
    return (
      <div className="border-destructive rounded-lg border p-4 text-center">
        <p className="text-destructive">Failed to load events</p>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      {result.data.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          name={event.name}
          description={event.description}
          status={event.status}
          role={event.role}
          logo={event.logo}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <CalendarDays className="text-muted-foreground mx-auto h-12 w-12" />
      <h3 className="mt-4 text-lg font-semibold">No events yet</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        Create your first event to start tracking competitions.
      </p>
    </div>
  );
}
