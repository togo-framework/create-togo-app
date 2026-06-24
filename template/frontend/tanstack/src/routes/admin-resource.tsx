import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Eye } from "lucide-react";
import {
  PageHeader, Button, Input, Textarea, Switch, Label, DataTable,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, useT,
} from "@togo-framework/ui";
import { adminList, adminCreate, adminUpdate, adminDelete, resourceFields, inputType, type ResourceField } from "../lib/admin";
import { API } from "../lib/api";

type Row = Record<string, any>;
type Mode = "create" | "edit" | "view" | "delete";

const labelOf = (name: string) => name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
    // even on an empty table, and each input renders for its declared type.
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
    ...fields.map((f) => ({ accessorKey: f.name, header: labelOf(f.name) }) as ColumnDef<Row>),
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

  // Filament-style schema field: the component is chosen from the field's declared type.
  function FieldInput({ f }: { f: ResourceField }) {
    const t = f.type.toLowerCase();
    const val = form[f.name] ?? "";
    const set = (v: string) => setForm((s) => ({ ...s, [f.name]: v }));
    const lbl = (
      <Label htmlFor={f.name}>{labelOf(f.name)}{!f.nullable && <span className="text-destructive"> *</span>}</Label>
    );
    if (/bool/.test(t)) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          {lbl}
          <Switch checked={val === "true"} onCheckedChange={(c: boolean) => set(c ? "true" : "false")} />
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        {lbl}
        {t === "text" ? (
          <Textarea id={f.name} rows={4} required={!f.nullable} value={val} onChange={(e) => set(e.target.value)} />
        ) : (
          <Input id={f.name} type={inputType(f)} required={!f.nullable} value={val} onChange={(e) => set(e.target.value)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={labelOf(resource)} description={`${rows?.length ?? 0} ${ar ? "سجل" : "records"}`}
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

      {/* Create / edit — a dynamic schema form: each field renders for its declared type. */}
      <Dialog open={modal?.mode === "create" || modal?.mode === "edit"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle className="capitalize">{modeLabel(modal?.mode)} {single}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {fields.map((f) => <FieldInput key={f.name} f={f} />)}
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModal(null)}>{ar ? "إلغاء" : "Cancel"}</Button><Button onClick={save}>{ar ? "حفظ" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View — a Filament-style infolist: labelled key/value rows. */}
      <Dialog open={modal?.mode === "view"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle className="capitalize">{single}</DialogTitle></DialogHeader>
          <dl className="divide-y divide-border/60 rounded-lg border border-border text-sm">
            {modal?.row && Object.entries(modal.row).map(([k, v]) => (
              <div key={k} className="flex gap-3 px-3 py-2">
                <dt className="w-36 shrink-0 text-muted-foreground">{labelOf(k)}</dt>
                <dd className="break-all font-medium">{v === null || v === "" ? <span className="text-muted-foreground/60">—</span> : String(v)}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter><Button variant="secondary" onClick={() => setModal(null)}>{ar ? "إغلاق" : "Close"}</Button><Button onClick={() => modal?.row && open("edit", modal.row)}>{ar ? "تعديل" : "Edit"}</Button></DialogFooter>
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
