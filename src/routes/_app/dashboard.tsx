import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/AppShell";
import { Car, AlertTriangle, DollarSign, Wrench } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fleetCountsQuery, formatMoney } from "@/lib/queries";
import { StatusBadge, vehicleStatusTone } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const fleet = useQuery({ queryKey: ["fleet-counts"], queryFn: fleetCountsQuery });

  const upcoming = useQuery({
    queryKey: ["dashboard-upcoming-payments"],
    queryFn: async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, due_date, status")
        .gte("due_date", start.toISOString().slice(0, 10))
        .lte("due_date", end.toISOString().slice(0, 10));
      if (error) throw error;
      return data;
    },
  });

  const overdue = useQuery({
    queryKey: ["dashboard-overdue"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("id").in("status", ["late", "missed"]);
      if (error) throw error;
      return data.length;
    },
  });

  const maintAlerts = useQuery({
    queryKey: ["dashboard-maint"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("maintenance")
        .select("id, vehicle_id, next_service_due, vehicles!inner(make, model, plate)")
        .lte("next_service_due", today)
        .order("next_service_due", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const counts = fleet.data ?? { available: 0, rented: 0, maintenance: 0, impound: 0, total: 0 };
  const dueTotal = upcoming.data?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return (
    <>
      <PageHeader title="Dashboard" description="Fleet status at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Available" value={counts.available} tone="success" icon={Car} to="/fleet" />
        <StatCard title="Rented" value={counts.rented} tone="info" icon={Car} to="/fleet" />
        <StatCard title="Maintenance" value={counts.maintenance} tone="warning" icon={Wrench} to="/maintenance" />
        <StatCard title="Impound" value={counts.impound} tone="danger" icon={AlertTriangle} to="/fleet" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4" /> Payments due this week</CardTitle>
            <Link to="/payments" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatMoney(dueTotal)}</span>
              <span className="text-sm text-muted-foreground">across {upcoming.data?.length ?? 0} payments</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Overdue: </span>
              <span className="font-semibold text-danger">{overdue.data ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Maintenance alerts</CardTitle>
            <Link to="/maintenance" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {(maintAlerts.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles past service due. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {maintAlerts.data?.map((m: any) => (
                  <li key={m.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                    <span className="font-medium">{m.vehicles?.make} {m.vehicles?.model} · {m.vehicles?.plate}</span>
                    <StatusBadge tone="warning">due {m.next_service_due}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const toneStyles: Record<string, string> = {
  success: "bg-success/15 text-success",
  info: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

function StatCard({ title, value, tone, icon: Icon, to }: { title: string; value: number; tone: "success" | "info" | "warning" | "danger"; icon: any; to: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
          </div>
          <div className={`h-10 w-10 rounded-md flex items-center justify-center ${toneStyles[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}