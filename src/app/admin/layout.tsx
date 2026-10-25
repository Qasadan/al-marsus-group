import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role === "CUSTOMER") redirect("/portal");

  return (
    <AdminShell user={{ name: session.name, email: session.email, role: session.role }}>
      {children}
    </AdminShell>
  );
}
