import { SignInButton } from "@/components/auth-buttons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Medal, Swords, Trophy, Users } from "lucide-react";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Dashboard
        </h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Your Profile
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-bold md:text-2xl">
                {session.user.name}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Leagues
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold md:text-2xl">0</div>
              <p className="text-xs text-muted-foreground">
                Join a league to get started
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Matches
              </CardTitle>
              <Swords className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold md:text-2xl">0</div>
              <p className="text-xs text-muted-foreground">
                No matches played yet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex flex-col items-center md:-mx-6">
      <section className="w-full space-y-6 px-4 pb-8 pt-6 md:px-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <Badge variant="secondary" className="rounded-full">
            Beta • Work in Progress
          </Badge>
          <h1 className="font-heading text-2xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
            Keep score of everything.
          </h1>
          <p className="max-w-2xl text-sm leading-normal text-muted-foreground sm:text-base md:text-xl md:leading-8">
            Competiscore is the best way to track records, calculate rankings,
            and build friendly rivalries with your friends. Ping Pong, Pool,
            Poker, or Mario Kart - we track it all.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <SignInButton provider="discord" />
            <SignInButton provider="google" />
          </div>
        </div>
      </section>

      <section className="w-full space-y-6 bg-muted/50 px-4 py-8 dark:bg-transparent md:px-6 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-2xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Features
          </h2>
          <p className="max-w-[85%] text-sm leading-normal text-muted-foreground sm:text-base md:text-lg md:leading-7">
            Everything you need to manage your casual competitive groups.
          </p>
        </div>
        <div className="mx-auto grid gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
          <Card>
            <CardHeader>
              <Trophy className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Universal Support</CardTitle>
              <CardDescription>
                Create any competition type with customizable rules. From
                physical sports to video games.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Medal className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>ELO Rankings</CardTitle>
              <CardDescription>
                Automatic ELO calculations for Head-to-Head and Free-for-All
                games.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Leagues & Seasons</CardTitle>
              <CardDescription>
                Aggregate multiple competitions into unified standings and crown
                a season champion.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
