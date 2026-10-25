import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { DIVISION_CODES } from "@/lib/divisions";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["gallery", "dashboard"]);
    const publicOnly = new URL(req.url).searchParams.get("publicOnly") === "true";
    const items = await db.galleryItem.findMany({
      where: publicOnly ? { isPublic: true } : {},
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { project: { select: { code: true, name: true } } },
    });
    return ok(items);
  });
}

const createSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().min(1, "Image URL is required").max(500),
  division: z.enum(DIVISION_CODES).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  capacityKw: z.number().positive().nullable().optional(),
  isPublic: z.boolean().default(true),
  projectId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["gallery"]);
    const { data } = await parseBody(req, createSchema);
    const item = await db.galleryItem.create({ data });
    await writeAudit(req, session, "CREATE", "GalleryItem", item.id, { title: item.title });
    return ok(item, { status: 201 });
  });
}

const updateSchema = createSchema.partial();

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["gallery"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    const { data } = await parseBody(req, updateSchema);
    const item = await db.galleryItem.update({ where: { id }, data });
    await writeAudit(req, session, "UPDATE", "GalleryItem", id, data);
    return ok(item);
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["gallery"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    await db.galleryItem.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "GalleryItem", id);
    return ok({ deleted: true });
  });
}
