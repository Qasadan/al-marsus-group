import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, ApiError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireAuth(["invoices", "portal"]);
    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: true,
        project: { select: { id: true, code: true, name: true } },
        payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    });
    if (!invoice) throw new ApiError("Invoice not found", 404);
    return ok(invoice);
  });
}
