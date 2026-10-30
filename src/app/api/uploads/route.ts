import { NextRequest } from "next/server";
import { handleRoute, ok, fail, requireAuth, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Secure file upload endpoint — images only, size-limited, random filenames.
// Storage adapter:
//  - Local (sandbox/self-host): written to public/uploads, served statically.
//  - Vercel: when BLOB_READ_WRITE_TOKEN is present (Vercel Blob store attached),
//    files go to Blob and an absolute URL is returned — serverless filesystems
//    are read-only, so this keeps hero/gallery uploads working in production.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects", "gallery", "inventory", "tasks"]);
    const formData = await req.formData().catch(() => null);
    if (!formData) throw new ApiError("Expected multipart form data", 400);
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("No file provided", 422);
    if (!ALLOWED_TYPES[file.type]) {
      return fail("Only JPEG, PNG or WebP images are allowed", 422);
    }
    if (file.size > MAX_SIZE) {
      return fail("File too large (max 5MB)", 422);
    }
    const ext = ALLOWED_TYPES[file.type];
    const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${name}`, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      });
      await writeAudit(req, session, "CREATE", "Upload", blob.pathname, { size: file.size, type: file.type });
      return ok({ url: blob.url }, { status: 201 });
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);
    await writeAudit(req, session, "CREATE", "Upload", name, { size: file.size, type: file.type });
    return ok({ url: `/uploads/${name}` }, { status: 201 });
  });
}
