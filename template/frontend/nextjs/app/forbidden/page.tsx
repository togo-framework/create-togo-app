"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ErrorState, buttonVariants } from "@fadymondy/nasaq/web";

// 403 page — redirect here from the proxy or route guards when access is denied.
export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <ErrorState
        icon={ShieldAlert}
        title="Forbidden"
        description="You don’t have permission to access this page (403)."
        actions={<Link href="/login" className={buttonVariants({ variant: "primary" })}>Sign in</Link>}
      />
    </main>
  );
}
