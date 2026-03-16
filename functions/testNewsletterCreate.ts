import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const testData = {
      title: "DIAGNOSTIC TEST " + Date.now(),
      source_url: "https://test-diag-" + Date.now() + ".com",
      is_analyzed: true,
      source_type: "URL"
    };

    // Try asServiceRole create
    console.log("Creating with asServiceRole...");
    const created = await base44.asServiceRole.entities.NewsletterItem.create(testData);
    console.log("asServiceRole create result:", JSON.stringify(created));
    console.log("is_sample:", created?.is_sample);
    console.log("environment:", created?.environment);
    
    // Try to fetch it back by ID
    const fetched = await base44.asServiceRole.entities.NewsletterItem.get(created?.id);
    console.log("Fetched back:", JSON.stringify(fetched));

    // List all
    const all = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', 10);
    console.log("Total in list:", all.length);
    console.log("IDs in list:", all.map(n => n.id).join(', '));

    return Response.json({ 
      created_id: created?.id,
      is_sample: created?.is_sample,
      environment: created?.environment,
      fetched_id: fetched?.id,
      total_in_list: all.length,
    });
  } catch (error) {
    console.error("Error:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});