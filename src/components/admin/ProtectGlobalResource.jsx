// DEPRECATED: safe to remove — not imported anywhere in the app
import React from "react";
import { useUserRole } from "../auth/RoleGuard";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Wrapper to protect global resources (Topics, Companies, etc.) from non-admin edits
 * Shows read-only view to non-admins, full access to admins
 */
export function ProtectGlobalResource({ 
  children, 
  resourceName = "resource",
  readOnlyView = null 
}) {
  const { isAdmin } = useUserRole();

  if (!isAdmin) {
    if (readOnlyView) {
      return readOnlyView;
    }
    
    return (
      <Card className="bg-amber-50 border-amber-200 m-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">View Only</h3>
              <p className="text-amber-800 text-sm">
                You can view this {resourceName}, but only administrators can create or modify it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return children;
}