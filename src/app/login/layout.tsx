import type { Metadata } from "next";

// Staff login is intentionally kept out of search indexes and public link lists —
// it is reached by direct URL (or the ?next= redirect after an auth-gated route) only.
export const metadata: Metadata = {
  title: "Staff Login — Al-Marsus Group Ltd",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
