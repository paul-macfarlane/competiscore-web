import { DesktopNav } from "@/components/desktop-nav";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/server/auth";
import { getUserLeagues } from "@/services/leagues";
import { getNotificationCount } from "@/services/notifications";
import { headers } from "next/headers";
import Link from "next/link";

export async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const notificationCount = session
    ? await getNotificationCount(session.user.id)
    : 0;

  const leagues = session
    ? await getUserLeagues(session.user.id).then((r) =>
        (r.data ?? []).slice(0, 4).map((l) => ({ id: l.id, name: l.name })),
      )
    : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          {session && <MobileNav leagues={leagues} />}
          <Link href="/" className="flex cursor-pointer items-center space-x-2">
            <Logo />
          </Link>
          {session && <DesktopNav leagues={leagues} />}
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <NotificationBell initialCount={notificationCount} />
              <UserMenu user={session.user} />
            </>
          ) : (
            <ModeToggle />
          )}
        </div>
      </div>
    </header>
  );
}
