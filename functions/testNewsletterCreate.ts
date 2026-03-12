import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Try creating a minimal newsletter
    const testData = {
      title: "DIAGNOSTIC TEST " + Date.now(),
      source_url: "https://test-diagnostic-" + Date.now() + ".com",
      is_analyzed: true
    };

    console.log("Attempting to create newsletter with asServiceRole...");
    const created = await base44.asServiceRole.entities.NewsletterItem.create(testData);
    console.log("Create response:", JSON.stringify(created));

    // Now try to read it back
    console.log("Reading back by ID...");
    const allNewsletters = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', 5);
    console.log("Total newsletters found (asServiceRole):", allNewsletters.length);
    console.log("First few IDs:", allNewsletters.map(n => n.id).join(', '));

    return Response.json({ 
      created_id: created?.id,
      created_title: created?.title,
      total_found: allNewsletters.length,
      recent_ids: allNewsletters.map(n => n.id)
    });
  } catch (error) {
    console.error("Error:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});