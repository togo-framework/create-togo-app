import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { Button } from "@togo-framework/ui";
import { API, APP_NAME } from "../lib/api";

export function Welcome() {
  const [health, setHealth] = useState<{ status?: string; togo?: string } | null>(null);
  useEffect(() => {
    fetch(`${API}/api/health`).then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Layers className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">{APP_NAME}</h1>
        <p className="mt-3 text-muted-foreground">Built with togo · TanStack frontend.</p>
        <div className="mt-10 space-y-3">
          <Button asChild className="w-full"><Link to="/login">Log in</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link to="/register">Create account</Link></Button>
          <Link to="/dashboard" className="block pt-2 text-sm text-muted-foreground hover:underline">Go to dashboard →</Link>
        </div>
        <div className="mt-12 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${health?.status === "ok" ? "bg-emerald-400" : "bg-slate-600"}`} />
            API {health?.status === "ok" ? "connected" : "offline"}
          </span>
          <span>·</span><a href={`${API}/docs`} className="hover:underline">REST docs</a>
          <span>·</span><a href={`${API}/graphql/play`} className="hover:underline">GraphQL</a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground/70">togo {health?.togo ?? "…"} · powered by Go</p>
      </div>
    </main>
  );
}
