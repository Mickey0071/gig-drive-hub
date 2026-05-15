import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/AppShell";
import { Plus, Phone, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/contacts")({ component: ContactsPage });

type Contact = {
  id: string;
  name: string;
  phone: string;
  category: string;
  notes: string | null;
};

const CATEGORIES = ["Mechanic", "Parts", "Locksmith", "Towing", "Body Shop", "Insurance", "Other"];

function ContactsPage() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contacts").select("*").order("category").order("name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const grouped = useMemo(() => {
    const filtered = (data ?? []).filter((c) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.phone.includes(q);
    });
    const map = new Map<string, Contact[]>();
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return Array.from(map.entries());
  }, [data, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["contacts"] });

  const onDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    const { error } = await (supabase as any).from("contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contact deleted");
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Runner directory — vendors, parts, services"
        action={isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1" /> Add contact
              </Button>
            </DialogTrigger>
            <ContactDialog
              contact={editing}
              onClose={() => { setOpen(false); setEditing(null); refresh(); }}
            />
          </Dialog>
        )}
      />

      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No contacts found.</Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((c) => (
                  <Card key={c.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{c.name}</div>
                      <a
                        href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                      >
                        <Phone className="h-3.5 w-3.5" /> {c.phone}
                      </a>
                      {c.notes && (
                        <div className="text-xs text-muted-foreground mt-1.5">{c.notes}</div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => { setEditing(c); setOpen(true); }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => onDelete(c.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ContactDialog({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    category: contact?.category ?? "Mechanic",
    notes: contact?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error("Name and phone are required");
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      category: form.category,
      notes: form.notes.trim() || null,
    };
    const { error } = contact
      ? await (supabase as any).from("contacts").update(payload).eq("id", contact.id)
      : await (supabase as any).from("contacts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(contact ? "Contact updated" : "Contact added");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Phone *</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="555-555-5555" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="PINs, hours, address, etc."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : contact ? "Save changes" : "Add contact"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}