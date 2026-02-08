import { SectionNavigation } from "@/components/section-navigation";
import { ReactNode } from "react";

interface PeopleLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function PeopleLayout({
  children,
  params,
}: PeopleLayoutProps) {
  const { id } = await params;

  const tabs = [
    { label: "Members", href: `/leagues/${id}/members` },
    { label: "Teams", href: `/leagues/${id}/teams` },
    { label: "My Reports", href: `/leagues/${id}/my-reports` },
    { label: "My Warnings", href: `/leagues/${id}/my-warnings` },
  ];

  return (
    <div className="space-y-4">
      <SectionNavigation tabs={tabs} />
      {children}
    </div>
  );
}
