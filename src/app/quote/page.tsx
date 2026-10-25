import { PublicShell } from "@/components/public/public-shell";
import { QuoteForm } from "@/components/public/quote-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a Quote",
  description: "Request a quotation from Al-Marsus Group Ltd — MEP & solar engineering, digital, operations services or cold chain logistics.",
};

export default function QuotePage() {
  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">Request a Quote</h1>
          <p className="mt-3 text-white/80 max-w-2xl">
            Choose the division your request relates to and tell us about your project. The right team will review it
            and get back to you with next steps.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-2xl px-4 sm:px-6 py-14">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <QuoteForm />
        </div>
      </section>
    </PublicShell>
  );
}
