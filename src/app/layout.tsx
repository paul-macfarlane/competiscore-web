import { BottomNav } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/toaster";
import { auth } from "@/lib/server/auth";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Competiscore",
    template: "%s | Competiscore",
  },
  description: "Track your competitions with friends",
  keywords: ["competition", "leaderboard", "gaming", "sports", "tracking"],
  authors: [{ name: "Competiscore" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://competiscore.com",
    title: "Competiscore",
    description: "Track your competitions with friends",
    siteName: "Competiscore",
  },
  twitter: {
    card: "summary_large_image",
    title: "Competiscore",
    description: "Track your competitions with friends",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main
            className={`flex-1 container mx-auto px-4 py-4 md:px-6 md:py-6 ${session ? "pb-20 md:pb-6" : ""}`}
          >
            {children}
          </main>
          {session && <BottomNav />}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
