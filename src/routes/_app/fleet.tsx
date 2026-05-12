import { createFileRoute, Link } from "@tanstack/react-router";
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
import { StatusBadge, vehicleStatusTone } from "@/components/app/StatusBadge";
import { Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/queries";

export const Route = createFileRoute("/_app/fleet")({ component: FleetPage });

function FleetPage() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Fleet"
        description={`${data?.length ?? 0} vehicles`}
        action={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg"><Plus className="h-4 w-4 mr-1" /> Add vehicle</Button>
            </DialogTrigger>
            <AddVehicleDialog onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["vehicles"] }); qc.invalidateQueries({ queryKey: ["fleet-counts"] }); }} />
          </Dialog>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No vehicles yet. Add your first one.</Card>
      ) : (
        <div className="grid gap-3">
          {data!.map((v) => (
            <Link key={v.id} to="/fleet/$id" params={{ id: v.id }}>
              <Card className="p-4 hover:border-primary transition-colors flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{v.year} {v.make} {v.model}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">Plate {v.plate} · {v.mileage?.toLocaleString()} mi · {formatMoney(v.weekly_rate)}/wk</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={vehicleStatusTone(v.status)}>{v.status}</StatusBadge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function AddVehicleDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    make: "", model: "", year: new Date().getFullYear(), vin: "", plate: "",
    mileage: 0, status: "available", weekly_rate: "", daily_rate: "", risk_tier: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("vehicles").insert({
      make: form.make, model: form.model, year: Number(form.year), vin: form.vin || null, plate: form.plate,
      mileage: Number(form.mileage), status: form.status as any,
      weekly_rate: form.weekly_rate ? Number(form.weekly_rate) : null,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      risk_tier: form.risk_tier || null, notes: form.notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Vehicle added");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add vehicle</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Make" value={form.make} onChange={(v) => setForm({ ...form, make: v })} required />
          <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} required />
          <Field label="Year" type="number" value={String(form.year)} onChange={(v) => setForm({ ...form, year: Number(v) })} required />
          <Field label="Plate" value={form.plate} onChange={(v) => setForm({ ...form, plate: v })} required />
          <Field label="VIN" value={form.vin} onChange={(v) => setForm({ ...form, vin: v })} />
          <Field label="Mileage" type="number" value={String(form.mileage)} onChange={(v) => setForm({ ...form, mileage: Number(v) })} />
          <Field label="Daily rate" type="number" value={form.daily_rate} onChange={(v) => setForm({ ...form, daily_rate: v })} />
          <Field label="Weekly rate" type="number" value={form.weekly_rate} onChange={(v) => setForm({ ...form, weekly_rate: v })} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="impound">Impound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Risk tier" value={form.risk_tier} onChange={(v) => setForm({ ...form, risk_tier: v })} />
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add vehicle"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && " *"}</Label>
      <Input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}