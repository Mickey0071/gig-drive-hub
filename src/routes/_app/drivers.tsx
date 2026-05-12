import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/AppShell";
import { StatusBadge, driverStatusTone } from "@/components/app/StatusBadge";
import { Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/drivers")({ component: DriversPage });

function DriversPage() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*").order("date_added", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Drivers" description={`${data?.length ?? 0} drivers`} action={isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="lg"><Plus className="h-4 w-4 mr-1" /> Add driver</Button></DialogTrigger>
          <AddDriverDialog onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["drivers"] }); }} />
        </Dialog>
      )} />
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (data?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No drivers yet.</Card>
      ) : (
        <div className="grid gap-3">
          {data!.map((d) => (
            <Link key={d.id} to="/drivers/$id" params={{ id: d.id }}>
              <Card className="p-4 hover:border-primary transition-colors flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.full_name}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{d.phone ?? "—"} · {d.email ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={driverStatusTone(d.status)}>{d.status}</StatusBadge>
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

function AddDriverDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", license_number: "", license_expiry: "", rideshare_platform: "uber", insurance_on_file: false, status: "active" });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("drivers").insert({
      full_name: form.full_name, phone: form.phone || null, email: form.email || null,
      license_number: form.license_number || null, license_expiry: form.license_expiry || null,
      rideshare_platform: form.rideshare_platform as any, insurance_on_file: form.insurance_on_file,
      status: form.status as any,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Driver added"); onClose();
  };
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add driver</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <F label="Full name *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
        <div className="grid grid-cols-2 gap-3">
          <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <F label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <F label="License #" value={form.license_number} onChange={(v) => setForm({ ...form, license_number: v })} />
          <F label="License expiry" type="date" value={form.license_expiry} onChange={(v) => setForm({ ...form, license_expiry: v })} />
        </div>
        <div className="space-y-1.5"><Label>Rideshare platform</Label>
          <Select value={form.rideshare_platform} onValueChange={(v) => setForm({ ...form, rideshare_platform: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="uber">Uber</SelectItem><SelectItem value="lyft">Lyft</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add driver"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function F({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} /></div>;
}