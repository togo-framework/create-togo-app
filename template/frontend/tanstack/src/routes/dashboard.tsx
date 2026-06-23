import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@togo-framework/ui";
import { auth, type Me } from "../lib/auth";

export function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { auth.me().then(setMe); }, []);
  if (!me) return <div className="p-8 text-muted-foreground">Loading…</div>;
  return (
    <div className="mx-auto max-w-6xl p-8">
      <PageHeader title="Dashboard" description={`Welcome back, ${me.email}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Account" value={me.email} />
        <StatCard label="Roles" value={(me.roles ?? ["user"]).join(", ")} tone="info" />
        <StatCard label="Permissions" value={String((me.permissions ?? []).length)} tone="success" />
      </div>
    </div>
  );
}
