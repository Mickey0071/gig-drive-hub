import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { StatusBadge, vehicleStatusTone, paymentStatusTone } from "@/components/app/StatusBadge";
import { formatMoney, formatDate } from "@/lib/queries";
import { useIsAdmin } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/fleet/$id")({ component: VehicleDetail });

function VehicleDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();

  const vehicle = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const rentals = useQuery({
    queryKey: ["vehicle-rentals", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rentals").select("*, drivers(full_name)").eq("vehicle_id", id).order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const maintenance = useQuery({
    queryKey: ["vehicle-maint", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*").eq("vehicle_id", id).order("date_completed", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const violations = useQuery({
    queryKey: ["vehicle-viol", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("violations").select("*").eq("vehicle_id", id).order("date_issued", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("vehicles").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["fleet-counts"] });
  };

  if (vehicle.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!vehicle.data) return <p>Vehicle not found.</p>;
  const v = vehicle.data;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/fleet" })} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to fleet
      </Button>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{v.year} {v.make} {v.model}</h1>
          <div className="text-sm text-muted-foreground mt-1">Plate {v.plate}{v.vin && ` · VIN ${v.vin}`}</div>
        </div>
        <StatusBadge tone={vehicleStatusTone(v.status)}>{v.status}</StatusBadge>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <InfoCard label="Mileage" value={v.mileage?.toLocaleString() + " mi"} />
        <InfoCard label="Weekly rate" value={formatMoney(v.weekly_rate)} />
        <InfoCard label="Daily rate" value={formatMoney(v.daily_rate)} />
      </div>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Update status</CardTitle></CardHeader>
          <CardContent>
            <Select value={v.status} onValueChange={updateStatus}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="impound">Impound</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Section title="Rental history" empty="No rentals yet">
        {rentals.data?.map((r: any) => (
          <Row key={r.id} left={<><div className="font-medium">{r.drivers?.full_name ?? "Unknown driver"}</div>
            <div className="text-xs text-muted-foreground">{formatDate(r.start_date)} → {formatDate(r.end_date)}</div></>} right={<StatusBadge tone={paymentStatusTone(r.payment_status)}>{r.payment_status}</StatusBadge>} />
        ))}
      </Section>

      <Section title="Maintenance log" empty="No maintenance records">
        {maintenance.data?.map((m: any) => (
          <Row key={m.id} left={<><div className="font-medium">{m.service_type}</div>
            <div className="text-xs text-muted-foreground">{formatDate(m.date_completed)} · {m.vendor ?? "—"}</div></>} right={formatMoney(m.cost)} />
        ))}
      </Section>

      <Section title="Violations" empty="No violations">
        {violations.data?.map((v: any) => (
          <Row key={v.id} left={<><div className="font-medium">{v.type}</div>
            <div className="text-xs text-muted-foreground">{formatDate(v.date_issued)}</div></>} right={<><StatusBadge tone={paymentStatusTone(v.status === "paid" ? "paid" : v.status === "pending" ? "pending" : "missed")}>{v.status}</StatusBadge> <span className="ml-2">{formatMoney(v.amount)}</span></>} />
        ))}
      </Section>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  const has = arr.filter(Boolean).length > 0;
  return (
    <Card className="mb-4">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {has ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0 text-sm">
      <div className="min-w-0">{left}</div>
      <div className="text-right shrink-0">{right}</div>
    </div>
  );
}