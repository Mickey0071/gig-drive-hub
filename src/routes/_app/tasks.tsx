import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/AppShell";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/tasks")({ component: TasksAdminPage });

type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: "pending" | "done";
  priority: number;
  completed_by_name: string | null;
  completed_at: string | null;
};

function TasksAdminPage() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tasks").select("*")
        .order("status").order("priority", { ascending: false }).order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-tasks"] });

  const onDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    refresh();
  };

  const runnerUrl = typeof window !== "undefined" ? `${window.location.origin}/runner` : "/runner";

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Manage the runner's to-do list"
        action={isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1" /> Add task
              </Button>
            </DialogTrigger>
            <TaskDialog task={editing} onClose={() => { setOpen(false); setEditing(null); refresh(); }} />
          </Dialog>
        )}
      />

      <Card className="p-4 mb-6 flex items-center justify-between gap-3 bg-muted/40">
        <div className="min-w-0">
          <div className="text-sm font-medium">Runner link (no login required)</div>
          <div className="text-xs text-muted-foreground truncate">{runnerUrl}</div>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a href="/runner" target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</a>
        </Button>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No tasks yet. Add one to get started.</Card>
      ) : (
        <div className="grid gap-3">
          {data!.map((t) => (
            <Card key={t.id} className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "done" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {t.status}
                  </span>
                  <div className={`font-semibold ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                </div>
                {t.notes && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.notes}</div>}
                {t.status === "done" && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Completed by {t.completed_by_name ?? "—"}
                    {t.completed_at && ` · ${new Date(t.completed_at).toLocaleString()}`}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(t.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [form, setForm] = useState({
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    priority: task?.priority ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      priority: Number(form.priority) || 0,
    };
    const { error } = task
      ? await (supabase as any).from("tasks").update(payload).eq("id", task.id)
      : await (supabase as any).from("tasks").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(task ? "Task updated" : "Task added");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Pick up parts at AutoZone" />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Address, part #, contact, etc." rows={4} />
        </div>
        <div className="space-y-1.5">
          <Label>Priority (higher = top)</Label>
          <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : task ? "Save changes" : "Add task"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}