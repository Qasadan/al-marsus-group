import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { getSession, roleCan, Role, SessionPayload } from "./auth";

// ---------- Consistent API response format ----------

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { message, ...extra } }, { status });
}

export function unauthorized(message = "Authentication required") {
  return fail(message, 401);
}

export function forbidden(message = "You do not have permission to perform this action") {
  return fail(message, 403);
}

export function notFound(message = "Resource not found") {
  return fail(message, 404);
}

// ---------- Client IP ----------

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ---------- In-memory rate limiter (per IP) ----------

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

// ---------- Body parsing with validation ----------

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<{ data: T; error?: undefined }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
  try {
    return { data: schema.parse(raw) };
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      throw new ApiError(`${first.path.join(".") || "body"}: ${first.message}`, 422);
    }
    throw e;
  }
}

// ---------- Typed error + route wrapper ----------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return fail(e.message, e.status);
    if (e instanceof ZodError) {
      const first = e.issues[0];
      return fail(`${first.path.join(".") || "body"}: ${first.message}`, 422);
    }
    console.error("[api] unhandled error:", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    // SQLite common constraint errors -> friendly messages
    if (message.includes("UNIQUE constraint failed")) {
      return fail("A record with this unique value already exists", 409);
    }
    if (message.includes("FOREIGN KEY constraint failed")) {
      return fail("Cannot complete: this record is referenced by other records", 409);
    }
    return fail("Internal server error", 500);
  }
}

// ---------- Auth guards for API routes ----------

export async function requireAuth(permissions?: string | string[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError("Authentication required", 401);
  if (permissions && permissions.length > 0) {
    const needed = Array.isArray(permissions) ? permissions : [permissions];
    const allowed = needed.some((p) => roleCan(session.role as Role, p));
    if (!allowed) throw new ApiError("You do not have permission to perform this action", 403);
  }
  return session;
}

export function parseIntParam(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function buildPagination(searchParams: URLSearchParams) {
  const page = parseIntParam(searchParams.get("page"), 1);
  const pageSize = Math.min(parseIntParam(searchParams.get("pageSize"), 20), 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
