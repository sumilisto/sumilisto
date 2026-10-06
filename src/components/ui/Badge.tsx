import React from "react";
import { cn } from "@/lib/utils";
import { ProductStockStatus } from "@/types/product";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral" | "status";
  status?: ProductStockStatus;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  status,
  children,
  ...props
}) => {
  if (status) {
    switch (status) {
      case "disponible":
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200",
              className
            )}
            {...props}
          >
            Disponible
          </span>
        );
      case "ultimas_unidades":
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200",
              className
            )}
            {...props}
          >
            Últimas unidades
          </span>
        );
      case "agotado":
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200",
              className
            )}
            {...props}
          >
            Agotado
          </span>
        );
      case "no_disponible":
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300 tracking-wider",
              className
            )}
            {...props}
          >
            NO DISPONIBLE
          </span>
        );
    }
  }

  const variantStyles = {
    primary: "bg-[#fdf2f4] text-[#590317] border border-[#f0aab8]",
    secondary: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    neutral: "bg-slate-50 text-slate-600 border border-slate-200",
    status: "",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
