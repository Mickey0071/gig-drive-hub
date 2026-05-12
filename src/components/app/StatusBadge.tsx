import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const toneClass: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  info: "bg-primary/15 text-primary border-primary/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function vehicleStatusTone(s: string): Tone {
  if (s === "available") return "success";
  if (s === "rented") return "info";
  if (s === "maintenance") return "warning";
  if (s === "impound") return "danger";
  return "muted";
}

export function paymentStatusTone(s: string): Tone {
  if (s === "paid" || s === "current") return "success";
  if (s === "late" || s === "pending") return "warning";
  if (s === "missed" || s === "defaulted") return "danger";
  return "muted";
}

export function driverStatusTone(s: string): Tone {
  if (s === "active") return "success";
  if (s === "pending") return "warning";
  if (s === "suspended") return "danger";
  return "muted";
}