"use client";

import useSWR from "swr";

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
  const color = isLoading ? "#999" : ok ? "#22c55e" : "#ef4444";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm">
      <span
        style={{ background: color }}
        className="inline-block h-2.5 w-2.5 rounded-full"
      />
      Backend API: <span style={{ color }}>{label}</span>
    </div>
  );
}
