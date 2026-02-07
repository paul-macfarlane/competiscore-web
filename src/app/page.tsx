import { SignInButton } from "@/components/auth-buttons";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/server/auth";
import { Medal, Trophy, Users } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/leagues");
  }

  return (
    <div className="-mx-4 flex flex-col items-center md:-mx-6">
      <section className="relative w-full space-y-6 px-4 pb-8 pt-6 md:px-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-gradient-from)_0%,transparent_50%)] opacity-[0.07]" />
        <div className="relative">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
            <Badge variant="secondary" className="rounded-full">
              Beta - Work in Progress
            </Badge>
            <h1 className="font-heading text-2xl font-bold sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-gradient-from to-gradient-to bg-clip-text text-transparent">
              Keep score of everything.
            </h1>
            <p className="max-w-2xl text-sm leading-normal text-muted-foreground sm:text-base md:text-xl md:leading-8">
              Competiscore is the best way to track records, calculate rankings,
              and build friendly rivalries with your friends. Ping Pong, Pool,
              Poker, or Mario Kart - we track it all.
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              Get Started
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
              <SignInButton provider="discord" />
              <SignInButton provider="google" />
            </div>
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
          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Universal Support</CardTitle>
              <CardDescription>
                Create any competition type with customizable rules. From
                physical sports to video games.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Medal className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>ELO Rankings</CardTitle>
              <CardDescription>
                Automatic ELO calculations for Head-to-Head and Free-for-All
                games.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Leagues & Seasons</CardTitle>
              <CardDescription>
                Aggregate multiple competitions into unified standings and crown
                a season champion.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
