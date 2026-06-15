"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  LayoutDashboard,
  Menu,
  Network,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",        label: "Dashboard",         icon: LayoutDashboard },
  { href: "/analysis",label: "New Analysis",       icon: Zap },
  { href: "/canvas",  label: "Dependency Canvas",  icon: Network },
  { href: "/settings",label: "Settings",           icon: Settings },
] as const;

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function WorkspaceFooter() {
  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          E
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">Enterprise Workspace</p>
          <p className="truncate text-[11px] text-muted-foreground">Free tier</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const Logo = (
    <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
        <GitBranch className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="font-semibold tracking-tight text-foreground">Decouple</span>
      <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
        BETA
      </span>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
        {Logo}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLinks />
        </nav>
        <WorkspaceFooter />
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="flex md:hidden h-14 items-center justify-between border-b border-border bg-card px-4 fixed top-0 inset-x-0 z-30">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <GitBranch className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">Decouple</span>
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            BETA
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card border-r border-border transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <GitBranch className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">Decouple</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLinks onClick={() => setMobileOpen(false)} />
        </nav>
        <WorkspaceFooter />
      </div>
    </>
  );
}
