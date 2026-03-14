"use client";

import Link from "next/link";
import { Activity, FileText, FlaskConical, Sparkles, UserPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const primaryActions = [
  {
    description: "Start a new patient case and capture phenotypes.",
    href: "/patients/new",
    icon: UserPlus,
    label: "Add patient",
  },
  {
    description: "Upload a VCF into the storage-backed intake queue.",
    href: "/samples/upload",
    icon: FlaskConical,
    label: "Upload sample",
  },
  {
    description: "Review stored variants and annotation coverage.",
    href: "/variants",
    icon: Activity,
    label: "Open variants",
  },
  {
    description: "Generate or finalize a clinical report.",
    href: "/reports",
    icon: FileText,
    label: "Open reports",
  },
];

const supportActions = [
  "Quick actions keep mobile workflows usable without hunting through the sidebar.",
  "Use this modal as a launch surface for the most common clinician tasks.",
  "All actions still route into the real Supabase-backed pages you already have.",
];

export function WorkspaceQuickActions() {
  return (
    <Dialog>
      <DialogTrigger 
        suppressHydrationWarning
        className="ui-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-[0_12px_28px_rgba(148,163,184,0.12)] transition-colors hover:bg-slate-50"
      >
        <Sparkles className="h-4 w-4 text-sky-500" />
        Quick actions
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Action Center</DialogTitle>
          <DialogDescription>
            Open the main case-management flows from a single popup. This is tuned for
            smaller screens and faster navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {primaryActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-[0_18px_36px_rgba(148,163,184,0.16)]"
                href={action.href}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{action.label}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Workspace Notes
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {supportActions.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
