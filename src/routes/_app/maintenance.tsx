import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatDate } from "@/lib/queries";

export const Route = createFileRoute("/_app/maintenance")({ component: MaintenancePage });

const PROBLEM_TYPES = ["Transmission", "Engine", "Brakes", "Tires", "Battery", "Suspension", "Electrical", "AC/Heat", "Other"];

type LineItem = { description: string; part_price: string; labor_price: string };
const blankItem = (): LineItem => ({ description: "", part_price: "", labor_price: "" });
const num = (s: string) => {
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

type Vehicle = { id: string; year: number; make: string; model: string; plate: string };
type Vendor = { id: string; name: string; phone: string };
type Maintenance = {
  id: string;
  vehicle_id: string;
  service_type: string;
  problem_type: string | null;
  vendor: string | null;
  cost: number | null;
  down_payment: number | null;
  notes: string | null;
  date_completed: string | null;
  estimated_return_at: string | null;
  created_at: string;
  vehicles?: { year: number; make: string; model: string; plate: string } | null;
};

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function MaintenancePage() {
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const { data: records, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((m) => m.vehicle_id).filter(Boolean)));
      let vmap: Record<string, Vehicle> = {};
      if (ids.length) {
        const { data: vs } = await supabase.from("vehicles").select("id, year, make, model, plate").in("id", ids);
        for (const v of vs ?? []) vmap[v.id] = v as Vehicle;
      }
      return (data as any[]).map((m) => ({ ...m, vehicles: vmap[m.vehicle_id] ?? null })) as Maintenance[];
    },
  });

  const open = (records ?? []).filter((m) => !m.date_completed);
  const completed = (records ?? []).filter((m) => m.date_completed);

  const refresh = () => qc.invalidateQueries({ queryKey: ["maintenance"] });

  return (
    <>
      <PageHeader
        title="Maintenance"
        description={`${open.length} open · ${completed.length} completed`}
        action={
          <div className="flex gap-2">
            <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg"><Plus className="h-4 w-4 mr-1" /> Log Service</Button>
              </DialogTrigger>
              <LogServiceDialog onClose={() => { setServiceOpen(false); refresh(); }} />
            </Dialog>
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger asChild>
                <Button size="lg"><Plus className="h-4 w-4 mr-1" /> Add Issue</Button>
              </DialogTrigger>
              <AddIssueDialog onClose={() => { setIssueOpen(false); refresh(); }} />
            </Dialog>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Open Issues</h2>
            {open.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No open issues.</Card>
            ) : (
              <div className="grid gap-3">
                {open.map((m) => (
                  <Card key={m.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {m.vehicles ? `${m.vehicles.year} ${m.vehicles.make} ${m.vehicles.model} · ${m.vehicles.plate}` : "Vehicle"}
                        </div>
                        <div className="text-sm mt-1">
                          {m.problem_type && <span className="font-medium">{m.problem_type}: </span>}
                          {m.service_type}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div>Vendor: {m.vendor || "—"}</div>
                          <div>Created: {fmtDateTime(m.created_at)}</div>
                          <div>Est. return: {fmtDateTime(m.estimated_return_at)}</div>
                          {m.down_payment != null && <div>Down payment: {formatMoney(m.down_payment)}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge tone="warning">OPEN</StatusBadge>
                        <Button size="sm" variant="outline" onClick={async () => {
                          const { error } = await supabase.from("maintenance").update({ date_completed: new Date().toISOString().slice(0, 10) }).eq("id", m.id);
                          if (error) toast.error(error.message); else { toast.success("Marked complete"); refresh(); }
                        }}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Complete</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Completed</h2>
            {completed.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No completed records yet.</Card>
            ) : (
              <div className="grid gap-3">
                {completed.map((m) => (
                  <Card key={m.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {m.vehicles ? `${m.vehicles.year} ${m.vehicles.make} ${m.vehicles.model} · ${m.vehicles.plate}` : "Vehicle"}
                        </div>
                        <div className="text-sm mt-1">{m.problem_type && <span className="font-medium">{m.problem_type}: </span>}{m.service_type}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Vendor: {m.vendor || "—"} · Completed {formatDate(m.date_completed)} · {formatMoney(m.cost)}
                        </div>
                      </div>
                      <StatusBadge tone="success">DONE</StatusBadge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function useVehicles() {
  return useQuery({
    queryKey: ["vehicles-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, year, make, model, plate").order("make");
      if (error) throw error;
      return data as Vehicle[];
    },
  });
}

function useVendors() {
  return useQuery({
    queryKey: ["contacts-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name, phone").eq("category", "Vendor").order("name");
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

function AddIssueDialog({ onClose }: { onClose: () => void }) {
  const { data: vehicles } = useVehicles();
  const { data: vendors, refetch: refetchVendors } = useVendors();
  const startedAt = new Date();
  const [vehicleId, setVehicleId] = useState("");
  const [problemType, setProblemType] = useState("");
  const [problemDetails, setProblemDetails] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [estDate, setEstDate] = useState("");
  const [estTime, setEstTime] = useState("17:00");
  const [downPayment, setDownPayment] = useState("");
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [saving, setSaving] = useState(false);

  // New vendor sub-form
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [nv, setNv] = useState({ name: "", address: "", phone: "" });

  const missing: string[] = [];
  if (!vehicleId) missing.push("vehicle");
  if (!problemType) missing.push("problem type");
  if (!problemDetails.trim()) missing.push("problem description");
  if (!vendorName) missing.push("vendor");
  if (!estDate) missing.push("estimated return date");

  const total = items.reduce((s, it) => s + num(it.part_price) + num(it.labor_price), 0);
  const balance = total - num(downPayment);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missing.length) {
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    const estIso = new Date(`${estDate}T${estTime}:00`).toISOString();
    const cleanItems = items
      .filter((it) => it.description.trim() || it.part_price || it.labor_price)
      .map((it) => ({
        description: it.description.trim(),
        part_price: num(it.part_price),
        labor_price: num(it.labor_price),
      }));
    const payload = {
      vehicle_id: vehicleId,
      service_type: problemDetails.trim(),
      problem_type: problemType,
      vendor: vendorName,
      estimated_return_at: estIso,
      down_payment: downPayment ? Number(downPayment) : null,
      cost: total > 0 ? total : null,
      line_items: cleanItems,
      date_completed: null,
    };
    console.log("[maintenance] inserting", payload);
    const { error } = await supabase.from("maintenance").insert(payload as any);
    setSaving(false);
    if (error) {
      console.error("[maintenance] insert failed", error);
      return toast.error(error.message || "Failed to create ticket");
    }
    toast.success("Issue created");
    onClose();
  };

  const saveNewVendor = async () => {
    if (!nv.name.trim() || !nv.phone.trim()) return toast.error("Name and phone required");
    const { data, error } = await supabase
      .from("contacts")
      .insert({ name: nv.name.trim(), phone: nv.phone.trim(), category: "Vendor", notes: nv.address || null })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Vendor added");
    setVendorName((data as any).name);
    setShowNewVendor(false);
    setNv({ name: "", address: "", phone: "" });
    refetchVendors();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add Issue</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Date/Time Started</Label>
          <Input value={startedAt.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} disabled />
        </div>

        <div className="space-y-1.5">
          <Label>Vehicle *</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
            <SelectContent>
              {(vehicles ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.plate}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Problem Type *</Label>
          <Select value={problemType} onValueChange={setProblemType}>
            <SelectTrigger><SelectValue placeholder="Select problem" /></SelectTrigger>
            <SelectContent>
              {PROBLEM_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Problem Description *</Label>
          <Textarea value={problemDetails} onChange={(e) => setProblemDetails(e.target.value)} placeholder="Describe the issue…" />
        </div>

        <div className="space-y-1.5">
          <Label>Vendor *</Label>
          <Select value={vendorName} onValueChange={setVendorName}>
            <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>
              {(vendors ?? []).map((v) => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
              {(vendors ?? []).length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">No vendors yet</div>}
            </SelectContent>
          </Select>
          {!showNewVendor ? (
            <Button type="button" variant="link" size="sm" className="px-0 h-auto" onClick={() => setShowNewVendor(true)}>+ Add New Vendor</Button>
          ) : (
            <Card className="p-3 space-y-2 mt-2">
              <Input placeholder="Name" value={nv.name} onChange={(e) => setNv({ ...nv, name: e.target.value })} />
              <Input placeholder="Address" value={nv.address} onChange={(e) => setNv({ ...nv, address: e.target.value })} />
              <Input placeholder="Phone" value={nv.phone} onChange={(e) => setNv({ ...nv, phone: e.target.value })} />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={saveNewVendor}>Save</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewVendor(false)}>Cancel</Button>
              </div>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Est. Return Date *</Label>
            <Input type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Est. Return Time *</Label>
            <Input type="time" value={estTime} onChange={(e) => setEstTime(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Down Payment</Label>
          <Input type="number" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0.00" />
        </div>

        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Pricing Breakdown</Label>
            <Button type="button" size="sm" variant="ghost" onClick={() => setItems([...items, blankItem()])}>
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>
          {items.map((it, idx) => {
            const itemTotal = num(it.part_price) + num(it.labor_price);
            return (
              <div key={idx} className="space-y-2 border-l-2 border-border pl-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}>Remove</Button>
                  )}
                </div>
                <Input placeholder="Part description (e.g. Transmission fluid + filter)"
                  value={it.description}
                  onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Part Price</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={it.part_price}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, part_price: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Labor Price</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={it.labor_price}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, labor_price: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subtotal</Label>
                    <Input disabled value={formatMoney(itemTotal)} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border pt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Total</div>
            <div className="text-right font-semibold">{formatMoney(total)}</div>
            <div className="text-muted-foreground">Down Payment</div>
            <div className="text-right">{formatMoney(num(downPayment))}</div>
            <div className="text-muted-foreground font-semibold">Balance</div>
            <div className="text-right font-bold text-primary">{formatMoney(balance)}</div>
          </div>
        </Card>

        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">Missing: {missing.join(", ")}</p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Ticket"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function LogServiceDialog({ onClose }: { onClose: () => void }) {
  const { data: vehicles } = useVehicles();
  const [form, setForm] = useState({ vehicle_id: "", service_type: "", vendor: "", cost: "", date_completed: new Date().toISOString().slice(0, 10), mileage_at_service: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.service_type) return toast.error("Vehicle and service type required");
    setSaving(true);
    const { error } = await supabase.from("maintenance").insert({
      vehicle_id: form.vehicle_id,
      service_type: form.service_type,
      vendor: form.vendor || null,
      cost: form.cost ? Number(form.cost) : null,
      date_completed: form.date_completed,
      mileage_at_service: form.mileage_at_service ? Number(form.mileage_at_service) : null,
      notes: form.notes || null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Service logged");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Log Service</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Vehicle *</Label>
          <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
            <SelectContent>
              {(vehicles ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.plate}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Service Type *</Label><Input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Cost</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Date Completed</Label><Input type="date" value={form.date_completed} onChange={(e) => setForm({ ...form, date_completed: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Mileage</Label><Input type="number" value={form.mileage_at_service} onChange={(e) => setForm({ ...form, mileage_at_service: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Log Service"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}