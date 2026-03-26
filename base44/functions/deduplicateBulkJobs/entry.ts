import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Processes one page at a time - call repeatedly until duplicates_removed = 0
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all jobs (use a generous limit - we need all to find dupes)
    const page1 = await base44.asServiceRole.entities.BulkImportJob.list('created_date', 500, 0);
    const page2 = await base44.asServiceRole.entities.BulkImportJob.list('created_date', 500, 500);
    const page3 = await base44.asServiceRole.entities.BulkImportJob.list('created_date', 500, 1000);

    const allJobs = [...(page1 || []), ...(page2 || []), ...(page3 || [])];
    console.log(`Fetched ${allJobs.length} total jobs`);

    // Group by URL
    const urlMap = {};
    for (const job of allJobs) {
      if (!urlMap[job.url]) urlMap[job.url] = [];
      urlMap[job.url].push(job);
    }

    const uniqueUrls = Object.keys(urlMap).length;
    console.log(`Unique URLs: ${uniqueUrls} out of ${allJobs.length} total`);

    // Collect duplicate IDs to delete
    // Priority: keep pending first, then processing, then failed, then done/skipped
    const statusPriority = { pending: 0, processing: 1, failed: 2, done: 3, skipped: 4 };
    const toDelete = [];

    for (const [url, jobs] of Object.entries(urlMap)) {
      if (jobs.length <= 1) continue;
      jobs.sort((a, b) => (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99));
      const [, ...dupes] = jobs;
      toDelete.push(...dupes.map(d => d.id));
    }

    console.log(`Deleting ${toDelete.length} duplicate jobs`);

    // Delete all dupes in parallel chunks of 20
    for (let i = 0; i < toDelete.length; i += 20) {
      const chunk = toDelete.slice(i, i + 20);
      await Promise.all(chunk.map(id => base44.asServiceRole.entities.BulkImportJob.delete(id)));
    }

    return Response.json({
      success: true,
      total_before: allJobs.length,
      unique_urls: uniqueUrls,
      duplicates_removed: toDelete.length,
      remaining: allJobs.length - toDelete.length
    });

  } catch (error) {
    console.error('Dedup error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});