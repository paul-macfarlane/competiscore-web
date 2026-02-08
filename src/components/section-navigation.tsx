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

interface SectionNavigationProps {
  tabs: { label: string; href: string }[];
}

export function SectionNavigation({ tabs }: SectionNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => pathname.startsWith(href);
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

      <nav className="hidden md:block">
        <div className="flex gap-4 border-b">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-2 py-1.5 text-sm whitespace-nowrap border-b-2 transition-colors",
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
