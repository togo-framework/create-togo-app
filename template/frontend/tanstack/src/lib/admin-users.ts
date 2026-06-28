// Admin user-management + mail API client — talks to the built-in /api/admin/*
// surface (internal/admin in the Go app, backed by the togo auth plugin).
// Endpoints sit behind the auth session cookie, so every call sends credentials.
import { API } from "./api";
import type { AdminUser, MailConfig, MailTestResult, AdminLinkResult } from "@togo-framework/ui";

export class AdminError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api/admin${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AdminError(data.error || data.detail || `request failed (${res.status})`, res.status);
  return data as T;
}

export interface CreateUserInput {
  email: string;
  password?: string;
  roles: string[];
  permissions?: string[];
}
export interface EditUserPayload {
  email?: string;
  roles?: string[];
  permissions?: string[];
}

export const adminUsers = {
  list: (q?: string): Promise<AdminUser[]> => req("GET", `/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  create: (input: CreateUserInput): Promise<{ user: AdminUser; note?: string }> => req("POST", "/users", input),
  update: (id: string, input: EditUserPayload): Promise<AdminUser> => req("PATCH", `/users/${id}`, input),
  remove: (id: string): Promise<void> => req("DELETE", `/users/${id}`),
  impersonate: (id: string): Promise<{ token?: string; identity?: AdminUser }> => req("POST", `/users/${id}/impersonate`),
  resetPassword: (id: string, password?: string): Promise<AdminLinkResult & { reset?: boolean }> =>
    req("POST", `/users/${id}/reset-password`, password ? { password } : {}),
  magicLink: (id: string): Promise<AdminLinkResult> => req("POST", `/users/${id}/magic-link`),
};

export const adminMail = {
  get: (): Promise<MailConfig> => req("GET", "/mail"),
  save: (cfg: MailConfig): Promise<void> => req("PUT", "/mail", cfg),
  test: async (to: string): Promise<MailTestResult> => {
    try {
      const r = await req<{ ok?: boolean; error?: string }>("POST", "/mail/test", { to });
      return { ok: !!r.ok, error: r.error };
    } catch (e) {
      return { ok: false, error: e instanceof AdminError ? e.message : "Test failed" };
    }
  },
};

// Impersonation is a thin client-side flag (the session cookie already switched
// server-side). The ImpersonationBanner reads it; "Stop" logs out + returns to login.
const IMP_KEY = "togo-impersonating";
export function setImpersonating(email: string | null) {
  if (email) localStorage.setItem(IMP_KEY, email);
  else localStorage.removeItem(IMP_KEY);
  window.dispatchEvent(new Event("togo-impersonation"));
}
export function getImpersonating(): string | null {
  return localStorage.getItem(IMP_KEY);
}
