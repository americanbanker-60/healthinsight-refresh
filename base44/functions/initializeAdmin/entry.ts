import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend function to ensure the app owner is set as admin
 * Call this once during app setup or when needed
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current user (must be authenticated)
    const currentUser = await base44.auth.me();
    
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is already admin
    if (currentUser.role === 'admin') {
      return Response.json({ 
        success: true, 
        message: 'You are already an admin',
        user: currentUser.email 
      });
    }
    
    // Use service role to check if any admin exists
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingAdmin = allUsers.find(u => u.role === 'admin');
    
    if (existingAdmin) {
      return Response.json({ 
        error: 'An admin already exists. Only one admin is allowed.',
        existingAdmin: existingAdmin.email
      }, { status: 403 });
    }
    
    // Set current user as admin
    await base44.asServiceRole.entities.User.update(currentUser.id, { role: 'admin' });
    
    return Response.json({ 
      success: true, 
      message: 'Successfully set as admin',
      user: currentUser.email 
    });
    
  } catch (error) {
    console.error('Admin initialization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});