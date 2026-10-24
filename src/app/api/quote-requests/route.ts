import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, rateLimit, getClientIp, ApiError, buildPagination } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { QUOTE_REQUEST_STATUSES, oneOf } from "@/lib/constants";
import { DIVISION_CODES, divisionLabel } from "@/lib/divisions";

// Public quotation request submission (website form)
const submitSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("A valid email is required").max(200),
  phone: z.string().min(7, "A valid phone number is required").max(30),
  address: z.string().max(300).optional().nullable(),
  division: z.enum(DIVISION_CODES).optional().nullable(),
  propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"]).default("RESIDENTIAL"),
  monthlyBill: z.string().max(50).optional().nullable(),
  message: z.string().max(3000).optional().nullable(),
  // Honeypot field — bots fill it, humans never see it
  website: z.string().max(0, "Spam detected").optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const ip = getClientIp(req);
    // Rate limit: max 5 submissions per IP per 10 minutes
    if (!rateLimit(`quote:${ip}`, 5, 10 * 60_000)) {
      throw new ApiError("Too many requests. Please try again later.", 429);
    }
    const body = await req.json().catch(() => null);
    if (!body) return fail("Invalid request body", 400);
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return fail(`${first.path.join(".") || "form"}: ${first.message}`, 422);
    }
    const { website, ...data } = parsed.data;

    // Basic spam heuristics: block obvious link spam
    const text = `${data.message ?? ""} ${data.name}`;
    if (/(https?:\/\/|www\.)\S+/i.test(text) && (text.match(/https?:\/\//gi) ?? []).length >= 3) {
      await db.quoteRequest.create({
        data: { ...data, ipAddress: ip, status: "SPAM" },
      });
      return ok({ submitted: true }); // silently accept, mark as spam
    }

    const record = await db.quoteRequest.create({
      data: { ...data, ipAddress: ip },
    });
    await notifyAdmins(
      "New quotation request",
      `${data.name} requested a quotation${data.division ? ` for ${divisionLabel(data.division)}` : ""} (${data.propertyType.toLowerCase()}).`,
      "SYSTEM",
      "/admin/quote-requests"
    );
    return ok({ submitted: true, id: record.id }, { status: 201 });
  });
}

// Admin: list quote requests
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["quoterequests", "leads", "dashboard"]);
    const { page, pageSize, skip, take } = buildPagination(new URL(req.url).searchParams);
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const division = new URL(req.url).searchParams.get("division") ?? undefined;
    const where = {
      ...(status ? { status } : {}),
      ...(division ? { division } : {}),
    };
    const [items, total] = await Promise.all([
      db.quoteRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      db.quoteRequest.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const updateSchema = z.object({
  status: z.string().refine(oneOf(QUOTE_REQUEST_STATUSES, "Status")),
});

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["quoterequests", "leads"]);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return fail("id query parameter is required", 400);
    const { data: qrUpd } = await parseBody(req, updateSchema);
    const status = qrUpd.status as string;
    const updated = await db.quoteRequest.update({ where: { id }, data: { status } });
    await writeAudit(req, session, "STATUS_CHANGE", "QuoteRequest", id, { status });
    return ok(updated);
  });
}
