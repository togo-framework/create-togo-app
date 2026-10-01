// Admin user-management + mail API client — talks to the built-in /api/admin/*
// surface (internal/admin in the Go app, backed by the togo auth plugin).
// Endpoints sit behind the auth session cookie, so every call sends credentials.
// The mail helpers translate between the backend's SMTP shape and Nasaq's SmtpSettings.
import type { SmtpConfig, SmtpSaveInput, TestOutcome, TestStepId } from "@fadymondy/nasaq/web";
import { API } from "./api";

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

/** A user as the backend returns it. */
export interface AdminUser {
  id: string | number;
  email: string;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
}
/** Result of a reset-password / magic-link call: the link, or `emailed` when SMTP delivered it. */
export interface AdminLinkResult { link?: string; emailed?: boolean }

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

/** The backend's SMTP config. `secure` means TLS: implicit on port 465, STARTTLS otherwise. */
interface BackendMail { host?: string; port?: number; username?: string; password?: string; from?: string; secure?: boolean }
const MASK = "••••••••";

function toSmtp(m: BackendMail): SmtpConfig {
  const from = m.from ?? "";
  const named = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  const port = m.port || 587;
  return {
    host: m.host ?? "",
    port,
    encryption: !m.secure ? "none" : port === 465 ? "tls" : "starttls",
    username: m.username ?? "",
    fromName: named ? named[1].replace(/^"|"$/g, "") : "",
    fromAddress: named ? named[2] : from,
    passwordSet: !!m.password,
  };
}

function fromSmtp(s: SmtpSaveInput): BackendMail {
  return {
    host: s.host,
    port: s.port,
    username: s.username,
    // An empty or masked password keeps the stored one server-side.
    password: s.password || MASK,
    from: s.fromName ? `${s.fromName} <${s.fromAddress}>` : s.fromAddress,
    secure: s.encryption !== "none",
  };
}

// The backend reports one error string; place it on the step it most likely failed at.
function failedStep(error: string): TestStepId {
  const e = error.toLowerCase();
  if (/dial|connect|refused|timeout|no such host|lookup/.test(e)) return "connect";
  if (/tls|certificate|x509|handshake/.test(e)) return "tls";
  if (/auth|credential|password|535/.test(e)) return "auth";
  return "send";
}

const STEPS: TestStepId[] = ["connect", "tls", "auth", "send"];

export const adminMail = {
  get: async (): Promise<SmtpConfig> => toSmtp(await req<BackendMail>("GET", "/mail")),
  save: (input: SmtpSaveInput): Promise<void> => req("PUT", "/mail", fromSmtp(input)),
  /** Saves the form first (the backend tests the saved config), then sends a test message. */
  test: async (input: SmtpSaveInput & { to: string }): Promise<TestOutcome> => {
    let error: string | undefined;
    try {
      await adminMail.save(input);
      const r = await req<{ ok?: boolean; error?: string }>("POST", "/mail/test", { to: input.to });
      if (!r.ok) error = r.error || "Test failed";
    } catch (e) {
      error = e instanceof Error ? e.message : "Test failed";
    }
    if (!error) return { ok: true, steps: STEPS.map((id) => ({ id, ok: true })) };
    const at = STEPS.indexOf(failedStep(error));
    return {
      ok: false,
      steps: STEPS.slice(0, at + 1).map((id, i) => (i < at ? { id, ok: true } : { id, ok: false, message: error })),
    };
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
