import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EventParticipantRole, EventStatus } from "@/lib/shared/constants";
import { EVENT_ROLE_LABELS } from "@/lib/shared/roles";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface EventCardProps {
  id: string;
  name: string;
  description: string | null;
  status: string;
  role: EventParticipantRole;
  logo?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  [EventStatus.DRAFT]: "Draft",
  [EventStatus.ACTIVE]: "Active",
  [EventStatus.COMPLETED]: "Completed",
};

const STATUS_VARIANTS: Record<string, "secondary" | "default" | "outline"> = {
  [EventStatus.DRAFT]: "outline",
  [EventStatus.ACTIVE]: "default",
  [EventStatus.COMPLETED]: "secondary",
};

export function EventCard({
  id,
  name,
  description,
  status,
  role,
  logo,
}: EventCardProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          {logo && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
              <Image src={logo} alt={name} fill className="object-cover p-1" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="truncate text-base md:text-lg">
                {name}
              </CardTitle>
              <div className="flex gap-1 shrink-0">
                <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
                  {STATUS_LABELS[status] ?? status}
                </Badge>
                <Badge variant="secondary">{EVENT_ROLE_LABELS[role]}</Badge>
              </div>
            </div>
            {description && (
              <CardDescription className="mt-1 line-clamp-2 text-sm">
                {description}
              </CardDescription>
            )}
            <div className="text-muted-foreground mt-3 flex items-center justify-end gap-2 text-sm">
              <Button asChild size="sm">
                <Link href={`/events/${id}`}>
                  View
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
