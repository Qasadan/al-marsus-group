import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      success: true,
      data: {
        status: "healthy",
        service: "al-marsus-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: { status: "degraded", database: "disconnected", timestamp: new Date().toISOString() } },
      { status: 503 }
    );
  }
}
