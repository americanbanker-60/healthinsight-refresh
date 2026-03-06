import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * AdminGuard - Ensures the app owner always has admin role
 * 
 * Automatically checks and updates the authenticated user's role to 'admin' if:
 * 1. They are the first user in the system, OR
 * 2. Their role is not currently 'admin' and they should be owner
 * 
 * This prevents admin access from "going away" after role changes
 */
export function AdminGuard({ children }) {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Safety timeout — never block the UI for more than 4 seconds
    const timeout = setTimeout(() => setIsChecking(false), 4000);

    const ensureAdminRole = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          clearTimeout(timeout);
          setIsChecking(false);
          return;
        }

        // If already admin, nothing to do
        if (user.role === 'admin') {
          clearTimeout(timeout);
          setIsChecking(false);
          return;
        }

        // Only do the expensive user-list check if they don't have a role set yet
        // (i.e. brand-new account — role will be null/undefined)
        if (!user.role) {
          const allUsers = await base44.asServiceRole.entities.User.list();
          if (allUsers.length === 1 || user.id === allUsers[0]?.id) {
            await base44.asServiceRole.entities.User.update(user.id, { role: 'admin' });
            clearTimeout(timeout);
            window.location.reload();
            return;
          }
        }

        clearTimeout(timeout);
        setIsChecking(false);
      } catch (error) {
        console.error('Admin guard check failed:', error);
        clearTimeout(timeout);
        setIsChecking(false);
      }
    };

    ensureAdminRole();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return children;
}