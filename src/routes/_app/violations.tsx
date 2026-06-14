import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Plus, Upload, Search, AlertTriangle, Link as LinkIcon, Ban } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatDate } from "@/lib/queries";

export const Route = createFileRoute("/_app/violations")({ component: ViolationsPage });

type Violation = {
  id: string;
  type: "PPA" | "ticket" | "impound";
  status: "pending" | "paid" | "contested" | "unmatched" | "matched" | "not_our_vehicle";
  date_issued: string;
  time_issued: string | null;
  location: string | null;
  plate_text: string | null;
  amount: number | null;
  notes: string | null;
  source: string;
  vehicle_id: string | null;
  driver_id: string | null;
  rental_id: string | null;
  created_at: string;
};

const TONE: Record<Violation["status"], "warning" | "success" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  unmatched: "warning",
  matched: "info",
  paid: "success",
  contested: "info",
  not_our_vehicle: "danger",
};

function ViolationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"unmatched" | "matched" | "all">("unmatched");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [matchTarget, setMatchTarget] = useState<Violation | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["violations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("violations").select("*").order("date_issued", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Violation[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["violations"] });

  const filtered = useMemo(() => {
    const list = rows ?? [];
    if (tab === "all") return list;
    if (tab === "matched") return list.filter((v) => v.status === "matched" || v.rental_id);
    return list.filter((v) => v.status === "unmatched" || (!v.rental_id && v.status === "pending"));
  }, [rows, tab]);

  return (
    <>
      <PageHeader
        title="Violations"
        description={`${rows?.length ?? 0} total · ${(rows ?? []).filter((v) => !v.rental_id && v.status !== "not_our_vehicle").length} unmatched`}
        action={
          <div className="flex gap-2">
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg"><Upload className="h-4 w-4 mr-1" /> Bulk Import</Button>
              </DialogTrigger>
              <ImportDialog onClose={() => { setImportOpen(false); refresh(); }} />
            </Dialog>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="lg"><Plus className="h-4 w-4 mr-1" /> Add Violation</Button>
              </DialogTrigger>
              <AddViolationDialog onClose={() => { setAddOpen(false); refresh(); }} />
            </Dialog>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        {(["unmatched", "matched", "all"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t === "unmatched" ? "Unmatched" : t === "matched" ? "Matched" : "All"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No violations in this view.</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    {v.type} · {v.plate_text || "—"} · {formatMoney(v.amount)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    <div>Date: {formatDate(v.date_issued)} {v.time_issued ? `at ${v.time_issued.slice(0, 5)}` : ""}</div>
                    {v.location && <div>Location: {v.location}</div>}
                    <div>Source: {v.source}</div>
                    {v.notes && <div>Notes: {v.notes}</div>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge tone={TONE[v.status] ?? "neutral"}>{v.status.toUpperCase().replace(/_/g, " ")}</StatusBadge>
                  {!v.rental_id && v.status !== "not_our_vehicle" && (
                    <Button size="sm" variant="outline" onClick={() => setMatchTarget(v)}>
                      <LinkIcon className="h-4 w-4 mr-1" /> Manual Match
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!matchTarget} onOpenChange={(o) => !o && setMatchTarget(null)}>
        {matchTarget && (
          <ManualMatchDialog violation={matchTarget} onClose={() => { setMatchTarget(null); refresh(); }} />
        )}
      </Dialog>
    </>
  );
}

/* ===================== Add Violation Dialog ===================== */

function AddViolationDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    type: "PPA" as Violation["type"],
    plate_text: "",
    date_issued: new Date().toISOString().slice(0, 10),
    time_issued: "",
    location: "",
    amount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate_text.trim() || !form.date_issued) return toast.error("Plate and date required");
    setSaving(true);
    const { error } = await supabase.from("violations").insert({
      type: form.type,
      plate_text: form.plate_text.trim().toUpperCase(),
      date_issued: form.date_issued,
      time_issued: form.time_issued || null,
      location: form.location || null,
      amount: form.amount ? Number(form.amount) : null,
      notes: form.notes || null,
      source: "manual",
      status: "unmatched",
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Violation added");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add Violation</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Violation["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PPA">PPA / Toll</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
                <SelectItem value="impound">Impound</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Plate *</Label><Input value={form.plate_text} onChange={(e) => setForm({ ...form, plate_text: e.target.value })} placeholder="XPRX21" /></div>
          <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.date_issued} onChange={(e) => setForm({ ...form, date_issued: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={form.time_issued} onChange={(e) => setForm({ ...form, time_issued: e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="41E" /></div>
          <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="52.64" /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Violation"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ===================== Bulk Import Dialog ===================== */

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const split = (l: string) => {
    const out: string[] = [];
    let cur = "", q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).filter((l) => l.trim()).map((l) => {
    const cells = split(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [type, setType] = useState<Violation["type"]>("PPA");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const rows = parseCSV(text);
    if (!rows.length) return toast.error("No rows parsed. Need CSV with headers.");
    const payload = rows.map((r) => {
      const plate = (r.plate || r.plate_text || r.license || "").toUpperCase().trim();
      const date = r.date || r.date_issued || r["date/time"]?.split(/[ T]/)[0] || "";
      const time = r.time || r.time_issued || (r["date/time"]?.split(/[ T]/)[1] ?? "").slice(0, 8) || null;
      return {
        type,
        plate_text: plate || null,
        date_issued: date,
        time_issued: time || null,
        location: r.location || r.where || null,
        amount: r.amount ? Number(String(r.amount).replace(/[^0-9.]/g, "")) : null,
        notes: r.notes || null,
        source: "import",
        status: "unmatched",
        raw: r,
      };
    }).filter((r) => r.date_issued && r.plate_text);
    if (!payload.length) return toast.error("No valid rows (need plate + date columns)");
    setBusy(true);
    const { error } = await supabase.from("violations").insert(payload as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${payload.length} violation(s)`);
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
      <DialogHeader><DialogTitle>Bulk Import Violations</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Paste CSV with headers. Supported columns: <code>plate</code>, <code>date</code>, <code>time</code>, <code>location</code>, <code>amount</code>, <code>notes</code>.
        </p>
        <div className="space-y-1.5">
          <Label>Violation Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as Violation["type"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PPA">PPA / Toll</SelectItem>
              <SelectItem value="ticket">Ticket</SelectItem>
              <SelectItem value="impound">Impound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>CSV Data</Label>
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"plate,date,time,location,amount\nXPRX21,2026-02-27,17:44:09,41E,52.64"} className="font-mono text-xs" />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !text.trim()}>{busy ? "Importing…" : "Import"}</Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}

/* ===================== Manual Match Dialog ===================== */

type RentalMatch = {
  id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  vehicle_id: string;
  driver_id: string;
  vehicle?: { year: number; make: string; model: string; plate: string };
  driver?: { full_name: string; phone: string | null };
};

function ManualMatchDialog({ violation, onClose }: { violation: Violation; onClose: () => void }) {
  const [searchDate, setSearchDate] = useState(violation.date_issued);
  const [searchPlate, setSearchPlate] = useState(violation.plate_text || "");
  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState<RentalMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const runSearch = async () => {
    setSearching(true);
    try {
      let vehicleIds: string[] | null = null;
      if (searchPlate.trim()) {
        const { data: vs } = await supabase.from("vehicles").select("id").ilike("plate", `%${searchPlate.trim()}%`);
        vehicleIds = (vs ?? []).map((v) => v.id);
        if (vehicleIds.length === 0) { setResults([]); return; }
      }
      let driverIds: string[] | null = null;
      if (searchName.trim()) {
        const { data: ds } = await supabase.from("drivers").select("id").ilike("full_name", `%${searchName.trim()}%`);
        driverIds = (ds ?? []).map((d) => d.id);
        if (driverIds.length === 0) { setResults([]); return; }
      }
      let q = supabase.from("rentals").select("*").order("start_date", { ascending: false }).limit(50);
      if (vehicleIds) q = q.in("vehicle_id", vehicleIds);
      if (driverIds) q = q.in("driver_id", driverIds);
      if (searchDate) {
        // rental covers the date if start_date <= date AND (end_date IS NULL OR end_date >= date)
        q = q.lte("start_date", searchDate).or(`end_date.is.null,end_date.gte.${searchDate}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      const rentals = (data ?? []) as any[];
      // hydrate vehicles + drivers
      const vids = Array.from(new Set(rentals.map((r) => r.vehicle_id)));
      const dids = Array.from(new Set(rentals.map((r) => r.driver_id)));
      const [{ data: vs }, { data: ds }] = await Promise.all([
        vids.length ? supabase.from("vehicles").select("id, year, make, model, plate").in("id", vids) : Promise.resolve({ data: [] as any[] }),
        dids.length ? supabase.from("drivers").select("id, full_name, phone").in("id", dids) : Promise.resolve({ data: [] as any[] }),
      ]);
      const vmap = Object.fromEntries((vs ?? []).map((v) => [v.id, v]));
      const dmap = Object.fromEntries((ds ?? []).map((d) => [d.id, d]));
      setResults(rentals.map((r) => ({ ...r, vehicle: vmap[r.vehicle_id], driver: dmap[r.driver_id] })));
    } catch (e: any) {
      toast.error(e.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const matchTo = async (r: RentalMatch) => {
    setMatching(r.id);
    const { error } = await supabase.from("violations").update({
      rental_id: r.id,
      vehicle_id: r.vehicle_id,
      driver_id: r.driver_id,
      status: "matched",
    }).eq("id", violation.id);
    setMatching(null);
    if (error) return toast.error(error.message);
    toast.success("Matched to rental");
    onClose();
  };

  const flagNotMine = async () => {
    if (!confirm("Flag this violation as 'Not our vehicle'? It will be queued for dispute.")) return;
    const { error } = await supabase.from("violations").update({ status: "not_our_vehicle" }).eq("id", violation.id);
    if (error) return toast.error(error.message);
    toast.success("Flagged for dispute");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
      <DialogHeader><DialogTitle>Manual Match Violation</DialogTitle></DialogHeader>

      <Card className="p-3 bg-muted/40 text-sm space-y-1 mb-3">
        <div><strong>Plate:</strong> {violation.plate_text || "—"}</div>
        <div><strong>Date/Time:</strong> {formatDate(violation.date_issued)} {violation.time_issued?.slice(0, 5) || ""}</div>
        <div><strong>Location:</strong> {violation.location || "—"}</div>
        <div><strong>Amount:</strong> {formatMoney(violation.amount)}</div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Plate</Label><Input value={searchPlate} onChange={(e) => setSearchPlate(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Customer Name</Label><Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="optional" /></div>
      </div>
      <div className="flex gap-2 mt-2">
        <Button onClick={runSearch} disabled={searching}><Search className="h-4 w-4 mr-1" /> {searching ? "Searching…" : "Search"}</Button>
        <Button variant="outline" onClick={flagNotMine}><Ban className="h-4 w-4 mr-1" /> Plate Not Mine</Button>
      </div>

      <div className="mt-4 space-y-2">
        {results === null ? (
          <p className="text-sm text-muted-foreground">Enter criteria and click Search.</p>
        ) : results.length === 0 ? (
          <Card className="p-4 text-center space-y-3">
            <p className="text-muted-foreground">No rentals matched.</p>
            <Button size="sm" variant="outline" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Create New Rental Record</Button>
          </Card>
        ) : (
          results.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm">
                <div className="font-semibold">{r.driver?.full_name || "—"}</div>
                <div className="text-muted-foreground">
                  {r.vehicle ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model} · ${r.vehicle.plate}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(r.start_date)} → {r.end_date ? formatDate(r.end_date) : "ongoing"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge tone={r.is_active ? "success" : "neutral"}>{r.is_active ? "Active" : "Returned"}</StatusBadge>
                <Button size="sm" disabled={matching === r.id} onClick={() => matchTo(r)}>
                  {matching === r.id ? "Matching…" : "Match to This Rental"}
                </Button>
              </div>
            </Card>
          ))
        )}
        {results !== null && results.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> None match — create new rental
          </Button>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <CreateRentalDialog violation={violation} onCreated={async (rentalId, vehicleId, driverId) => {
          await supabase.from("violations").update({
            rental_id: rentalId, vehicle_id: vehicleId, driver_id: driverId, status: "matched",
          }).eq("id", violation.id);
          toast.success("Rental created and violation matched");
          setCreating(false);
          onClose();
        }} />
      </Dialog>
    </DialogContent>
  );
}

/* ===================== Create Rental Dialog ===================== */

function CreateRentalDialog({ violation, onCreated }: { violation: Violation; onCreated: (rentalId: string, vehicleId: string, driverId: string) => void }) {
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, year, make, model, plate").order("plate");
      return data ?? [];
    },
  });
  const { data: drivers } = useQuery({
    queryKey: ["drivers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const [vehicleId, setVehicleId] = useState("");
  const [driverMode, setDriverMode] = useState<"existing" | "new">("existing");
  const [driverId, setDriverId] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [startDate, setStartDate] = useState(violation.date_issued);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState(`Created retroactively to match violation ${violation.id.slice(0, 8)} on ${violation.date_issued}.`);
  const [saving, setSaving] = useState(false);

  // preselect vehicle matching plate
  useMemo(() => {
    if (!vehicleId && vehicles && violation.plate_text) {
      const v = vehicles.find((x: any) => x.plate?.toUpperCase() === violation.plate_text?.toUpperCase());
      if (v) setVehicleId(v.id);
    }
  }, [vehicles]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return toast.error("Vehicle required");
    if (driverMode === "existing" && !driverId) return toast.error("Driver required");
    if (driverMode === "new" && !newDriverName.trim()) return toast.error("Driver name required");
    setSaving(true);
    try {
      let useDriverId = driverId;
      if (driverMode === "new") {
        const { data: nd, error: de } = await supabase.from("drivers").insert({
          full_name: newDriverName.trim(),
          phone: newDriverPhone.trim() || null,
          status: "pending",
        } as any).select().single();
        if (de) throw de;
        useDriverId = nd.id;
      }
      const { data: rd, error: re } = await supabase.from("rentals").insert({
        vehicle_id: vehicleId,
        driver_id: useDriverId,
        start_date: startDate,
        end_date: endDate || null,
        weekly_rate: 0,
        is_active: !endDate,
        notes,
      } as any).select().single();
      if (re) throw re;
      onCreated(rd.id, vehicleId, useDriverId);
    } catch (e: any) {
      toast.error(e.message || "Failed to create rental");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Create Retroactive Rental</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Vehicle *</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
            <SelectContent>
              {(vehicles ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate} — {v.year} {v.make} {v.model}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Customer</Label>
          <div className="flex gap-2 mb-2">
            <Button type="button" size="sm" variant={driverMode === "existing" ? "default" : "outline"} onClick={() => setDriverMode("existing")}>Existing</Button>
            <Button type="button" size="sm" variant={driverMode === "new" ? "default" : "outline"} onClick={() => setDriverMode("new")}>New</Button>
          </div>
          {driverMode === "existing" ? (
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                {(drivers ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Full name" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} />
              <Input placeholder="Phone" value={newDriverPhone} onChange={(e) => setNewDriverPhone(e.target.value)} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Start Date *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Rental & Match"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}