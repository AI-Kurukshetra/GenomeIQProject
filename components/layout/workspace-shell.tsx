import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { WorkspaceQuickActions } from "@/components/layout/workspace-quick-actions";
import { Button } from "@/components/ui/button";
import { getDashboardContext } from "@/lib/dashboard";

interface WorkspaceShellProps {
  children: ReactNode;
  description: string;
  heading: string;
}

function getInitials(email: string | undefined) {
  if (!email) {
    return "GI";
  }

  const [localPart] = email.split("@");
  const parts = localPart.split(/[.\-_]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

export async function WorkspaceShell({
  children,
  description,
  heading,
}: WorkspaceShellProps) {
  const context = await getDashboardContext();

  if (!context) {
    redirect("/auth/login");
  }

  const initials = getInitials(context.user.email);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-semibold tracking-[0.28em] text-white shadow-[0_14px_28px_rgba(17,24,39,0.2)]">
              GI
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-slate-400">
                GenomeIQ
              </p>
              <p className="text-lg font-semibold text-slate-950">Clinical intelligence workspace</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <a className="app-pill inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold" href="/dashboard">
              Dashboard
            </a>
            <WorkspaceQuickActions />
            <form action={logoutAction}>
              <Button className="rounded-full px-5" type="submit">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-[1680px] xl:px-4">
        <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white/72 px-6 py-8 lg:block">
          <div className="surface-enter space-y-8">
            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-slate-400">
                GenomeIQ
              </p>
              <div className="space-y-3">
                <div className="inline-flex rounded-full bg-slate-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                  Live
                </div>
                <div>
                  <h1 className="text-[2rem] font-semibold leading-tight text-slate-950">
                    {context.organizationName}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Production-ready genomics workspace for patient, sample, and report operations.
                  </p>
                </div>
              </div>
            </div>

            <DashboardNav />

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(148,163,184,0.14)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Workspace
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{context.user.email}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {context.role}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Organization</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{context.organizationType}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Tenant</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">Org scoped</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="surface-enter app-panel rounded-[30px] px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                  Topnav
                </span>
                <p className="text-lg font-semibold text-slate-950">{heading}</p>
              </div>
              <div className="hidden min-w-0 flex-1 xl:flex xl:justify-end">
                <div className="max-w-full overflow-x-auto">
                  <DashboardNav orientation="horizontal" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto xl:hidden">
            <DashboardNav orientation="horizontal" />
          </div>

          <main className="flex-1 py-6">
            <div className="surface-enter surface-enter-delay-1 mb-6">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">{heading}</h2>
              <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">{description}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
