import { FileText, Shield } from "lucide-react";
import Link from "next/link";

import { Button } from "./ui/button";

export function Footer() {
  return (
    <footer className="w-full border-t bg-background px-4 py-6 md:px-6">
      <div className="container mx-auto flex max-w-7xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted-foreground">
          {new Date().getFullYear()} Competiscore
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/privacy">
              <Shield className="mr-2 h-4 w-4" />
              Privacy Policy
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/terms">
              <FileText className="mr-2 h-4 w-4" />
              Terms of Service
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
