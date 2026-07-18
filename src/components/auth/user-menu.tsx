"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { LayoutDashboard, LogIn, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string | null, email?: string | null): string {
  const source = name || email || "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="size-9 animate-pulse rounded-full bg-muted" />;
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-full"
        onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}
      >
        <LogIn className="size-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  const name = user?.name || "Explorer";
  const email = user?.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Open profile menu"
            className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient text-sm font-semibold text-white ring-2 ring-transparent transition hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-primary/50"
          >
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={name}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              getInitials(user?.name, user?.email)
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={name}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              getInitials(user?.name, user?.email)
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard />
          Dashboard
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
