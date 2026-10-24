import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { getSettings, generateDocNumber } from "@/lib/settings";

// Convert an APPROVED quotation into a project.
// Runs in a transaction with the convertedProjectId unique constraint to
// guarantee no accidental duplicate projects are ever created.
const convertSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  systemSizeKw: z.number().positive().nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  warrantyMonths: z.number().int().min(0).max(240).nullable().optional(),
  defaultTasks: z.array(z.string().min(1).max(200)).max(30).optional(),
});

const DEFAULT_TASKS = [
  "Site preparation and safety setup",
  "Mounting structure installation",
  "Panel installation",
  "Inverter and wiring installation",
  "Battery installation (if applicable)",
  "System testing and commissioning",
  "Customer handover and documentation",
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["quotations", "projects"]);
    const { id } = await params;
    const { data } = await parseBody(req, convertSchema);
    const settings = await getSettings();

    const result = await db.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({ where: { id }, include: { items: true, customer: true } });
      if (!quotation) throw new ApiError("Quotation not found", 404);
      if (quotation.status !== "APPROVED") throw new ApiError("Only approved quotations can be converted to projects", 409);
      if (quotation.convertedProjectId) throw new ApiError("Quotation has already been converted to a project", 409);

      const code = await generateDocNumber(settings.projectPrefix, "project");
      const project = await tx.project.create({
        data: {
          code,
          name: data.name ?? quotation.title,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          status: "PLANNING",
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          budgetCents: quotation.totalCents,
          currency: quotation.currency,
          address: data.address ?? null,
          description: `Created from quotation ${quotation.quoteNumber}`,
          warrantyMonths: data.warrantyMonths ?? null,
          createdById: session.sub,
          tasks: {
            create: (data.defaultTasks ?? DEFAULT_TASKS).map((title, i) => ({
              title,
              sortOrder: i,
            })),
          },
        },
      });
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: "CONVERTED", convertedProjectId: project.id },
      });
      return { project, quotation };
    });

    await writeAudit(req, session, "CONVERT", "Quotation", id, { projectId: result.project.id, projectCode: result.project.code });
    await notifyAdmins("Quotation converted", `${result.quotation.quoteNumber} became project ${result.project.code}.`, "PROJECT_UPDATE", `/admin/projects/${result.project.id}`);
    return ok(result.project, { status: 201 });
  });
}
