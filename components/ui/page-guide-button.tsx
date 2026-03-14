"use client";

import { CircleHelp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PageGuideButtonProps {
  description: string;
  items: string[];
  title: string;
}

export function PageGuideButton({
  description,
  items,
  title,
}: PageGuideButtonProps) {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-[0_12px_28px_rgba(148,163,184,0.12)] transition-colors hover:bg-slate-50">
        <CircleHelp className="h-4 w-4 text-sky-500" />
        Guide
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-3">
          {items.map((item, index) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
