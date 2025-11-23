import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current authenticated user
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to update all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let updated = 0;
    let currentUserIsAdmin = false;

    for (const user of allUsers) {
      if (user.id === currentUser.id) {
        // Set current user as admin
        if (user.role !== 'admin') {
          await base44.asServiceRole.entities.User.update(user.id, { role: 'admin' });
          updated++;
        }
        currentUserIsAdmin = true;
      } else {
        // Set all other users to standard (if not already set)
        if (user.role === 'admin' || !user.role) {
          await base44.asServiceRole.entities.User.update(user.id, { role: 'standard' });
          updated++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Role assignment complete. ${updated} users updated.`,
      adminUser: currentUser.email,
      totalUsers: allUsers.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: 'Failed to set admin roles'
    }, { status: 500 });
  }
});