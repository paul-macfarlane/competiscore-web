"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        An unexpected error occurred. Please try again or contact support if the
        problem persists.
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-2 text-sm">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} className="mt-6">
        Try Again
      </Button>
    </div>
  );
}
