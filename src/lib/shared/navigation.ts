import { LayoutDashboard, Trophy } from "lucide-react";

export const mainNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leagues", href: "/leagues", icon: Trophy },
] as const;

export type NavItem = (typeof mainNavItems)[number];
