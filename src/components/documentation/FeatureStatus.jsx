import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

const StatusBadge = ({ status }) => {
  const config = {
    implemented: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Implemented" },
    partial: { icon: AlertTriangle, color: "bg-yellow-100 text-yellow-800", label: "Partial" },
    planned: { icon: Clock, color: "bg-blue-100 text-blue-800", label: "Planned" },
    missing: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Not Implemented" },
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <Badge className={color}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

export default function FeatureStatus() {
  const features = [
    {
      category: "Content Management",
      items: [
        { name: "Source CRUD Operations", status: "implemented", notes: "Full admin management with categorization" },
        { name: "CSV/URL Bulk Upload", status: "implemented", notes: "Supports large batches (700+ tested)" },
        { name: "Newsletter AI Processing", status: "implemented", notes: "Via analyzeNewsletterUrl function" },
        { name: "Publication Date Extraction", status: "implemented", notes: "With confidence scoring" },
        { name: "Scheduled Scraping", status: "partial", notes: "ScheduledScrape entity exists, automation not active" },
        { name: "Real-Time Source Monitoring", status: "missing", notes: "No webhook or polling system" },
        { name: "Content Deduplication", status: "missing", notes: "Duplicate URLs may create multiple records" },
      ]
    },
    {
      category: "Search & Discovery",
      items: [
        { name: "Keyword Search", status: "implemented", notes: "Multi-field text search" },
        { name: "Date Range Filtering", status: "implemented", notes: "Presets + custom ranges" },
        { name: "Source Filtering", status: "implemented", notes: "Multi-select with all/none shortcuts" },
        { name: "Topic Filtering", status: "implemented", notes: "Dynamic from content + custom input" },
        { name: "Sentiment Filtering", status: "implemented", notes: "positive/neutral/negative/mixed" },
        { name: "Company Filtering", status: "implemented", notes: "Extracted from key_players" },
        { name: "Saved Searches", status: "implemented", notes: "User-scoped with quick load" },
        { name: "Smart Search Suggestions", status: "implemented", notes: "AI-powered topic/company autocomplete" },
        { name: "Full-Text Search", status: "missing", notes: "No PostgreSQL FTS or Elasticsearch integration" },
        { name: "Relevance Scoring", status: "missing", notes: "Results not ranked by relevance" },
      ]
    },
    {
      category: "AI Features",
      items: [
        { name: "Multi-Newsletter Summaries", status: "implemented", notes: "Summary Builder with markdown export" },
        { name: "Trend Discovery", status: "implemented", notes: "Admin-triggered with 5+ source requirement" },
        { name: "AI Agents (4 configured)", status: "implemented", notes: "Conversation-based with entity tools" },
        { name: "PE Meeting Prep", status: "implemented", notes: "Dedicated PEMeetingBrief entity" },
        { name: "Content Enhancement", status: "partial", notes: "EnhanceSummaryButton exists but limited use" },
        { name: "Auto-Categorization", status: "partial", notes: "AICategorySuggestion for sources only" },
        { name: "Sentiment Analysis", status: "implemented", notes: "Extracted during newsletter processing" },
        { name: "Named Entity Recognition", status: "partial", notes: "Companies extracted, no full NER" },
        { name: "Scheduled Report Generation", status: "missing", notes: "No email/PDF report automation" },
        { name: "Alert System for Watched Topics", status: "partial", notes: "WatchedTopic/TopicAlert entities exist, no notifications" },
      ]
    },
    {
      category: "User Workspace",
      items: [
        { name: "My Library", status: "implemented", notes: "Aggregates saved content" },
        { name: "Research Folders (Custom Packs)", status: "implemented", notes: "UserCustomPack + UserCustomPackItem" },
        { name: "Saved Summaries", status: "implemented", notes: "User-scoped markdown storage" },
        { name: "User Settings", status: "implemented", notes: "Personalization preferences" },
        { name: "Dashboard Configuration", status: "implemented", notes: "Visible stats, investment focus" },
        { name: "Activity Insights", status: "implemented", notes: "InsightsSection with AI summary generation" },
        { name: "Watched Topics", status: "partial", notes: "Subscription logic exists, no active alerting" },
        { name: "Collaborative Packs", status: "missing", notes: "No sharing between users" },
        { name: "Comments/Annotations", status: "missing", notes: "No user notes on newsletters" },
      ]
    },
    {
      category: "Admin Features",
      items: [
        { name: "Source Management", status: "implemented", notes: "Full CRUD with soft delete" },
        { name: "Topic Management", status: "implemented", notes: "TopicsDirectory page" },
        { name: "Company Management", status: "implemented", notes: "CompaniesDirectory page" },
        { name: "User Invitation", status: "implemented", notes: "base44.users.inviteUser()" },
        { name: "Admin Dashboard", status: "implemented", notes: "Overview with source scraper" },
        { name: "Trend Review", status: "implemented", notes: "Accept/dismiss AI suggestions" },
        { name: "Direct Newsletter Upload", status: "implemented", notes: "DirectNewsletterUpload component" },
        { name: "Bulk Operations", status: "partial", notes: "CSV upload exists, no bulk edit/delete" },
        { name: "Analytics Dashboard", status: "missing", notes: "No aggregate user activity metrics" },
        { name: "Audit Logs", status: "missing", notes: "No change tracking" },
        { name: "Content Moderation", status: "missing", notes: "No approval workflow" },
      ]
    },
    {
      category: "Data Quality",
      items: [
        { name: "Publication Date Extraction", status: "implemented", notes: "With confidence + source tracking" },
        { name: "Date Migration Tool", status: "implemented", notes: "PublicationDateMigration page" },
        { name: "Source Categorization", status: "implemented", notes: "7 predefined categories" },
        { name: "AI Category Suggestions", status: "implemented", notes: "AICategorySuggestion component" },
        { name: "Data Validation", status: "partial", notes: "Entity schemas enforce types, no field validation" },
        { name: "Duplicate Detection", status: "missing", notes: "No URL deduplication" },
        { name: "Content Cleanup Tools", status: "partial", notes: "Cleanup page exists for newsletters" },
      ]
    },
    {
      category: "Integration & Export",
      items: [
        { name: "Markdown Export", status: "implemented", notes: "Summaries download as .md" },
        { name: "PDF Export", status: "partial", notes: "exportNewsletterPDF function exists" },
        { name: "Copy to Clipboard", status: "implemented", notes: "Summary and newsletter content" },
        { name: "WhatsApp Agent Integration", status: "implemented", notes: "All agents support WhatsApp" },
        { name: "Email Notifications", status: "missing", notes: "No automated emails" },
        { name: "API Access", status: "missing", notes: "No public API for external systems" },
        { name: "RSS Feeds", status: "missing", notes: "No RSS generation" },
        { name: "Slack Integration", status: "missing", notes: "No Slack connector configured" },
      ]
    },
    {
      category: "Performance & Scalability",
      items: [
        { name: "React Query Caching", status: "implemented", notes: "Proper cache invalidation" },
        { name: "Pagination", status: "partial", notes: "List queries use limits, no UI pagination" },
        { name: "Lazy Loading", status: "missing", notes: "All results loaded at once" },
        { name: "Image Optimization", status: "missing", notes: "No image processing pipeline" },
        { name: "CDN for Static Assets", status: "implemented", notes: "Via Base44 platform" },
        { name: "Database Indexing", status: "implemented", notes: "Base44 automatic indexing" },
        { name: "Search Performance", status: "partial", notes: "Client-side filtering, no backend optimization" },
      ]
    },
    {
      category: "Security",
      items: [
        { name: "Row Level Security", status: "implemented", notes: "User-scoped data isolation" },
        { name: "Role-Based Access Control", status: "implemented", notes: "Admin/Power/User tiers" },
        { name: "Authentication", status: "implemented", notes: "Via Base44 auth system" },
        { name: "Soft Delete", status: "implemented", notes: "Sources use is_deleted flag" },
        { name: "Input Sanitization", status: "partial", notes: "React escapes by default, no explicit sanitization" },
        { name: "Rate Limiting", status: "missing", notes: "No API throttling" },
        { name: "Audit Trail", status: "missing", notes: "No change history" },
        { name: "Data Encryption", status: "implemented", notes: "Via Base44 platform" },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Feature Status Legend</p>
              <div className="space-y-1">
                <p><strong>Implemented:</strong> Feature is built and functional</p>
                <p><strong>Partial:</strong> Feature exists but incomplete or has limitations</p>
                <p><strong>Planned:</strong> Entity/component exists, implementation pending</p>
                <p><strong>Not Implemented:</strong> Feature does not exist</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {features.map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {category.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 pb-3 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-slate-600">{item.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-2">Known Limitations & Constraints</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Two-step process for content ingestion (create source → scrape newsletters)</li>
                <li>Client-side filtering performance degrades with 1000+ newsletters</li>
                <li>No real-time content updates (requires manual scraping)</li>
                <li>Filter state persists in localStorage (not synced across devices)</li>
                <li>No pagination UI for large result sets</li>
                <li>Duplicate URL detection not implemented</li>
                <li>Scheduled scraping entity exists but automation not configured</li>
                <li>Topic alerts configured but no notification delivery system</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}