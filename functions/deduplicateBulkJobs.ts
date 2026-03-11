import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch ALL jobs in batches
    let allJobs = [];
    let skip = 0;
    const pageSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.BulkImportJob.list('-created_date', pageSize, skip);
      if (!batch || batch.length === 0) break;
      allJobs = allJobs.concat(batch);
      skip += pageSize;
      if (batch.length < pageSize) break;
    }

    console.log(`Total jobs fetched: ${allJobs.length}`);

    // Group by URL
    const urlMap = {};
    for (const job of allJobs) {
      const url = job.url;
      if (!urlMap[url]) {
        urlMap[url] = [];
      }
      urlMap[url].push(job);
    }

    const uniqueUrls = Object.keys(urlMap).length;
    console.log(`Unique URLs: ${uniqueUrls}, Total jobs: ${allJobs.length}, Duplicates to remove: ${allJobs.length - uniqueUrls}`);

    // For each URL, keep only ONE job (prefer pending > failed > done > skipped)
    const statusPriority = { pending: 0, failed: 1, processing: 2, done: 3, skipped: 4 };
    const toDelete = [];

    for (const [url, jobs] of Object.entries(urlMap)) {
      if (jobs.length <= 1) continue;

      // Sort: keep the one with highest priority status (lowest number), then newest
      jobs.sort((a, b) => {
        const aPriority = statusPriority[a.status] ?? 99;
        const bPriority = statusPriority[b.status] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.created_date) - new Date(a.created_date);
      });

      // Keep first, delete the rest
      const [keep, ...dupes] = jobs;
      console.log(`URL: ${url} - keeping ${keep.id} (${keep.status}), deleting ${dupes.length} dupes`);
      toDelete.push(...dupes.map(d => d.id));
    }

    console.log(`Deleting ${toDelete.length} duplicate jobs...`);

    // Delete in batches of 50
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      await Promise.all(chunk.map(id => base44.asServiceRole.entities.BulkImportJob.delete(id)));
      deleted += chunk.length;
      console.log(`Deleted ${deleted}/${toDelete.length}`);
    }

    return Response.json({
      success: true,
      total_jobs_before: allJobs.length,
      unique_urls: uniqueUrls,
      duplicates_removed: deleted,
      jobs_remaining: allJobs.length - deleted
    });

  } catch (error) {
    console.error('Dedup error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});