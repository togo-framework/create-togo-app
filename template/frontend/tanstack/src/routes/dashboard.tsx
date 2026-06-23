import { useEffect, useState } from "react";
import { Mail, Shield, KeyRound } from "lucide-react";
import { PageHeader, StatCard } from "@togo-framework/ui";
import { auth, type Me } from "../lib/auth";

export function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { auth.me().then(setMe); }, []);
  if (!me) return <div className="p-8 text-muted-foreground">Loading…</div>;
  return (
    <div className="mx-auto max-w-6xl p-8">
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${me.email}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Mail className="h-4 w-4" />} label="Account" value={me.email} accent="#7c3aed" />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Roles" value={(me.roles ?? ["user"]).join(", ")} accent="#06b6d4" />
        <StatCard icon={<KeyRound className="h-4 w-4" />} label="Permissions" value={String((me.permissions ?? []).length)} accent="#22c55e" />
      </div>
    </div>
  );
}
