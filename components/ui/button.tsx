import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost";
type ButtonSize = "default" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--primary)] text-white shadow-[0_0_24px_rgba(14,165,233,0.18),0_8px_20px_rgba(0,0,0,0.08)] hover:bg-sky-500 hover:shadow-[0_0_32px_rgba(14,165,233,0.3),0_12px_32px_rgba(0,0,0,0.12)]",
  secondary:
    "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-4 py-2",
  lg: "h-12 px-6 py-3",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = "button", variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        data-ui-action="true"
        ref={ref}
        type={type}
        className={cn(
          "ui-button group relative inline-flex items-center justify-center overflow-hidden rounded-xl text-sm font-semibold",
          "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(148,163,184,0.16)] active:translate-y-px active:scale-[0.985]",
          "disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_55%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <span className="relative z-10 inline-flex items-center gap-2">{props.children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";
