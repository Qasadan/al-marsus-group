import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/constants";
import { SiteHeader, SiteFooter } from "@/components/public";
import { StatusBadge } from "@/components/admin/shared";
import { FolderKanban, ReceiptText, Wrench, Plus } from "lucide-react";
import { ServiceRequestForm } from "./service-request-form";

export const dynamic = "force-dynamic";

// Customer portal — customers can only ever see their own data. The session
// user is linked to a customer record; every query is scoped by customerId.
export default async function PortalPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/portal");
  if (session.role !== "CUSTOMER") redirect("/admin");

  const customer = await db.customer.findUnique({ where: { userId: session.sub } });
  const settings = await db.companySettings.findUnique({ where: { id: "main" } });
  const cur = settings?.currency ?? "KES";
  const logoUrl = settings?.logoUrl ?? "/images/logo.jpg";
  const companyName = settings?.companyName ?? "Al-Marsus Group Ltd";

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader companyName={companyName} logoUrl={logoUrl} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-primary">Welcome, {session.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is not yet linked to a customer record. Please contact the company to complete your portal setup.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm text-[var(--brand-green)] hover:underline">← Back to website</Link>
          </div>
        </main>
        <SiteFooter companyName={companyName} logoUrl={logoUrl} />
      </div>
    );
  }

  const [projects, invoices, serviceRequests] = await Promise.all([
    db.project.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: { members: { include: { user: { select: { name: true } } } } },
    }),
    db.invoice.findMany({
      where: { customerId: customer.id },
      orderBy: { issueDate: "desc" },
    }),
    db.serviceRequest.findMany({
      where: { customerId: customer.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
  ]);

  const outstanding = invoices
    .filter((i) => !["PAID", "CANCELLED", "DRAFT"].includes(i.status))
    .reduce((s, i) => s + (i.totalCents - i.amountPaidCents), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader companyName={companyName} logoUrl={logoUrl} whatsapp={settings?.whatsappNumber} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Customer Portal</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {customer.name}</p>
          </div>
          {outstanding > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
              Outstanding balance: <strong className="text-amber-800">{formatMoney(outstanding, cur)}</strong>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projects */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><FolderKanban className="h-4 w-4 text-primary" /> My Projects</h2>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ul className="space-y-3">
                {projects.map((p) => (
                  <li key={p.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{p.code} — {p.name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full brand-gradient-green" style={{ width: `${p.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.progress}% complete{p.systemSizeKw ? ` · ${p.systemSizeKw} kW` : ""}
                      {p.handoverStatus === "HANDED_OVER" ? " · handed over" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Invoices */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><ReceiptText className="h-4 w-4 text-primary" /> My Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{i.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">Issued {new Date(i.issueDate).toLocaleDateString("en-GB")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium whitespace-nowrap">{formatMoney(i.totalCents, i.currency)}</span>
                      <StatusBadge status={i.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Service requests */}
          <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="font-semibold flex items-center gap-2 mb-4"><Wrench className="h-4 w-4 text-primary" /> Service Requests</h2>
                {serviceRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No service requests yet. Report an issue using the form.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {serviceRequests.map((sr) => (
                      <li key={sr.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{sr.code}</span>
                          <div className="flex gap-1.5"><StatusBadge status={sr.priority} /><StatusBadge status={sr.status} /></div>
                        </div>
                        <p className="text-muted-foreground mt-1">{sr.issue}</p>
                        {sr.resolutionNotes && <p className="text-xs text-[var(--brand-green)] mt-1">{sr.resolutionNotes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-4"><Plus className="h-4 w-4 text-[var(--brand-green)]" /> Report an issue</h3>
                <ServiceRequestForm customerId={customer.id} />
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter companyName={companyName} logoUrl={logoUrl} email={settings?.email} phone={settings?.phone} whatsapp={settings?.whatsappNumber} address={settings?.address} />
    </div>
  );
}
