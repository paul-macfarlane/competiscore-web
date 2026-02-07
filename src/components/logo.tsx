import { LogoMarkIcon } from "@/components/icons/logo-mark";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="bg-linear-to-br from-gradient-from to-gradient-to text-white flex h-8 w-8 items-center justify-center rounded-lg">
        <LogoMarkIcon className="h-5 w-5" />
      </div>
      <span className="font-bold text-lg tracking-tight">Competiscore</span>
    </div>
  );
}
