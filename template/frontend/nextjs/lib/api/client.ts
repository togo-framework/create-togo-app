// Dynamic API client. The base URL comes from the environment so endpoints are
// never hard-coded (togo convention).
// Defaults to same-origin "/api", which Next proxies to the Go backend (see
// next.config.mjs). Override with NEXT_PUBLIC_API_URL for a remote API.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
