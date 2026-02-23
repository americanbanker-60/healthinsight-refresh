import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (err) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Show loading state before mounting component
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  // Redirect to unauthorized if no user or role mismatch
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return <Navigate to={createPageUrl("Unauthorized")} replace />;
  }

  // Role validated - mount the component
  return <>{children}</>;
}