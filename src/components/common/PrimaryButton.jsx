import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standardized primary action button with gradient styling
 */
export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <Button
      className={cn(
        "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-lg transition-all",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}