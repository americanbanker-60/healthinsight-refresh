import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Reusable card with consistent styling and hover effects
 */
export function StyledCard({ children, className = "", onClick, ...props }) {
  return (
    <Card
      className={cn(
        "bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-slate-200/60",
        onClick && "cursor-pointer group",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </Card>
  );
}