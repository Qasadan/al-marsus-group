import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { EXPENSE_CATEGORIES, toCents, oneOf } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["expenses"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const projectId = sp.get("projectId") ?? undefined;
    const category = sp.get("category") ?? undefined;
    const where = { ...(projectId ? { projectId } : {}), ...(category ? { category } : {}) };
    const [items, total, sums] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        skip,
        take,
        include: {
          project: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, name: true } },
          recordedBy: { select: { name: true } },
        },
      }),
      db.expense.count({ where }),
      db.expense.aggregate({ _sum: { amountCents: true }, where }),
    ]);
    return ok({ items, total, page, pageSize, totalCents: sums._sum.amountCents ?? 0 });
  });
}

const createSchema = z.object({
  projectId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  category: z.string().refine(oneOf(EXPENSE_CATEGORIES, "Category")).default("OTHER"),
  description: z.string().min(2, "Description is required").max(300),
  amount: z.number().positive("Amount must be greater than zero").max(1_000_000_000),
  expenseDate: z.coerce.date().optional(),
  reference: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["expenses"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();
    const expense = await db.expense.create({
      data: {
        projectId: data.projectId ?? null,
        supplierId: data.supplierId ?? null,
        category: data.category,
        description: data.description,
        amountCents: toCents(data.amount),
        currency: settings.currency,
        expenseDate: data.expenseDate ?? new Date(),
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        recordedById: session.sub,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    await writeAudit(req, session, "CREATE", "Expense", expense.id, { amountCents: expense.amountCents });
    return ok(expense, { status: 201 });
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["expenses"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    await db.expense.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Expense", id);
    return ok({ deleted: true });
  });
}
