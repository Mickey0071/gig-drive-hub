import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Car } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, roles, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Car className="h-5 w-5 animate-pulse text-primary" />
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (roles.length === 0) return <Navigate to="/pending" />;
  if (roles.includes("admin")) return <Navigate to="/dashboard" />;
  if (roles.includes("staff")) return <Navigate to="/fleet" />;
  if (roles.includes("driver")) return <Navigate to="/me" />;
  return <Navigate to="/pending" />;
}
