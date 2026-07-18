import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GuestBanner } from "@/components/auth/guest-banner";
import { GuestMigrator } from "@/components/auth/guest-migrator";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StoryQuest Arena — Learn anything. Speak it. Master it.",
    template: "%s · StoryQuest Arena",
  },
  description:
    "StoryQuest Arena is a voice-first learning platform. Search any topic for a clear, visual breakdown, listen hands-free, and test yourself with instant quizzes.",
  keywords: [
    "learning",
    "AI search",
    "voice learning",
    "quizzes",
    "education",
    "StoryQuest Arena",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Navbar />
            <GuestBanner />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <Toaster richColors position="top-center" />
            <GuestMigrator />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
