import { PublicShell } from "@/components/public/public-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Al-Marsus Group Ltd collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-3 text-white/80">Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-14 space-y-8 text-sm leading-relaxed text-foreground/85">
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-indigo)] mb-2">1. Information we collect</h2>
          <p>
            When you submit a quotation request through this website we collect the information you provide: your name,
            email address, phone number, property location and details about your energy needs. We also record the IP
            address of the submitting device for spam-prevention and security purposes.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-indigo)] mb-2">2. How we use your information</h2>
          <p>
            Your information is used solely to respond to your request, schedule site surveys, prepare quotations and
            deliver services you ask for. We do not sell your personal data to third parties.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-indigo)] mb-2">3. Storage and access</h2>
          <p>
            Quotation requests are stored in our business management system. Access is restricted to authorised staff
            through authenticated, role-based accounts. Website visitors can never browse other customers&apos; data.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-indigo)] mb-2">4. Cookies</h2>
          <p>
            This website uses a single authentication cookie for staff login sessions. Public visitors are not tracked
            with advertising or analytics cookies.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-indigo)] mb-2">5. Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by contacting us
            using the details on our contact page. We will respond within a reasonable period.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-indigo)] mb-2">6. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The latest version will always be published on this page.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          This template policy should be reviewed against the company&apos;s actual data practices and applicable data
          protection law (e.g. the Kenya Data Protection Act) before go-live.
        </p>
      </section>
    </PublicShell>
  );
}
