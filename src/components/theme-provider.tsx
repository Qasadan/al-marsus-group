"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Class-based theming (`.dark` on <html>) with system-preference support.
// The `.dark` token set lives in globals.css; suppressHydrationWarning is
// already set on <html> in the root layout.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
