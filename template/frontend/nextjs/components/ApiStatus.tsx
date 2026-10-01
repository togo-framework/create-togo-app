"use client";

import useSWR from "swr";
import { Status } from "@fadymondy/nasaq/web";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ApiStatus pings the backend health endpoint (proxied through Next to the Go
// API) and shows whether the backend is reachable.
export function ApiStatus() {
  const { data, error, isLoading } = useSWR("/api/health", fetcher, {
    refreshInterval: 5000,
    shouldRetryOnError: true,
  });

  const ok = !error && data?.status === "ok";
  const label = isLoading ? "checking…" : ok ? "connected" : "unreachable";

  return (
    <div className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm">
      Backend API: <Status tone={isLoading ? "neutral" : ok ? "success" : "danger"}>{label}</Status>
    </div>
  );
}
