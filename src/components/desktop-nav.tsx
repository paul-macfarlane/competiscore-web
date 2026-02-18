"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/shared/utils";
import { CalendarDays, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  name: string;
}

interface DesktopNavProps {
  leagues: NavItem[];
  events: NavItem[];
}

export function DesktopNav({ leagues, events }: DesktopNavProps) {
  const pathname = usePathname();
  const isOnLeague = pathname.startsWith("/leagues/");
  const leagueIdMatch = pathname.match(/^\/leagues\/([^/]+)/);
  const activeLeague = leagueIdMatch
    ? leagues.find((l) => l.id === leagueIdMatch[1])
    : null;

  const isOnEvent = pathname.startsWith("/events/");
  const eventIdMatch = pathname.match(/^\/events\/([^/]+)/);
  const activeEvent = eventIdMatch
    ? events.find((e) => e.id === eventIdMatch[1])
    : null;

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className={cn(isOnEvent && "bg-accent/50")}>
            <CalendarDays className="mr-1.5 h-4 w-4" />
            {activeEvent ? activeEvent.name : "Events"}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-64">
              {events.length > 0 ? (
                <>
                  {events.map((event) => (
                    <NavigationMenuLink key={event.id} asChild>
                      <Link
                        href={`/events/${event.id}`}
                        className="block rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {event.name}
                      </Link>
                    </NavigationMenuLink>
                  ))}
                  <div className="border-t my-1" />
                </>
              ) : null}
              <NavigationMenuLink asChild>
                <Link
                  href="/events"
                  className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  View all your events
                </Link>
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={cn(isOnLeague && "bg-accent/50")}>
            <Trophy className="mr-1.5 h-4 w-4" />
            {activeLeague ? activeLeague.name : "Leagues"}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-64">
              {leagues.length > 0 ? (
                <>
                  {leagues.map((league) => (
                    <NavigationMenuLink key={league.id} asChild>
                      <Link
                        href={`/leagues/${league.id}`}
                        className="block rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {league.name}
                      </Link>
                    </NavigationMenuLink>
                  ))}
                  <div className="border-t my-1" />
                </>
              ) : null}
              <NavigationMenuLink asChild>
                <Link
                  href="/leagues"
                  className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  View all your leagues
                </Link>
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
