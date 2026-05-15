import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, RefreshCw, Phone } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/runner")({ component: RunnerPage });

type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: "pending" | "done";
  priority: number;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
};

function RunnerPage() {
  const qc = useQueryClient();
  const [name, setName] = useState(() => localStorage.getItem("runner_name") ?? "");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["runner-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tasks").select("*")
        .order("status", { ascending: true })
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
  });

  const saveName = (v: string) => {
    setName(v);
    localStorage.setItem("runner_name", v);
  };

  const toggle = async (t: Task, checked: boolean) => {
    const payload = checked
      ? { status: "done", completed_at: new Date().toISOString(), completed_by_name: name.trim() || "Runner" }
      : { status: "pending", completed_at: null, completed_by_name: null };
    const { error } = await (supabase as any).from("tasks").update(payload).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(checked ? "Marked done" : "Reopened");
    qc.invalidateQueries({ queryKey: ["runner-tasks"] });
  };

  const pending = (data ?? []).filter((t) => t.status === "pending");
  const done = (data ?? []).filter((t) => t.status === "done");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-bold leading-none">Runner Tasks</div>
              <div className="text-xs text-muted-foreground mt-0.5">{pending.length} open · {done.length} done</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/contacts" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Contacts
            </Link>
            <Button size="icon" variant="ghost" onClick={() => refetch()} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your name</label>
          <Input
            className="mt-1"
            placeholder="So admin knows who completed it"
            value={name}
            onChange={(e) => saveName(e.target.value)}
          />
        </Card>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">To do</h2>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : pending.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">All caught up.</Card>
          ) : (
            <div className="space-y-2">
              {pending.map((t) => (
                <Card key={t.id} className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={false}
                    onCheckedChange={(c) => toggle(t, !!c)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t.title}</div>
                    {t.notes && <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{t.notes}</div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Completed</h2>
            <div className="space-y-2">
              {done.map((t) => (
                <Card key={t.id} className="p-4 flex items-start gap-3 opacity-70">
                  <Checkbox
                    checked
                    onCheckedChange={(c) => toggle(t, !!c)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium line-through">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Done by {t.completed_by_name ?? "—"}
                      {t.completed_at && ` · ${new Date(t.completed_at).toLocaleString()}`}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}