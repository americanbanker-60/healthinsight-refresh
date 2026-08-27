// Shared authorization helpers for backend functions.
//
// requireAdminOrInternal (x-internal-secret gating for worker/scheduled entry
// points and function-to-function calls) is intentionally NOT exported yet — it
// depends on the INTERNAL_FUNCTION_SECRET environment variable, which is not
// configured. It will be added here once that secret exists.
//
// These helpers throw a Response on failure; callers should surface it with
// `if (error instanceof Response) return error;` in their catch block.

export async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export async function requireAdmin(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    throw Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  return user;
}