"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home" },
  { href: "/companies", label: "Companies", shortLabel: "Co" },
  { href: "/opportunities", label: "Opportunities", shortLabel: "Op" },
  { href: "/evidence", label: "Evidence", shortLabel: "Ev" },
  { href: "/collection", label: "Collect", shortLabel: "Cl" },
  { href: "/discovery", label: "Discover", shortLabel: "Di" },
  { href: "/monitoring", label: "Monitor", shortLabel: "Mo" },
  { href: "/ai", label: "Assist", shortLabel: "Ai" },
  { href: "/contacts", label: "Contacts", shortLabel: "Ct" },
  { href: "/outreach", label: "Outreach", shortLabel: "Or" },
  { href: "/pilot", label: "Pilot", shortLabel: "Pi" },
  { href: "/search", label: "Search", shortLabel: "Sr" },
  { href: "/settings", label: "Settings", shortLabel: "Se" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#17201b]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#17201b] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-[#c7f36b]"
      >
        Skip to main content
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-[#dce3da] bg-[#fbfcfa] px-5 py-6 lg:block">
        <div className="flex h-full flex-col">
          <Brand />
          <div className="mt-10 px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#92a097]">
              Workspace
            </p>
          </div>
          <PrimaryNavigation pathname={pathname} orientation="vertical" />
          <div className="mt-auto rounded-3xl border border-[#dce3da] bg-[#e8f2dc] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d8849]">MVP mode</p>
            <p className="mt-2 text-sm leading-6 text-[#566653]">
              Manual research first. Every opportunity needs evidence and a recent verification.
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-[#dce3da]/90 bg-[#f7f8f5]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#344239]">Private research workspace</p>
                <p className="mt-0.5 text-xs text-[#7a877e]">
                  Evidence-backed opportunities, kept current.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="rounded-full border border-[#cfd8ce] bg-white/60 px-4 py-2 text-xs font-semibold text-[#536158] transition hover:border-[#9cac9b] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2"
            >
              Public overview
            </Link>
          </div>
          <div className="border-t border-[#dce3da]/80 px-5 py-3 lg:hidden">
            <PrimaryNavigation pathname={pathname} orientation="horizontal" />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto min-h-[calc(100vh-73px)] max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3" aria-label="Vilu dashboard">
      <span className="grid size-10 place-items-center rounded-2xl bg-[#17201b] text-lg font-black text-[#c7f36b]">
        V
      </span>
      {!compact && <span className="text-xl font-semibold tracking-[-0.04em]">Vilu</span>}
    </Link>
  );
}

function PrimaryNavigation({
  pathname,
  orientation,
}: {
  pathname: string;
  orientation: "vertical" | "horizontal";
}) {
  return (
    <nav
      aria-label={
        orientation === "vertical" ? "Workspace navigation" : "Mobile workspace navigation"
      }
      className={
        orientation === "vertical" ? "mt-4 space-y-1" : "flex gap-2 overflow-x-auto pb-0.5"
      }
    >
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              orientation === "vertical"
                ? `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2 ${isActive ? "bg-[#17201b] text-white" : "text-[#627067] hover:bg-[#edf2eb] hover:text-[#17201b]"}`
                : `shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2 ${isActive ? "bg-[#17201b] text-white" : "bg-white/70 text-[#627067] hover:bg-white hover:text-[#17201b]"}`
            }
          >
            {orientation === "vertical" && (
              <span
                className={`grid size-7 place-items-center rounded-xl text-[10px] font-bold ${isActive ? "bg-white/10 text-[#c7f36b]" : "bg-[#edf2eb] text-[#77905e]"}`}
                aria-hidden="true"
              >
                {item.shortLabel}
              </span>
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
