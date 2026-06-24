import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Eye } from "lucide-react";
import {
  PageHeader, Button, Input, Label, DataTable,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, useT,
} from "@togo-framework/ui";
import { adminList, adminCreate, adminUpdate, adminDelete, resourceFields, inputType, type ResourceField } from "../lib/admin";
import { API } from "../lib/api";

type Row = Record<string, any>;
type Mode = "create" | "edit" | "view" | "delete";

export function AdminResource() {
  const { resource } = useParams({ strict: false }) as { resource: string };
  const { language } = useT();
  const ar = language === "ar";
  const dir = ar ? "rtl" : "ltr";
  const single = resource.replace(/s$/, "");
  const modeLabel = (m?: Mode) => (m === "edit" ? (ar ? "تعديل" : "Edit") : (ar ? "إضافة" : "Create"));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fields, setFields] = useState<ResourceField[]>([]);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState<{ mode: Mode; row?: Row } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  async function refresh() {
    setRows(await adminList(resource));
  }
  useEffect(() => {
    setRows(null);
    // Fields come from the resource DEFINITION (meta) — so the create form is complete
    // even on an empty table (the old code inferred fields from existing rows → only
    // "title" showed, and create failed validation for the other required fields).
    resourceFields(resource).then(setFields);
    refresh();
    const es = new EventSource(`${API}/events`);
    es.onmessage = () => refresh();
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  function open(mode: Mode, row?: Row) {
    const init: Record<string, string> = {};
    fields.forEach((f) => (init[f.name] = row ? String(row[f.name] ?? "") : ""));
    setForm(init); setErr(""); setModal({ mode, row });
  }

  async function save() {
    setErr("");
    // Coerce each value to its field type; only send required fields when empty.
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.name] ?? "";
      const t = f.type.toLowerCase();
      if (v === "") { if (!f.nullable) payload[f.name] = ""; continue; }
      payload[f.name] = /int|float|decimal|number/.test(t) ? Number(v) : /bool/.test(t) ? v === "true" : v;
    }
    try {
      if (modal?.mode === "edit") await adminUpdate(resource, modal.row!.id, payload);
      else await adminCreate(resource, payload);
      setModal(null); await refresh();
    } catch (e: any) { setErr(e.message); }
  }
  async function del() {
    setErr("");
    try { await adminDelete(resource, modal!.row!.id); setModal(null); await refresh(); }
    catch (e: any) { setErr(e.message); }
  }

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "id", header: "id" },
    ...fields.map((f) => ({ accessorKey: f.name, header: f.name }) as ColumnDef<Row>),
    {
      id: "actions",
      header: () => <span className="block text-end">{ar ? "إجراءات" : "Actions"}</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => open("view", row.original)}><Eye className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => open("edit", row.original)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setModal({ mode: "delete", row: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={resource} description={`${rows?.length ?? 0} ${ar ? "سجل" : "records"}`}
        actions={<Button onClick={() => open("create")}>+ {ar ? "إضافة" : "Create"}</Button>} />
      {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

      <DataTable
        columns={columns}
        data={rows ?? []}
        getRowId={(r) => String((r as Row).id)}
        showGlobalSearch
        showCsvExport
        language={language}
      />

      {/* Create / edit — form built from the resource fields. */}
      <Dialog open={modal?.mode === "create" || modal?.mode === "edit"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle className="capitalize">{modeLabel(modal?.mode)} {single}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>{f.name}{!f.nullable && <span className="text-destructive"> *</span>}</Label>
                <Input id={f.name} type={inputType(f)} required={!f.nullable}
                  value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModal(null)}>{ar ? "إلغاء" : "Cancel"}</Button><Button onClick={save}>{ar ? "حفظ" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.mode === "view"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle className="capitalize">{single}</DialogTitle></DialogHeader>
          <dl className="space-y-2 text-sm">
            {modal?.row && Object.entries(modal.row).map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-border/60 py-1.5"><dt className="w-32 shrink-0 text-muted-foreground">{k}</dt><dd className="break-all">{String(v ?? "")}</dd></div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.mode === "delete"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{ar ? "حذف السجل" : "Delete record"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{ar ? "لا يمكن التراجع عن هذا الإجراء. حذف هذا السجل؟" : "This action cannot be undone. Delete this record?"}</p>
          <DialogFooter><Button variant="secondary" onClick={() => setModal(null)}>{ar ? "إلغاء" : "Cancel"}</Button><Button variant="destructive" onClick={del}>{ar ? "حذف" : "Delete"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
