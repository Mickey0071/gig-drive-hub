import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth, useIsAdmin, useHasRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Car,
  Users,
  ClipboardList,
  DollarSign,
  ShieldAlert,
  Wrench,
  CheckSquare,
  UserCog,
  LogOut,
  Menu,
  User as UserIcon,
  Phone,
  ListTodo,
} from "lucide-react";
import { useState } from "react";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; show: boolean };

export function AppShell() {
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const isStaff = useHasRole("staff");
  const isDriver = useHasRole("driver");
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAdmin },
    { to: "/tasks", label: "Tasks", icon: ListTodo, show: isAdmin },
    { to: "/fleet", label: "Fleet", icon: Car, show: isAdmin || isStaff },
    { to: "/drivers", label: "Drivers", icon: Users, show: isAdmin || isStaff },
    { to: "/rentals", label: "Rentals", icon: ClipboardList, show: isAdmin || isStaff },
    { to: "/payments", label: "Payments", icon: DollarSign, show: isAdmin || isStaff },
    { to: "/inspections", label: "Inspections", icon: CheckSquare, show: isAdmin || isStaff },
    { to: "/maintenance", label: "Maintenance", icon: Wrench, show: isAdmin || isStaff },
    { to: "/violations", label: "Violations", icon: ShieldAlert, show: isAdmin || isStaff },
    { to: "/contacts", label: "Contacts", icon: Phone, show: isAdmin || isStaff || isDriver },
    { to: "/me", label: "My Rental", icon: UserIcon, show: isDriver },
    { to: "/admin/users", label: "Users & Roles", icon: UserCog, show: isAdmin },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold tracking-tight leading-none">Camauto</div>
            <div className="text-xs text-muted-foreground">Rentals</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((n) => {
            const active = loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <button aria-label="close menu" className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-semibold">Camauto Rentals</div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}