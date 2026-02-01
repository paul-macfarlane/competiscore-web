import { ReactNode } from "react";

interface LeagueLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function LeagueLayout({ children }: LeagueLayoutProps) {
  // This layout wraps all league pages and can be extended to include:
  // - Shared league navigation
  // - League context/data that's needed across pages
  // - Common UI elements like league header
  // - Breadcrumbs are kept in individual pages since they need page-specific data

  return <>{children}</>;
}
