import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMoney, formatDate } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/public/print-button";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) notFound();

  const { id } = await params;
  const settings = await getSettings();
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      customer: true,
      project: { select: { code: true, name: true } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const cur = invoice.currency || settings.currency;
  const outstanding = invoice.totalCents - invoice.amountPaidCents;

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white">
      <div className="print-page mx-auto max-w-3xl bg-white shadow-lg p-10">
        <div className="flex items-start justify-between border-b-2 border-[var(--brand-indigo)] pb-6">
          <div className="flex items-center gap-4">
            { }
            <img src={settings.logoUrl} alt={`${settings.companyName} logo`} className="h-16 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-[var(--brand-indigo)]">{settings.companyName}</h1>
              <p className="text-xs text-gray-500">{settings.tagline}</p>
              {settings.address && <p className="text-xs text-gray-500">{settings.address}</p>}
              {(settings.phone || settings.email) && (
                <p className="text-xs text-gray-500">{[settings.phone, settings.email].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <p className="text-sm text-gray-600">{invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500">Issued: {formatDate(invoice.issueDate)}</p>
            {invoice.dueDate && <p className="text-xs text-gray-500">Due: {formatDate(invoice.dueDate)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Bill to</h3>
            <p className="font-semibold">{invoice.customer.name}</p>
            {invoice.customer.phone && <p className="text-sm text-gray-600">{invoice.customer.phone}</p>}
            {invoice.customer.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
            {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
          </div>
          {invoice.project && (
            <div className="text-right">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Project</h3>
              <p className="font-medium">{invoice.project.code} — {invoice.project.name}</p>
            </div>
          )}
        </div>

        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2 border-b border-gray-200">#</th>
              <th className="px-3 py-2 border-b border-gray-200">Description</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Qty</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Unit Price</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b border-gray-100">{i + 1}</td>
                <td className="px-3 py-2 border-b border-gray-100">{it.description}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right">{it.quantity}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap">{formatMoney(it.unitPriceCents, cur)}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap font-medium">{formatMoney(it.totalCents, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-64 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatMoney(invoice.subtotalCents, cur)}</span></div>
            {invoice.discountCents > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatMoney(invoice.discountCents, cur)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Tax ({invoice.taxRate}%)</span><span>{formatMoney(invoice.taxCents, cur)}</span></div>
            <div className="flex justify-between border-t-2 border-[var(--brand-indigo)] pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-[var(--brand-indigo)]">{formatMoney(invoice.totalCents, cur)}</span>
            </div>
            <div className="flex justify-between text-green-700"><span>Paid</span><span>{formatMoney(invoice.amountPaidCents, cur)}</span></div>
            <div className="flex justify-between font-bold text-red-700"><span>Balance due</span><span>{formatMoney(outstanding, cur)}</span></div>
          </div>
        </div>

        {invoice.payments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Payment history</h3>
            <table className="w-full text-xs">
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1 text-gray-600">{formatDate(p.paidAt)}</td>
                    <td className="py-1 text-gray-600">{p.method.replace("_", " ")}{p.reference ? ` · ${p.reference}` : ""}</td>
                    <td className="py-1 text-right">{formatMoney(p.amountCents, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
        {invoice.terms && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Terms</h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
          </div>
        )}
      </div>
      <PrintButton />
    </div>
  );
}
