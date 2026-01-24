import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReportWithUsers } from "@/db/reports";
import { getInitials } from "@/lib/client/utils";
import { REPORT_REASON_LABELS, ReportReason } from "@/lib/shared/constants";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface ReportsListProps {
  reports: ReportWithUsers[];
  leagueId: string;
}

export function ReportsList({ reports, leagueId }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No pending reports.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <Link
          key={report.id}
          href={`/leagues/${leagueId}/moderation/${report.id}`}
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={report.reportedUser.image ?? undefined} />
            <AvatarFallback>
              {getInitials(report.reportedUser.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {report.reportedUser.name}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {REPORT_REASON_LABELS[report.reason as ReportReason]}
              </Badge>
            </div>
            <div className="text-muted-foreground text-sm">
              Reported by {report.reporter.name} •{" "}
              {formatDistanceToNow(new Date(report.createdAt), {
                addSuffix: true,
              })}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      ))}
    </div>
  );
}
