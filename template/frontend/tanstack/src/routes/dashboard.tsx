import { useEffect, useState } from "react";
import { StatCard, useT } from "@togo-framework/ui";
import { sessionMe, type Me } from "../lib/auth";

export function Dashboard() {
  const { language } = useT();
  const ar = language === "ar";
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { sessionMe().then(setMe); }, []);
  if (!me) return <div className="p-6 text-muted-foreground">{ar ? "جارٍ التحميل…" : "Loading…"}</div>;

  return (
    // Full-width, Filament-style admin home. space-y-6 keeps a tight, consistent gap
    // between the page title and the content (no oversized PageHeader margin).
    <div className="space-y-6 p-6" dir={ar ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ar ? "لوحة التحكم" : "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">{ar ? `مرحبًا بعودتك، ${me.email}` : `Welcome back, ${me.email}`}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={ar ? "الحساب" : "Account"} value={me.email} />
        <StatCard label={ar ? "الأدوار" : "Roles"} value={(me.roles ?? ["user"]).join(", ")} tone="info" />
        <StatCard label={ar ? "الصلاحيات" : "Permissions"} value={String((me.permissions ?? []).length)} tone="success" />
      </div>
    </div>
  );
}
