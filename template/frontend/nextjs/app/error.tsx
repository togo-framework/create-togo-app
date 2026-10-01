"use client";

import { ServerCrash } from "lucide-react";
import { ErrorState, Button } from "@fadymondy/nasaq/web";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <ErrorState
        icon={ServerCrash}
        title="Something went wrong"
        description="An unexpected error occurred (500)."
        actions={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  );
}
