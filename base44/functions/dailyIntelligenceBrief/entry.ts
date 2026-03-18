import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { subDays } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    console.log('Starting daily intelligence brief job...');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];

    // Get all active watchlists
    const allWatchlists = await base44.asServiceRole.entities.UserWatchlist.filter({ is_active: true });
    
    console.log(`Found ${allWatchlists.length} active watchlists`);

    let briefsSent = 0;
    let errors = 0;

    for (const watchlist of allWatchlists) {
      try {
        // Skip if already sent today or if email frequency is weekly and we sent in the last 7 days
        if (watchlist.last_sent_date === today) {
          console.log(`Skipping watchlist ${watchlist.id} - already sent today`);
          continue;
        }

        if (watchlist.email_frequency === 'weekly' && watchlist.last_sent_date) {
          const lastSent = new Date(watchlist.last_sent_date);
          const daysSinceLastSent = Math.floor((new Date() - lastSent) / (1000 * 60 * 60 * 24));
          if (daysSinceLastSent < 7) {
            console.log(`Skipping watchlist ${watchlist.id} - weekly brief not due yet`);
            continue;
          }
        }

        // Build search filters
        const searchKeywords = [
          ...(watchlist.keywords || []),
          ...(watchlist.companies || [])
        ].join(' ');

        // Fetch matching newsletters from the last 24 hours
        const newsletters = await base44.asServiceRole.entities.NewsletterItem.filter({
          publication_date: { $gte: yesterday }
        }, '-publication_date', 50);

        // Filter by keywords/companies
        let matchedNewsletters = newsletters;
        if (searchKeywords) {
          const keywords = searchKeywords.toLowerCase().split(/\s+/).filter(k => k.length > 0);
          matchedNewsletters = newsletters.filter(n => {
            const searchText = [
              n.title || '',
              n.summary || '',
              n.tldr || '',
              ...(n.key_takeaways || []),
              ...(n.key_players || []),
              ...(n.themes?.map(t => `${t.theme} ${t.description}`) || [])
            ].join(' ').toLowerCase();
            
            return keywords.some(keyword => searchText.includes(keyword));
          });
        }

        // Filter by sources if specified
        if (watchlist.sources && watchlist.sources.length > 0) {
          matchedNewsletters = matchedNewsletters.filter(n => 
            watchlist.sources.includes(n.source_name)
          );
        }

        if (matchedNewsletters.length === 0) {
          console.log(`No matches found for watchlist ${watchlist.id}`);
          continue;
        }

        console.log(`Found ${matchedNewsletters.length} matches for watchlist ${watchlist.id}`);

        // Build email body
        let emailBody = `<h2>Daily Healthcare Intelligence Brief</h2>\n`;
        emailBody += `<p>You have <strong>${matchedNewsletters.length} new items</strong> matching your watchlist:</p>\n\n`;
        
        if (watchlist.keywords && watchlist.keywords.length > 0) {
          emailBody += `<p><strong>Watched Keywords:</strong> ${watchlist.keywords.join(', ')}</p>\n`;
        }
        if (watchlist.companies && watchlist.companies.length > 0) {
          emailBody += `<p><strong>Watched Companies:</strong> ${watchlist.companies.join(', ')}</p>\n`;
        }
        
        emailBody += `<hr>\n\n`;

        // Add each newsletter
        matchedNewsletters.slice(0, 10).forEach(newsletter => {
          emailBody += `<h3>${newsletter.title}</h3>\n`;
          emailBody += `<p><strong>Source:</strong> ${newsletter.source_name}`;
          if (newsletter.publication_date) {
            emailBody += ` | <strong>Date:</strong> ${newsletter.publication_date}`;
          }
          emailBody += `</p>\n`;
          
          if (newsletter.tldr) {
            emailBody += `<p><strong>TL;DR:</strong> ${newsletter.tldr}</p>\n`;
          }
          
          if (newsletter.key_takeaways && newsletter.key_takeaways.length > 0) {
            emailBody += `<ul>\n`;
            newsletter.key_takeaways.slice(0, 3).forEach(takeaway => {
              emailBody += `<li>${takeaway}</li>\n`;
            });
            emailBody += `</ul>\n`;
          }
          
          if (newsletter.source_url) {
            emailBody += `<p><a href="${newsletter.source_url}">Read Full Article</a></p>\n`;
          }
          
          emailBody += `<hr>\n\n`;
        });

        if (matchedNewsletters.length > 10) {
          emailBody += `<p><em>...and ${matchedNewsletters.length - 10} more items</em></p>\n`;
        }

        // Get user email from watchlist creator
        const userEmail = watchlist.created_by;

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: userEmail,
          subject: `Daily Intelligence Brief - ${matchedNewsletters.length} New Items`,
          body: emailBody
        });

        // Update last_sent_date
        await base44.asServiceRole.entities.UserWatchlist.update(watchlist.id, {
          last_sent_date: today
        });

        briefsSent++;
        console.log(`Brief sent to ${userEmail} for watchlist ${watchlist.id}`);

      } catch (error) {
        console.error(`Error processing watchlist ${watchlist.id}:`, error.message);
        errors++;
      }
    }

    return Response.json({
      success: true,
      briefsSent,
      errors,
      totalWatchlists: allWatchlists.length
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