import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { getPublicSettings } from "@/lib/settings";

// Server-side wrapper: fetches company settings from the database and
// renders the shared header/footer around public pages.
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        whatsapp={settings.whatsappNumber}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        email={settings.email}
        phone={settings.phone}
        whatsapp={settings.whatsappNumber}
        address={settings.address}
      />
    </div>
  );
}
