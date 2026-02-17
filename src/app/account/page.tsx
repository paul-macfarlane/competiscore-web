import { Button } from "@/components/ui/button";
import { auth } from "@/lib/server/auth";
import { FileText, Shield } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteAccountSection } from "./delete-account-section";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your account settings and preferences",
};

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold md:text-2xl">Account Settings</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Manage your account preferences and legal information
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-4 md:p-6">
          <h2 className="text-lg font-semibold">Legal & Privacy</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Review our legal policies and terms
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/privacy">
                <Shield className="mr-2 h-4 w-4" />
                Privacy Policy
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/terms">
                <FileText className="mr-2 h-4 w-4" />
                Terms of Service
              </Link>
            </Button>
          </div>
        </div>

        <DeleteAccountSection />
      </div>
    </div>
  );
}
