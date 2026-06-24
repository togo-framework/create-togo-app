import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { StatCard, useT } from "@togo-framework/ui";
import { sessionMe, type Me } from "../lib/auth";
import { metaResources, adminList, type ResourceMeta } from "../lib/admin";

const labelOf = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Dashboard() {
  const { language } = useT();
  const ar = language === "ar";
  const [me, setMe] = useState<Me | null>(null);
  const [counts, setCounts] = useState<{ meta: ResourceMeta; count: number }[]>([]);

  useEffect(() => { sessionMe().then(setMe); }, []);
  useEffect(() => {
    // Resource widgets — one stat card per registered resource (record count).
    metaResources().then(async (ms) => {
      const out = await Promise.all(
        ms.map(async (m) => ({ meta: m, count: (await adminList(m.table).catch(() => [])).length })),
      );
      setCounts(out);
    });
  }, []);

  if (!me) return <div className="p-6 text-muted-foreground">{ar ? "جارٍ التحميل…" : "Loading…"}</div>;

  return (
    // Full-width, Filament-style admin home.
    <div className="space-y-6 p-6" dir={ar ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ar ? "لوحة التحكم" : "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">{ar ? `مرحبًا بعودتك، ${me.email}` : `Welcome back, ${me.email}`}</p>
      </div>

      {/* Resource widgets — auto-built from the app's registered resources. */}
      {counts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map(({ meta, count }) => (
            <Link key={meta.table} to="/admin/$resource" params={{ resource: meta.table }} className="block transition-transform hover:-translate-y-0.5">
              <StatCard label={labelOf(meta.name || meta.table)} value={String(count)} tone="info" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={ar ? "الحساب" : "Account"} value={me.email} />
        <StatCard label={ar ? "الأدوار" : "Roles"} value={(me.roles ?? ["user"]).join(", ")} tone="info" />
        <StatCard label={ar ? "الصلاحيات" : "Permissions"} value={String((me.permissions ?? []).length)} tone="success" />
      </div>
    </div>
  );
}
