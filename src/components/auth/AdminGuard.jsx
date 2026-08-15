import React from "react";

/**
 * AdminGuard
 *
 * Previously this component self-promoted the first/role-less user to admin
 * by calling base44.asServiceRole.entities.User from the browser — a
 * client-side privilege escalation. Role assignment is now left entirely to
 * the platform (invites / admin actions), so this is a passthrough.
 */
export function AdminGuard({ children }) {
  return children;
}