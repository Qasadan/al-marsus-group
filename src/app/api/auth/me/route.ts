import { handleRoute, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET() {
  return handleRoute(async () => {
    const session = await getSession();
    return ok(session ? { user: session } : { user: null });
  });
}
