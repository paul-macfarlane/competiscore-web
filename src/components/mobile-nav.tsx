"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/shared/utils";
import { CalendarDays, Menu, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  id: string;
  name: string;
}

interface MobileNavProps {
  leagues: NavItem[];
  events: NavItem[];
}

export function MobileNav({ leagues, events }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            <DrawerClose asChild>
              <Link href="/">
                <Logo />
              </Link>
            </DrawerClose>
          </DrawerTitle>
        </DrawerHeader>
        <nav className="flex flex-col gap-1 px-4 pb-4">
          <p className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <CalendarDays className="h-3.5 w-3.5" />
            Your Events
          </p>
          {events.length > 0 ? (
            events.map((event) => {
              const isActive = pathname.startsWith(`/events/${event.id}`);
              return (
                <DrawerClose key={event.id} asChild>
                  <Link
                    href={`/events/${event.id}`}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {event.name}
                  </Link>
                </DrawerClose>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No events yet
            </p>
          )}
          <div className="border-t my-1" />
          <DrawerClose asChild>
            <Link
              href="/events"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View all your events
            </Link>
          </DrawerClose>

          <div className="mt-4" />
          <p className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Trophy className="h-3.5 w-3.5" />
            Your Leagues
          </p>
          {leagues.length > 0 ? (
            leagues.map((league) => {
              const isActive = pathname.startsWith(`/leagues/${league.id}`);
              return (
                <DrawerClose key={league.id} asChild>
                  <Link
                    href={`/leagues/${league.id}`}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {league.name}
                  </Link>
                </DrawerClose>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No leagues yet
            </p>
          )}
          <div className="border-t my-1" />
          <DrawerClose asChild>
            <Link
              href="/leagues"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View all your leagues
            </Link>
          </DrawerClose>
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
