"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/shared/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface LeagueNavigationProps {
  leagueId: string;
  canManage: boolean;
}

const ACTIVITY_PREFIXES = ["/matches", "/challenges", "/tournaments"];
const PEOPLE_PREFIXES = ["/members", "/teams", "/my-reports", "/my-warnings"];
const MANAGE_PREFIXES = ["/game-types", "/moderation", "/settings"];

const getTabs = (leagueId: string, canManage: boolean) => {
  const tabs = [
    { label: "Home", href: `/leagues/${leagueId}` },
    { label: "Activity", href: `/leagues/${leagueId}/matches` },
    { label: "Leaderboards", href: `/leagues/${leagueId}/leaderboards` },
    { label: "People", href: `/leagues/${leagueId}/members` },
  ];

  if (canManage) {
    tabs.push({
      label: "Manage",
      href: `/leagues/${leagueId}/game-types`,
    });
  }

  return tabs;
};

export function LeagueNavigation({
  leagueId,
  canManage,
}: LeagueNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = getTabs(leagueId, canManage);

  const basePath = `/leagues/${leagueId}`;
  const suffix = pathname.slice(basePath.length);

  const isActive = (href: string) => {
    if (href === basePath) {
      return pathname === basePath;
    }
    if (href === `${basePath}/matches`) {
      return ACTIVITY_PREFIXES.some((p) => suffix.startsWith(p));
    }
    if (href === `${basePath}/leaderboards`) {
      return suffix.startsWith("/leaderboards");
    }
    if (href === `${basePath}/members`) {
      return PEOPLE_PREFIXES.some((p) => suffix.startsWith(p));
    }
    if (href === `${basePath}/game-types`) {
      return MANAGE_PREFIXES.some((p) => suffix.startsWith(p));
    }
    return false;
  };

  const activeTab = tabs.find((tab) => isActive(tab.href));

  return (
    <>
      <div className="md:hidden">
        <Select
          value={activeTab?.href ?? tabs[0].href}
          onValueChange={(value) => router.push(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.href} value={tab.href}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="hidden md:block overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex gap-1 border-b min-w-max">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive(tab.href)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
