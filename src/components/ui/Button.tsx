import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "whatsapp" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none";

    const variantStyles = {
      primary:
        "bg-brand text-white hover:bg-brand-hover active:bg-brand-active focus-visible:ring-brand shadow-sm",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400",
      outline:
        "border-2 border-brand text-brand hover:bg-[#fdf2f4] active:bg-[#fbe6ea] focus-visible:ring-brand",
      ghost:
        "text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-300",
      whatsapp:
        "bg-[#25D366] text-white hover:bg-[#20bd5a] active:bg-[#1caa51] focus-visible:ring-[#25D366] shadow-sm",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm",
    };

    // WCAG 2.2 AA: Mínimo 44px de altura táctil
    const sizeStyles = {
      sm: "h-11 px-4 text-sm min-h-[44px]",
      md: "h-12 px-5 text-base min-h-[44px]",
      lg: "h-14 px-7 text-lg min-h-[44px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
