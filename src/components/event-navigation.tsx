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

interface EventNavigationProps {
  eventId: string;
  isOrganizer: boolean;
}

const ACTIVITY_PREFIXES = ["/matches", "/high-scores", "/tournaments"];
const PEOPLE_PREFIXES = ["/participants", "/teams"];
const ORGANIZER_PREFIXES = ["/game-types", "/settings"];

const getTabs = (eventId: string, isOrganizer: boolean) => {
  const tabs = [
    { label: "Home", href: `/events/${eventId}` },
    { label: "Activity", href: `/events/${eventId}/matches` },
    { label: "People", href: `/events/${eventId}/participants` },
  ];

  if (isOrganizer) {
    tabs.push({
      label: "Manage",
      href: `/events/${eventId}/game-types`,
    });
  }

  return tabs;
};

export function EventNavigation({
  eventId,
  isOrganizer,
}: EventNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = getTabs(eventId, isOrganizer);

  const basePath = `/events/${eventId}`;
  const suffix = pathname.slice(basePath.length);

  const isActive = (href: string) => {
    if (href === basePath) {
      return pathname === basePath;
    }
    if (href === `${basePath}/matches`) {
      return ACTIVITY_PREFIXES.some((p) => suffix.startsWith(p));
    }
    if (href === `${basePath}/participants`) {
      return PEOPLE_PREFIXES.some((p) => suffix.startsWith(p));
    }
    if (href === `${basePath}/game-types`) {
      return ORGANIZER_PREFIXES.some((p) => suffix.startsWith(p));
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
