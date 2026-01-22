import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface LeagueCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  role?: "member" | "manager" | "executive";
  logo?: string | null;
  showRole?: boolean;
}

const roleLabels = {
  member: "Member",
  manager: "Manager",
  executive: "Executive",
};

const roleVariants = {
  member: "secondary" as const,
  manager: "default" as const,
  executive: "default" as const,
};

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
    <Link href={`/leagues/${id}`} className="block">
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            {logo && (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={logo}
                  alt={name}
                  fill
                  className="object-cover p-1"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="truncate text-base md:text-lg">
                  {name}
                </CardTitle>
                {showRole && role && (
                  <Badge variant={roleVariants[role]} className="shrink-0">
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1 line-clamp-2 text-sm">
                {description}
              </CardDescription>
              <div className="text-muted-foreground mt-3 flex items-center gap-1 text-sm">
                <Users className="h-4 w-4" />
                <span>
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
