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
  canManageGameTypes: boolean;
  canEditSettings: boolean;
}

const getTabs = (
  leagueId: string,
  canManageGameTypes: boolean,
  canEditSettings: boolean,
) => {
  const tabs = [
    { label: "Home", href: `/leagues/${leagueId}` },
    { label: "Matches", href: `/leagues/${leagueId}/matches` },
    { label: "Challenges", href: `/leagues/${leagueId}/challenges` },
    { label: "Leaderboards", href: `/leagues/${leagueId}/leaderboards` },
    { label: "Members", href: `/leagues/${leagueId}/members` },
    { label: "Teams", href: `/leagues/${leagueId}/teams` },
    { label: "Moderation", href: `/leagues/${leagueId}/moderation` },
  ];

  if (canManageGameTypes) {
    tabs.push({
      label: "Game Types",
      href: `/leagues/${leagueId}/game-types`,
    });
  }

  if (canEditSettings) {
    tabs.push({
      label: "Settings",
      href: `/leagues/${leagueId}/settings`,
    });
  }

  return tabs;
};

export function LeagueNavigation({
  leagueId,
  canManageGameTypes,
  canEditSettings,
}: LeagueNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = getTabs(leagueId, canManageGameTypes, canEditSettings);

  const isActive = (href: string) => {
    if (href === `/leagues/${leagueId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
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
