import type { Metadata } from "next";
import { Geist_Mono, Yantramanav } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// Yantramanav — the same typeface family used by the reference design
// (kaaftoon.com / Ecohub): clean grotesque with heavy display weights.
const yantramanav = Yantramanav({
  variable: "--font-yantramanav",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
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
      default: "Al-Marsus Group Ltd — Engineering · Cold Chain · Digital · Agro-Processing",
      template: "%s | Al-Marsus Group Ltd",
    },
    description:
      "Al-Marsus Group Ltd — a diversified group establishing sustainable businesses across engineering, cold-chain infrastructure & solutions, digital innovation, and agro-processing.",
    keywords: [
      "Al-Marsus Group", "MEP engineering", "solar energy", "solar installation",
      "cold chain infrastructure", "cold chain solutions", "digital solutions", "agro-processing", "value addition", "renewable energy",
    ],
    icons: { icon: "/images/logo.jpg" },
    openGraph: {
      title: "Al-Marsus Group Ltd — Engineering · Cold Chain · Digital · Agro-Processing",
      description: "One group, four specialised businesses: MEP Engineering, Cold Chain Infrastructure & Solutions, Digital, and Agro-Processing.",
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
        className={`${yantramanav.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
