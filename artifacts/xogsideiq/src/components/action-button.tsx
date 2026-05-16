import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const VARIANT: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #2962ff, #4d7fff)",
    color: "#fff",
    border: "1px solid rgba(77,127,255,0.5)",
    boxShadow: "0 2px 12px rgba(41,98,255,0.35)",
  },
  secondary: {
    background: "rgba(255,255,255,0.06)",
    color: "#c8cedf",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  ghost: {
    background: "rgba(255,255,255,0.03)",
    color: "#8a90a8",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  danger: {
    background: "rgba(239,83,80,0.15)",
    color: "#ef5350",
    border: "1px solid rgba(239,83,80,0.35)",
  },
};

const SIZE = {
  sm: "min-h-9 px-3 text-[11px] gap-1.5 rounded-lg",
  md: "min-h-11 px-4 text-[12px] gap-2 rounded-xl",
  lg: "min-h-12 px-5 text-[13px] gap-2 rounded-xl",
};

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      className,
      variant = "secondary",
      loading = false,
      fullWidth = false,
      icon,
      size = "md",
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const iconOnly = !children && (icon || loading);
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center font-bold transition-all duration-150",
          "touch-manipulation select-none",
          "hover:brightness-110 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d7fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e16]",
          "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          SIZE[size],
          fullWidth && "w-full",
          iconOnly && "!px-0",
          className,
        )}
        style={VARIANT[variant]}
        {...props}
      >
        {loading ? <Spinner className="size-4 shrink-0" /> : icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
      </button>
    );
  },
);
ActionButton.displayName = "ActionButton";
