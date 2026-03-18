import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    console.log('Starting newsletter deduplication...');

    // Fetch all newsletters
    const allNewsletters = await base44.asServiceRole.entities.NewsletterItem.list('-created_date');
    console.log(`Found ${allNewsletters.length} newsletters to check`);

    // Track duplicates by URL and title
    const urlMap = new Map();
    const titleMap = new Map();
    
    allNewsletters.forEach(newsletter => {
      if (newsletter.source_url) {
        if (!urlMap.has(newsletter.source_url)) {
          urlMap.set(newsletter.source_url, []);
        }
        urlMap.get(newsletter.source_url).push(newsletter);
      }
      
      if (newsletter.title) {
        const normalizedTitle = newsletter.title.toLowerCase().trim();
        if (!titleMap.has(normalizedTitle)) {
          titleMap.set(normalizedTitle, []);
        }
        titleMap.get(normalizedTitle).push(newsletter);
      }
    });

    const duplicateGroups = [];
    
    // Find URL duplicates
    for (const [url, newsletters] of urlMap) {
      if (newsletters.length > 1) {
        duplicateGroups.push({ type: 'url', key: url, newsletters });
      }
    }
    
    // Find title duplicates (only if not already in URL duplicates)
    for (const [title, newsletters] of titleMap) {
      if (newsletters.length > 1) {
        const ids = newsletters.map(n => n.id);
        const alreadyGrouped = duplicateGroups.some(group => 
          group.newsletters.some(n => ids.includes(n.id))
        );
        if (!alreadyGrouped) {
          duplicateGroups.push({ type: 'title', key: title, newsletters });
        }
      }
    }

    console.log(`Found ${duplicateGroups.length} duplicate groups`);

    let merged = 0;
    let deleted = 0;

    for (const group of duplicateGroups) {
      try {
        // Sort by creation date - keep the oldest one
        const sorted = group.newsletters.sort((a, b) => 
          new Date(a.created_date) - new Date(b.created_date)
        );
        
        const primary = sorted[0];
        const duplicates = sorted.slice(1);
        
        console.log(`Merging ${duplicates.length} duplicates into newsletter ${primary.id}`);

        // Merge themes
        const allThemes = [...(primary.themes || [])];
        const themeKeys = new Set(allThemes.map(t => t.theme?.toLowerCase()));
        
        duplicates.forEach(dup => {
          if (dup.themes) {
            dup.themes.forEach(theme => {
              if (theme.theme && !themeKeys.has(theme.theme.toLowerCase())) {
                allThemes.push(theme);
                themeKeys.add(theme.theme.toLowerCase());
              }
            });
          }
        });

        // Merge key_takeaways
        const allTakeaways = [...(primary.key_takeaways || [])];
        const takeawaySet = new Set(allTakeaways.map(t => t.toLowerCase()));
        
        duplicates.forEach(dup => {
          if (dup.key_takeaways) {
            dup.key_takeaways.forEach(takeaway => {
              if (takeaway && !takeawaySet.has(takeaway.toLowerCase())) {
                allTakeaways.push(takeaway);
                takeawaySet.add(takeaway.toLowerCase());
              }
            });
          }
        });

        // Merge key_players
        const allPlayers = [...(primary.key_players || [])];
        const playerSet = new Set(allPlayers.map(p => p.toLowerCase()));
        
        duplicates.forEach(dup => {
          if (dup.key_players) {
            dup.key_players.forEach(player => {
              if (player && !playerSet.has(player.toLowerCase())) {
                allPlayers.push(player);
                playerSet.add(player.toLowerCase());
              }
            });
          }
        });

        // Merge M&A activities
        const allMA = [...(primary.ma_activities || [])];
        duplicates.forEach(dup => {
          if (dup.ma_activities) {
            allMA.push(...dup.ma_activities);
          }
        });

        // Merge funding rounds
        const allFunding = [...(primary.funding_rounds || [])];
        duplicates.forEach(dup => {
          if (dup.funding_rounds) {
            allFunding.push(...dup.funding_rounds);
          }
        });

        // Use the most complete summary, tldr, etc.
        const bestSummary = [primary, ...duplicates]
          .map(n => n.summary)
          .filter(s => s && s.length > 100)
          .sort((a, b) => b.length - a.length)[0] || primary.summary;

        const bestTLDR = [primary, ...duplicates]
          .map(n => n.tldr)
          .filter(t => t && t.length > 20)
          .sort((a, b) => b.length - a.length)[0] || primary.tldr;

        // Update primary with merged data
        await base44.asServiceRole.entities.NewsletterItem.update(primary.id, {
          themes: allThemes,
          key_takeaways: allTakeaways,
          key_players: allPlayers,
          ma_activities: allMA,
          funding_rounds: allFunding,
          summary: bestSummary,
          tldr: bestTLDR
        });

        // Delete duplicates
        for (const dup of duplicates) {
          await base44.asServiceRole.entities.NewsletterItem.delete(dup.id);
          deleted++;
        }

        merged++;

      } catch (error) {
        console.error(`Error processing group for ${group.key}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      duplicateGroups: duplicateGroups.length,
      merged,
      deleted,
      message: `Merged ${merged} newsletter groups, deleted ${deleted} duplicates`
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
});