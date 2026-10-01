"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState, buttonVariants } from "@fadymondy/nasaq/web";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you’re looking for doesn’t exist (404)."
        actions={<Link href="/" className={buttonVariants({ variant: "secondary" })}>← Back home</Link>}
      />
    </main>
  );
}
