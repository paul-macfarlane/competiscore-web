import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type AtLimitMessageProps = {
  title: string;
  description: string;
};

export function AtLimitMessage({ title, description }: AtLimitMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description} A paid tier with higher limits is coming soon.
      </AlertDescription>
    </Alert>
  );
}
