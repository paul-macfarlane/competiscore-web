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
    { label: "Participants", href: `/events/${id}/participants` },
    { label: "Teams", href: `/events/${id}/teams` },
  ];

  return (
    <div className="space-y-4">
      <SectionNavigation tabs={tabs} />
      {children}
    </div>
  );
}
