import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Minus, Wrench, Upload, Trash2 } from "lucide-react";
import {
  CHECKLIST_SECTIONS,
  JOB_TYPES,
  FUEL_LEVELS,
  type ChecklistValue,
} from "@/lib/checklist-items";

export const Route = createFileRoute("/checklist")({ component: ChecklistPage });

type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  plate: string;
};

type SubmittedSummary = {
  vehicleLabel: string;
  jobType: string;
  pass: number;
  fail: number;
  na: number;
  fuelLevel: string;
  readyToRent: boolean;
  maintenanceCreated: boolean;
};

function ChecklistPage() {
  const navigate = useNavigate();

  const [inspectorName, setInspectorName] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("inspector_name") ?? "" : "")
  );
  const [vehicleId, setVehicleId] = useState<string>("");
  const [jobType, setJobType] = useState<string>("");
  const [items, setItems] = useState<Record<string, ChecklistValue>>({});
  const [readyToRent, setReadyToRent] = useState<boolean | null>(null);
  const [damageNoted, setDamageNoted] = useState<boolean | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [fuelLevel, setFuelLevel] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ["checklist-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, year, make, model, plate")
        .order("make", { ascending: true });
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  const { data: jobsToday } = useQuery({
    queryKey: ["jobs-today", inspectorName],
    enabled: inspectorName.trim().length > 0,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error } = await (supabase as any)
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .eq("inspector_name", inspectorName.trim())
        .gte("submitted_at", start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const setItem = (key: string, value: ChecklistValue) =>
    setItems((prev) => ({ ...prev, [key]: value }));

  const counts = useMemo(() => {
    let pass = 0, fail = 0, na = 0;
    for (const v of Object.values(items)) {
      if (v === "pass") pass++;
      else if (v === "fail") fail++;
      else if (v === "na") na++;
    }
    return { pass, fail, na };
  }, [items]);

  const canSubmit =
    inspectorName.trim().length > 0 &&
    vehicleId &&
    jobType &&
    Object.keys(items).length > 0 &&
    readyToRent !== null &&
    fuelLevel;

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newPaths: string[] = [];
      for (const file of Array.from(files)) {
        const path = `damage/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("inspections").upload(path, file);
        if (error) throw error;
        newPaths.push(path);
      }
      setDamagePhotos((prev) => [...prev, ...newPaths]);
      toast.success(`Uploaded ${newPaths.length} photo${newPaths.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const vehicle = vehicles?.find((v) => v.id === vehicleId);
      const payload: any = {
        vehicle_id: vehicleId,
        inspector_name: inspectorName.trim(),
        job_type: jobType,
        checklist_items: items,
        ready_to_rent: readyToRent,
        damage_noted: damageNoted === true,
        damage_photos: damagePhotos,
        fuel_level: fuelLevel,
        notes: notes.trim() || null,
        submitted_at: new Date().toISOString(),
        type: "check-in",
        date: new Date().toISOString(),
      };
      const { error } = await (supabase as any).from("inspections").insert(payload);
      if (error) throw error;

      const maintenanceCreated =
        counts.fail > 0 || damageNoted === true || readyToRent === false;

      setSubmitted({
        vehicleLabel: vehicle
          ? `${vehicle.year} ${vehicle.make} ${vehicle.model} — ${vehicle.plate}`
          : "—",
        jobType: JOB_TYPES.find((j) => j.value === jobType)?.label ?? jobType,
        pass: counts.pass,
        fail: counts.fail,
        na: counts.na,
        fuelLevel: FUEL_LEVELS.find((f) => f.value === fuelLevel)?.label ?? fuelLevel,
        readyToRent: readyToRent === true,
        maintenanceCreated,
      });
      toast.success("Checklist submitted");
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setVehicleId("");
    setJobType("");
    setItems({});
    setReadyToRent(null);
    setDamageNoted(null);
    setDamagePhotos([]);
    setFuelLevel("");
    setNotes("");
    setSubmitted(null);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 pb-24">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl font-bold">Checklist Submitted</h1>
          <Card className="p-5 space-y-3">
            <Row label="Vehicle" value={submitted.vehicleLabel} />
            <Row label="Job Type" value={submitted.jobType} />
            <Row
              label="Checklist"
              value={`✅ ${submitted.pass} pass · ❌ ${submitted.fail} fail · ➖ ${submitted.na} N/A`}
            />
            <Row label="Fuel Level" value={submitted.fuelLevel} />
            <Row
              label="Ready to Rent"
              value={submitted.readyToRent ? "✅ Yes" : "🔧 Needs mechanic"}
            />
          </Card>
          {submitted.maintenanceCreated && (
            <div className="rounded-md border border-warning bg-warning/10 p-4 text-warning-foreground">
              <div className="flex items-center gap-2 font-medium">
                <Wrench className="h-4 w-4" /> Maintenance ticket auto-created
              </div>
              <p className="mt-1 text-sm opacity-90">
                A ticket has been opened for this vehicle and Michael will be notified.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="h-14 text-base"
              onClick={resetForm}
            >
              New Inspection
            </Button>
            <Button
              className="h-14 text-base bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => navigate({ to: "/runner" })}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-32">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Vehicle Condition Checklist</h1>
          <p className="text-sm text-muted-foreground">
            Fill out every section, then submit at the bottom.
          </p>
        </header>

        {/* Section 1 — Job Info */}
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Inspector Name</label>
            <Input
              className="mt-1 h-12 text-base"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              onBlur={() => localStorage.setItem("inspector_name", inspectorName.trim())}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Vehicle</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="mt-1 h-12 text-base">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} — {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            Jobs Completed Today:{" "}
            <span className="font-semibold">{jobsToday ?? 0}</span>
          </div>
        </Card>

        {/* Section 2 — Job Type */}
        <Section title="Job Type">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {JOB_TYPES.map((j) => {
              const active = jobType === j.value;
              return (
                <button
                  key={j.value}
                  type="button"
                  onClick={() => setJobType(j.value)}
                  className={`flex h-20 flex-col items-center justify-center rounded-md border-2 px-2 text-center text-sm font-medium transition ${
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-card hover:border-brand/60"
                  }`}
                >
                  <span className="text-2xl">{j.emoji}</span>
                  <span className="mt-1 leading-tight">{j.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Section 3 — Checklist */}
        <Section title="Inspection Checklist">
          <Accordion type="single" collapsible defaultValue={CHECKLIST_SECTIONS[0].key}>
            {CHECKLIST_SECTIONS.map((sec) => {
              const completed = sec.items.filter((i) => items[i.key]).length;
              return (
                <AccordionItem key={sec.key} value={sec.key}>
                  <AccordionTrigger className="text-base">
                    {sec.title}{" "}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({completed}/{sec.items.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {sec.items.map((it) => (
                        <ChecklistRow
                          key={it.key}
                          label={it.label}
                          value={items[it.key]}
                          onChange={(v) => setItem(it.key, v)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Section>

        {/* Section 4 — Ready to Rent */}
        <Section title="Ready to Rent">
          <div className="space-y-2">
            <BigChoice
              active={readyToRent === true}
              onClick={() => setReadyToRent(true)}
              variant="pass"
            >
              ✅ Vehicle PASSES — ready for next renter
            </BigChoice>
            <BigChoice
              active={readyToRent === false}
              onClick={() => setReadyToRent(false)}
              variant="fail"
            >
              🔧 Vehicle needs mechanic before renting (see notes)
            </BigChoice>
          </div>
        </Section>

        {/* Section 5 — Damage */}
        <Section title="Visible Damage">
          <div className="grid grid-cols-2 gap-2">
            <ToggleBtn
              active={damageNoted === false}
              onClick={() => {
                setDamageNoted(false);
                setDamagePhotos([]);
              }}
            >
              No
            </ToggleBtn>
            <ToggleBtn
              active={damageNoted === true}
              onClick={() => setDamageNoted(true)}
              danger
            >
              Yes
            </ToggleBtn>
          </div>
          {damageNoted === true && (
            <div className="mt-3 space-y-2">
              <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card text-sm font-medium hover:border-brand/60">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload damage photos"}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
              </label>
              {damagePhotos.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {damagePhotos.map((p, i) => (
                    <li
                      key={p}
                      className="flex items-center justify-between rounded bg-muted/40 px-2 py-1"
                    >
                      <span className="truncate">{p.split("/").pop()}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDamagePhotos((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>

        {/* Section 6 — Fuel */}
        <Section title="Fuel Level">
          <div className="grid grid-cols-5 gap-2">
            {FUEL_LEVELS.map((f) => {
              const active = fuelLevel === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFuelLevel(f.value)}
                  className={`h-14 rounded-md border-2 px-1 text-xs font-medium transition ${
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-card hover:border-brand/60"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Section 7 — Notes */}
        <Section title="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (include any failures or mechanic concerns)"
            rows={4}
          />
        </Section>
      </div>

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-14 w-full text-base font-semibold bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Checklist to Michael"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function ChecklistRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ChecklistValue | undefined;
  onChange: (v: ChecklistValue) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2">
      <span className="flex-1 text-sm">{label}</span>
      <div className="flex gap-1">
        <ItemBtn active={value === "pass"} onClick={() => onChange("pass")} kind="pass">
          <Check className="h-5 w-5" />
        </ItemBtn>
        <ItemBtn active={value === "fail"} onClick={() => onChange("fail")} kind="fail">
          <X className="h-5 w-5" />
        </ItemBtn>
        <ItemBtn active={value === "na"} onClick={() => onChange("na")} kind="na">
          <Minus className="h-5 w-5" />
        </ItemBtn>
      </div>
    </div>
  );
}

function ItemBtn({
  active,
  onClick,
  kind,
  children,
}: {
  active: boolean;
  onClick: () => void;
  kind: "pass" | "fail" | "na";
  children: React.ReactNode;
}) {
  const activeCls =
    kind === "pass"
      ? "border-brand bg-brand text-brand-foreground"
      : kind === "fail"
      ? "border-danger bg-danger text-danger-foreground"
      : "border-muted-foreground bg-muted text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-md border-2 transition ${
        active ? activeCls : "border-border bg-background hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function BigChoice({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  variant: "pass" | "fail";
  children: React.ReactNode;
}) {
  const activeCls =
    variant === "pass"
      ? "border-brand bg-brand text-brand-foreground"
      : "border-warning bg-warning text-warning-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md border-2 p-4 text-left text-base font-medium transition ${
        active ? activeCls : "border-border bg-card hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleBtn({
  active,
  onClick,
  danger,
  children,
}: {
  active: boolean;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const activeCls = danger
    ? "border-danger bg-danger text-danger-foreground"
    : "border-brand bg-brand text-brand-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-14 rounded-md border-2 text-base font-semibold transition ${
        active ? activeCls : "border-border bg-card hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}