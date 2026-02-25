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
    const ensureAdminRole = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setIsChecking(false);
          return;
        }

        // Check if user needs admin role assignment
        if (user.role !== 'admin') {
          // Get all users to determine if this is the first user
          const allUsers = await base44.asServiceRole.entities.User.list();
          
          // If this is the only user OR the first user, make them admin
          if (allUsers.length === 1 || user.id === allUsers[0]?.id) {
            await base44.asServiceRole.entities.User.update(user.id, { 
              role: 'admin' 
            });
            
            // Reload to refresh user data
            window.location.reload();
            return;
          }
        }
        
        setIsChecking(false);
      } catch (error) {
        console.error('Admin guard check failed:', error);
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