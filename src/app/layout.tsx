import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  // Static-safe metadata: no DB dependency here (server settings are fetched
  // per page where needed) to keep the root layout resilient.
  return {
    title: {
      default: "Al-Marsus Group Ltd — Engineering · Digital · Operations · Cold Chain",
      template: "%s | Al-Marsus Group Ltd",
    },
    description:
      "Al-Marsus Group Ltd — a multi-division engineering and services group: MEP engineering (including solar energy), digital solutions, operations services, and cold chain storage & logistics.",
    keywords: [
      "Al-Marsus Group", "MEP engineering", "solar energy", "solar installation",
      "digital solutions", "operations services", "cold chain storage", "logistics", "renewable energy",
    ],
    icons: { icon: "/images/logo.jpg" },
    openGraph: {
      title: "Al-Marsus Group Ltd — Engineering · Digital · Operations · Cold Chain",
      description: "One group, four specialised divisions: MEP Engineering, Digital, Operations Services and Cold Chain Storage & Logistics.",
      siteName: "Al-Marsus Group Ltd",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
