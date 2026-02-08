import { SectionNavigation } from "@/components/section-navigation";
import { ReactNode } from "react";

interface ActivityLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ActivityLayout({
  children,
  params,
}: ActivityLayoutProps) {
  const { id } = await params;

  const tabs = [
    { label: "Matches", href: `/leagues/${id}/matches` },
    { label: "Challenges", href: `/leagues/${id}/challenges` },
    { label: "Tournaments", href: `/leagues/${id}/tournaments` },
  ];

  return (
    <div className="space-y-4">
      <SectionNavigation tabs={tabs} />
      {children}
    </div>
  );
}
