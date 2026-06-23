import { useEffect, useState } from "react";
import { ProfileView } from "@togo-framework/ui";
import { auth, type Me } from "../lib/auth";

export function Profile() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { auth.me().then(setMe); }, []);
  if (!me) return <div className="p-8 text-muted-foreground">Loading…</div>;
  return <ProfileView user={{ email: me.email, roles: me.roles }} language="en" twoFactorEnabled={false} sessions={[]} />;
}
