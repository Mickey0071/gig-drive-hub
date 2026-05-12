import { supabase } from "@/integrations/supabase/client";

export const fleetCountsQuery = async () => {
  const { data, error } = await supabase.from("vehicles").select("status");
  if (error) throw error;
  const counts = { available: 0, rented: 0, maintenance: 0, impound: 0, total: data.length };
  for (const v of data) counts[v.status as keyof typeof counts] = (counts[v.status as keyof typeof counts] as number) + 1;
  return counts;
};

export const formatMoney = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

export const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};