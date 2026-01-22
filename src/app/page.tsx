import { SignInButton } from "@/components/auth-buttons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Medal, Trophy, Users } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="-mx-4 flex flex-col items-center md:-mx-6">
      <section className="w-full space-y-6 px-4 pb-8 pt-6 md:px-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <Badge variant="secondary" className="rounded-full">
            Beta - Work in Progress
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
              <Trophy className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Universal Support</CardTitle>
              <CardDescription>
                Create any competition type with customizable rules. From
                physical sports to video games.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Medal className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>ELO Rankings</CardTitle>
              <CardDescription>
                Automatic ELO calculations for Head-to-Head and Free-for-All
                games.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="mb-2 h-10 w-10 text-primary" />
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
