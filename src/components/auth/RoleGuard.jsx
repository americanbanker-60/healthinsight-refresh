import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Higher-order component to protect routes/components by role
 * @param {Array<string>} allowedRoles - Roles that can access this content
 * @param {React.Component} children - Content to render if authorized
 * @param {React.Component} fallback - Optional fallback for unauthorized users
 */
export function RoleGuard({ allowedRoles = ["admin", "power", "user"], children, fallback }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return null;
  }

  const userRole = user?.role || "user";
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    if (fallback) return fallback;
    
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 m-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Access Restricted</h3>
              <p className="text-slate-600 text-sm">
                This feature is only available to {allowedRoles.join(", ")} users.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return children;
}

/**
 * Hook to check user role
 */
export function useUserRole() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const role = user?.role || "user";
  
  return {
    user,
    role,
    isAdmin: role === "admin",
    isPowerUser: role === "power",
    isUser: role === "user",
    hasRole: (requiredRole) => role === requiredRole,
    hasAnyRole: (roles) => roles.includes(role),
  };
}