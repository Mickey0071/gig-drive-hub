import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, Mail } from "lucide-react";

export const Route = createFileRoute("/pending")({ component: PendingPage });

function PendingPage() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Account pending approval</h1>
        <p className="text-sm text-muted-foreground">
          Your account <span className="font-medium text-foreground">{user?.email}</span> has been created
          but no role has been assigned yet. An administrator needs to grant you access before you can use the app.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
          <Mail className="h-3.5 w-3.5" /> Contact your admin to request access.
        </div>
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
            Refresh
          </Button>
          <Button className="flex-1" onClick={() => signOut()} asChild={false}>
            Sign out
          </Button>
        </div>
        <Link to="/login" className="text-xs text-muted-foreground hover:underline block pt-2">
          Back to login
        </Link>
      </Card>
    </div>
  );
}