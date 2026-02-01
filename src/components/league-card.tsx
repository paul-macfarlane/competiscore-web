import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { ROLE_BADGE_VARIANTS, ROLE_LABELS } from "@/lib/shared/roles";
import { ChevronRight, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface LeagueCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  role?: LeagueMemberRole;
  logo?: string | null;
  showRole?: boolean;
}

export function LeagueCard({
  id,
  name,
  description,
  memberCount,
  role,
  logo,
  showRole = true,
}: LeagueCardProps) {
  return (
    <Card>
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
              {showRole && role && (
                <Badge variant={ROLE_BADGE_VARIANTS[role]} className="shrink-0">
                  {ROLE_LABELS[role]}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 line-clamp-2 text-sm">
              {description}
            </CardDescription>
            <div className="text-muted-foreground mt-3 flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
              </div>
              <Button asChild size="sm">
                <Link href={`/leagues/${id}`}>
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
