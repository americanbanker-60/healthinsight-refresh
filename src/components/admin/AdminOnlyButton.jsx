import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { useUserRole } from "../auth/RoleGuard";

/**
 * Visual badge indicating admin-only feature
 */
export function AdminBadge({ className = "", size = "sm" }) {
  return (
    <Badge className={`bg-red-100 text-red-700 border-red-300 ${size === "xs" ? "text-[10px] px-1.5 py-0" : ""} ${className}`}>
      <Shield className={`${size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} mr-1`} />
      Admin
    </Badge>
  );
}

/**
 * Wrapper component that only renders children if user is admin
 * Use this to conditionally show admin-only buttons/actions
 */
export function AdminOnlyButton({ children, fallback = null }) {
  const { isAdmin } = useUserRole();
  
  if (!isAdmin) {
    return fallback;
  }
  
  return children;
}

/**
 * Higher-order component to wrap any component with admin-only visibility
 */
export function withAdminOnly(Component) {
  return function AdminOnlyComponent(props) {
    const { isAdmin } = useUserRole();
    
    if (!isAdmin) {
      return null;
    }
    
    return <Component {...props} />;
  };
}