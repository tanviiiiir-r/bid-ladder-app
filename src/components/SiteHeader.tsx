import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutList, MoreVertical, Plus, Scale } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <LayoutList className="size-4" />
          </span>
          <span className="whitespace-nowrap font-display text-base font-bold tracking-tight">
            Bid Ladder
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/" search={{ board: "daily" }}>
              Daily
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/how-ranking-works">Rules</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button size="icon" variant="ghost" aria-label="More, including how ranking works">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/how-ranking-works">
                  <Scale className="size-4" />
                  How ranking works
                </Link>
              </DropdownMenuItem>
              {user ? (
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">My listings</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/auth">Sign in</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/dashboard">My listings</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/submit">
                  <Plus className="size-4" />
                  Submit
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/submit">
                  <Plus className="size-4" />
                  Submit
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
