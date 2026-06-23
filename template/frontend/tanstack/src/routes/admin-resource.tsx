import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Pencil, Trash2, Eye } from "lucide-react";
import {
  PageHeader, Button, Input, Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@togo-framework/ui";
import { adminList, adminCreate, adminUpdate, adminDelete, editableColumns } from "../lib/admin";
import { API } from "../lib/api";

type Row = Record<string, any>;
type Mode = "create" | "edit" | "view" | "delete";

export function AdminResource() {
  const { resource } = useParams({ strict: false }) as { resource: string };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cols, setCols] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState<{ mode: Mode; row?: Row } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  async function refresh() {
    const data = await adminList(resource);
    setRows(data); if (data[0]) setCols(editableColumns(data[0]));
  }
  useEffect(() => {
    refresh();
    const es = new EventSource(`${API}/events`);
    es.onmessage = () => refresh();
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const editCols = cols.length ? cols : ["title"];
  const headers = rows?.[0] ? Object.keys(rows[0]) : ["id", ...editCols];

  function open(mode: Mode, row?: Row) {
    const init: Record<string, string> = {};
    editCols.forEach((c) => (init[c] = row ? String(row[c] ?? "") : ""));
    setForm(init); setModal({ mode, row });
  }
  async function save() {
    setErr("");
    try {
      if (modal?.mode === "edit") await adminUpdate(resource, modal.row!.id, form);
      else await adminCreate(resource, form);
      setModal(null); await refresh();
    } catch (e: any) { setErr(e.message); }
  }
  async function del() {
    setErr("");
    try { await adminDelete(resource, modal!.row!.id); setModal(null); await refresh(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <PageHeader title={resource} description={`${rows?.length ?? 0} records`}
        actions={<Button onClick={() => open("create")}>+ Create</Button>} />
      {err && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader><TableRow>
            {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
            <TableHead className="text-end">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows == null ? (
              <TableRow><TableCell colSpan={99} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={99} className="py-10 text-center text-muted-foreground">No records yet.</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                {headers.map((h) => <TableCell key={h} className="max-w-[240px] truncate">{String(row[h] ?? "")}</TableCell>)}
                <TableCell className="whitespace-nowrap text-end">
                  <Button size="sm" variant="ghost" onClick={() => open("view", row)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => open("edit", row)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setModal({ mode: "delete", row })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modal?.mode === "create" || modal?.mode === "edit"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{modal?.mode} {resource.replace(/s$/, "")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editCols.map((c) => (
              <div key={c} className="space-y-1.5"><Label htmlFor={c}>{c}</Label>
                <Input id={c} value={form[c] ?? ""} onChange={(e) => setForm({ ...form, [c]: e.target.value })} /></div>
            ))}
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.mode === "view"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{resource.replace(/s$/, "")}</DialogTitle></DialogHeader>
          <dl className="space-y-2 text-sm">
            {modal?.row && Object.entries(modal.row).map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-border/60 py-1.5"><dt className="w-32 shrink-0 text-muted-foreground">{k}</dt><dd className="break-all">{String(v ?? "")}</dd></div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.mode === "delete"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete record</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. Delete this record?</p>
          <DialogFooter><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button variant="destructive" onClick={del}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
