import { base44 } from "@/api/base44Client";

export async function logPackView(packId) {
  try {
    const user = await base44.auth.me();
    
    // Check if this pack was already viewed by this user
    const existingViews = await base44.entities.RecentlyViewedPack.filter({
      pack_id: packId,
      created_by: user.email
    });

    if (existingViews.length > 0) {
      // Update the existing view's timestamp
      await base44.entities.RecentlyViewedPack.update(existingViews[0].id, {
        viewed_at: new Date().toISOString()
      });
    } else {
      // Create new view record
      await base44.entities.RecentlyViewedPack.create({
        pack_id: packId,
        viewed_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Failed to log pack view:", error);
  }
}