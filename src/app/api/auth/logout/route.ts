import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getSession();
    await clearSessionCookie();
    if (session) await writeAudit(req, session, "LOGOUT", "User", session.sub);
    return ok({ loggedOut: true });
  });
}
