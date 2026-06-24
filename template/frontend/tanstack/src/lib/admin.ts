import { API } from "./api";

export async function adminList(table: string): Promise<any[]> {
  const r = await fetch(`${API}/api/${table}`, { credentials: "include" });
  if (!r.ok) throw new Error(`load failed (${r.status})`);
  const d = await r.json();
  return Array.isArray(d) ? d : (d.items ?? d.data ?? []);
}
export async function adminGet(table: string, id: string): Promise<any> {
  const r = await fetch(`${API}/api/${table}/${id}`, { credentials: "include" });
  if (!r.ok) throw new Error(`load failed (${r.status})`);
  return r.json();
}
async function csrf(): Promise<string> {
  const res = await fetch(`${API}/api/auth/csrf`, { credentials: "include" });
  return (await res.json().catch(() => ({}))).csrf_token ?? "";
}
async function write(method: string, path: string, body?: unknown) {
  const token = await csrf();
  const r = await fetch(`${API}${path}`, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok && r.status !== 204) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || d.detail || `${method} failed (${r.status})`);
  }
}
export const adminCreate = (t: string, data: Record<string, unknown>) => write("POST", `/api/${t}`, data);
export const adminUpdate = (t: string, id: string, data: Record<string, unknown>) => write("PUT", `/api/${t}/${id}`, data);
export const adminDelete = (t: string, id: string) => write("DELETE", `/api/${t}/${id}`);

export interface ResourceField { name: string; type: string; nullable: boolean }
export interface ResourceMeta { name: string; table: string; fields?: ResourceField[] }

export async function metaResources(): Promise<ResourceMeta[]> {
  const r = await fetch(`${API}/api/_meta/resources`, { credentials: "include" }).catch(() => null);
  if (!r || !r.ok) return [];
  return (await r.json().catch(() => ({ resources: [] }))).resources ?? [];
}

const SKIP = ["id", "created_at", "updated_at"];

/** Editable fields for a resource, sourced from the resource DEFINITION (so create
 * forms work on an empty table). Falls back to inferring from a sample row. */
export async function resourceFields(table: string, sampleRow?: Record<string, unknown>): Promise<ResourceField[]> {
  const meta = (await metaResources()).find((m) => m.table === table || m.name === table);
  if (meta?.fields?.length) return meta.fields.filter((f) => !SKIP.includes(f.name));
  if (sampleRow) return editableColumns(sampleRow).map((name) => ({ name, type: "string", nullable: true }));
  return [];
}

export function editableColumns(row: Record<string, unknown>): string[] {
  return Object.keys(row).filter((k) => !SKIP.includes(k));
}

/** Map a resource field's go-type to an HTML input type. */
export function inputType(field: ResourceField): string {
  const t = field.type.toLowerCase();
  if (/int|float|decimal|number/.test(t)) return "number";
  if (/time|date/.test(t)) return "datetime-local";
  if (/bool/.test(t)) return "checkbox";
  return "text";
}
