"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface DashboardNavProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

const navigationGroups = [
  {
    label: "Foundation",
    items: [
      { href: "/dashboard", label: "Overview", code: "01" },
      { href: "/patients", label: "Patients", code: "02" },
      { href: "/samples", label: "Samples", code: "03" },
      { href: "/variants", label: "Variants", code: "04" },
      { href: "/reports", label: "Reports", code: "05" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/workflows", label: "Workflows", code: "06" },
      { href: "/analytics", label: "Analytics", code: "07" },
      { href: "/settings", label: "Settings", code: "08" },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function DashboardNav({
  className,
  orientation = "vertical",
}: DashboardNavProps) {
  const pathname = usePathname();
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      className={cn(
        "flex gap-2",
        isHorizontal ? "flex-nowrap pb-1" : "flex-col gap-6",
        className,
      )}
    >
      {navigationGroups.map((group) => (
        <div
          key={group.label}
          className={cn(isHorizontal ? "contents" : "space-y-3")}
        >
          {!isHorizontal ? (
            <p className="px-2 font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-[22px] border px-4 py-3 transition-all duration-200",
                  isHorizontal ? "min-w-fit whitespace-nowrap bg-white" : "w-full bg-transparent",
                  active
                    ? "border-slate-300 bg-slate-100 text-slate-900 shadow-[0_14px_30px_rgba(148,163,184,0.16)]"
                    : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white hover:shadow-[0_10px_24px_rgba(148,163,184,0.12)]",
                )}
                href={item.href}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl border font-mono text-[11px] uppercase tracking-[0.24em]",
                    active
                      ? "border-slate-300 bg-slate-200 text-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white",
                  )}
                >
                  {item.code}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
