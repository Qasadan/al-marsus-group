import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMoney, formatDate } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/public/print-button";

export const dynamic = "force-dynamic";

// Print-friendly quotation view. Access control: staff sessions only —
// customers receive PDFs out-of-band by the company.
export default async function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) notFound();

  const { id } = await params;
  const settings = await getSettings();
  const quotation = await db.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      customer: true,
      createdBy: { select: { name: true } },
    },
  });
  if (!quotation) notFound();

  const cur = quotation.currency || settings.currency;
  const lines = [
    ["Subtotal", formatMoney(quotation.subtotalCents, cur)],
    ...(quotation.discountCents > 0 ? [["Discount", `-${formatMoney(quotation.discountCents, cur)}`]] : []),
    [`Tax (${quotation.taxRate}%)`, formatMoney(quotation.taxCents, cur)],
  ] as [string, string][];

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
            <h2 className="text-2xl font-bold">QUOTATION</h2>
            <p className="text-sm text-gray-600">{quotation.quoteNumber}</p>
            <p className="text-xs text-gray-500">Issued: {formatDate(quotation.issueDate)}</p>
            {quotation.expiryDate && <p className="text-xs text-gray-500">Valid until: {formatDate(quotation.expiryDate)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Quotation for</h3>
            <p className="font-semibold">{quotation.customer.name}</p>
            {quotation.customer.phone && <p className="text-sm text-gray-600">{quotation.customer.phone}</p>}
            {quotation.customer.email && <p className="text-sm text-gray-600">{quotation.customer.email}</p>}
            {quotation.customer.address && <p className="text-sm text-gray-600">{quotation.customer.address}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Subject</h3>
            <p className="font-medium">{quotation.title}</p>
            <p className="text-xs text-gray-500 mt-1">Status: {quotation.status}</p>
          </div>
        </div>

        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2 border-b border-gray-200">#</th>
              <th className="px-3 py-2 border-b border-gray-200">Description</th>
              <th className="px-3 py-2 border-b border-gray-200">Type</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Qty</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Unit Price</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((it, i) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b border-gray-100">{i + 1}</td>
                <td className="px-3 py-2 border-b border-gray-100">{it.description}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{it.kind}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right">{it.quantity}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap">{formatMoney(it.unitPriceCents, cur)}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap font-medium">{formatMoney(it.totalCents, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-64 text-sm space-y-1.5">
            {lines.map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span>{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t-2 border-[var(--brand-indigo)] pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-[var(--brand-indigo)]">{formatMoney(quotation.totalCents, cur)}</span>
            </div>
          </div>
        </div>

        {quotation.notes && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}
        {quotation.terms && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Terms & conditions</h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{quotation.terms}</p>
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-4 text-[11px] text-gray-400 leading-relaxed">
          <p>
            Preliminary energy calculations and system sizing are estimates based on the information available and must
            be verified by qualified personnel before procurement or installation. This quotation does not constitute a
            certified engineering design.
          </p>
          <p className="mt-1">Generated by {settings.companyName} business system{quotation.createdBy?.name ? ` · Prepared by ${quotation.createdBy.name}` : ""}.</p>
        </div>
      </div>
      <PrintButton />
    </div>
  );
}
