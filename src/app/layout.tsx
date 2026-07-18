import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GuestBanner } from "@/components/auth/guest-banner";
import { GuestMigrator } from "@/components/auth/guest-migrator";
import { VoiceModeProvider } from "@/components/voice/voice-mode-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_NAME = "StoryQuest Arena";
const APP_DESCRIPTION =
  "StoryQuest Arena is a voice-first learning platform. Search any topic for a clear, visual breakdown, listen hands-free, and test yourself with instant quizzes.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Learn anything. Speak it. Master it.`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "learning",
    "AI search",
    "voice learning",
    "quizzes",
    "education",
    "StoryQuest Arena",
  ],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — Learn anything. Speak it. Master it.`,
    description: APP_DESCRIPTION,
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Learn anything. Speak it. Master it.`,
    description: APP_DESCRIPTION,
  },
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
            <VoiceModeProvider>
              <Navbar />
              <GuestBanner />
              <main className="flex flex-1 flex-col">{children}</main>
              <Footer />
              <Toaster richColors position="top-center" />
              <GuestMigrator />
            </VoiceModeProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
