import { db } from "./db";
import { getClientIp } from "./api";
import type { NextRequest } from "next/server";
import type { SessionPayload } from "./auth";

export async function writeAudit(
  req: NextRequest | null,
  session: SessionPayload | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: unknown
) {
  try {
    await db.auditLog.create({
      data: {
        userId: session?.sub ?? null,
        userName: session?.name ?? session?.email ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details).slice(0, 4000) : null,
        ipAddress: req ? getClientIp(req) : null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write audit log", e);
  }
}

export async function notifyAdmins(title: string, message: string, type: string, link?: string) {
  try {
    await db.notification.create({
      data: { type, title, message, link: link ?? null, userId: null }, // null = all admins/managers
    });
  } catch (e) {
    console.error("[notify] failed to create notification", e);
  }
}

export async function notifyUser(userId: string, title: string, message: string, type: string, link?: string) {
  try {
    await db.notification.create({
      data: { type, title, message, link: link ?? null, userId },
    });
  } catch (e) {
    console.error("[notify] failed to create user notification", e);
  }
}
