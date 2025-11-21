import React from "react";
import { useUserRole } from "../auth/RoleGuard";

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