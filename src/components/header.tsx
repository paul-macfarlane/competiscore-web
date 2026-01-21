import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

export async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex cursor-pointer items-center space-x-2">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          {session ? <UserMenu user={session.user} /> : <ModeToggle />}
        </div>
      </div>
    </header>
  );
}
