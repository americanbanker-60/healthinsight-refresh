import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Zap, Search, Brain, Briefcase } from "lucide-react";

export default function FeaturesWorkflows() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role-Based Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800">Admin</Badge>
              </h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>• Manage sources and categories</li>
                <li>• Run source scrapers</li>
                <li>• Access admin dashboard</li>
                <li>• Manage topics and companies</li>
                <li>• Review AI trend suggestions</li>
                <li>• Bulk upload sources</li>
                <li>• Direct newsletter upload</li>
                <li>• Invite users (any role)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">Power User</Badge>
              </h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>• All user permissions</li>
                <li>• Access dashboard settings</li>
                <li>• Configure custom preferences</li>
                <li>• Advanced analytics access</li>
                <li>• Invite users (user role only)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">User</Badge>
              </h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>• Browse newsletters</li>
                <li>• Search and filter content</li>
                <li>• Save searches and summaries</li>
                <li>• Create custom packs</li>
                <li>• Watch topics for alerts</li>
                <li>• Use AI agents</li>
                <li>• PE meeting prep tool</li>
                <li>• Invite users (user role only)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Core Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3">1. Content Management</h3>
            <div className="space-y-3 ml-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Source Management</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Admin-only feature for managing newsletter publishers. Sources represent organizations or 
                  publications that produce healthcare content.
                </p>
                <div className="bg-slate-50 p-3 rounded text-xs space-y-1">
                  <p><strong>Workflow:</strong></p>
                  <p>1. Admin navigates to Manage Sources</p>
                  <p>2. Creates source via form, CSV upload, or URL paste</p>
                  <p>3. Assigns category (Investment Banking, Technology, Finance, etc.)</p>
                  <p>4. Source appears in sidebar under category</p>
                  <p>5. Use Source Scraper to fetch newsletters from source</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Newsletter Ingestion</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Two-step process: create source metadata, then scrape content from URLs.
                </p>
                <div className="bg-slate-50 p-3 rounded text-xs space-y-1">
                  <p><strong>Methods:</strong></p>
                  <p>• Direct URL submission (Admin Dashboard)</p>
                  <p>• Source Scraper automated extraction</p>
                  <p>• Scheduled scraping (coming soon)</p>
                  <p>• Bulk URL processing</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">AI Content Processing</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Each newsletter URL is processed by analyzeNewsletterUrl function which:
                </p>
                <ul className="text-xs text-slate-700 space-y-1 ml-4">
                  <li>• Fetches webpage content</li>
                  <li>• Extracts publication date with confidence scoring</li>
                  <li>• Generates TLDR summary (2-3 sentences)</li>
                  <li>• Identifies key takeaways</li>
                  <li>• Extracts M&A activities and funding rounds</li>
                  <li>• Identifies themes and key players (companies)</li>
                  <li>• Extracts key statistics</li>
                  <li>• Provides recommended actions</li>
                  <li>• Determines sentiment</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">2. Discovery & Search</h3>
            <div className="space-y-3 ml-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Knowledge Hub</h4>
                <p className="text-sm text-slate-700">
                  Landing page showing featured topics, source overview, and help sections. Entry point for exploration.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Explore All Sources</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Advanced search interface with multi-dimensional filtering:
                </p>
                <ul className="text-xs text-slate-700 space-y-1 ml-4">
                  <li>• Keyword search across title, summary, takeaways, themes</li>
                  <li>• Date range presets (7d, 30d, 90d, YTD, custom)</li>
                  <li>• Source selection (multi-select)</li>
                  <li>• Topic filtering (dynamic from content)</li>
                  <li>• Sentiment filtering</li>
                  <li>• Company filtering</li>
                  <li>• Sort by newest/oldest</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Saved Searches</h4>
                <p className="text-sm text-slate-700">
                  Users can save filter combinations with custom names for quick recall. Saved searches are user-scoped.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Smart Search</h4>
                <p className="text-sm text-slate-700">
                  AI-powered search suggestions for topics and companies based on existing content.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">3. AI Features</h3>
            <div className="space-y-3 ml-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Summary Builder</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Select multiple newsletters and generate AI-powered executive summary. Features:
                </p>
                <ul className="text-xs text-slate-700 space-y-1 ml-4">
                  <li>• Multi-newsletter aggregation</li>
                  <li>• Structured markdown output</li>
                  <li>• Copy to clipboard</li>
                  <li>• Download as .md file</li>
                  <li>• Save to library</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Trend Discovery</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Admin-triggered AI analysis that identifies emerging trends across recent newsletters:
                </p>
                <ul className="text-xs text-slate-700 space-y-1 ml-4">
                  <li>• Requires 5+ independent sources mentioning theme</li>
                  <li>• Generates trend suggestions with confidence scores</li>
                  <li>• Admin reviews and accepts/dismisses</li>
                  <li>• Accepted trends can become Topics</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">AI Agents</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Four configured agents with entity access and tool usage:
                </p>
                <ul className="text-xs text-slate-700 space-y-1 ml-4">
                  <li>• <strong>PE Meeting Brief Agent:</strong> Prepares meeting briefs with company research</li>
                  <li>• <strong>HealthInsight Assistant:</strong> General Q&A and guidance</li>
                  <li>• <strong>Insight Analyst:</strong> Deep analysis of content and trends</li>
                  <li>• <strong>Strategic BD Advisor:</strong> Business development recommendations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">PE Meeting Prep</h4>
                <p className="text-sm text-slate-700">
                  Specialized tool for generating meeting briefs. User provides company/counterparty details, 
                  role perspective, meeting context. AI generates comprehensive brief with research and sources.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">4. Personal Workspace</h3>
            <div className="space-y-3 ml-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">My Library</h4>
                <p className="text-sm text-slate-700">
                  User-scoped collection hub containing saved searches, summaries, watched topics, and insights.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Research Folders (Custom Packs)</h4>
                <p className="text-sm text-slate-700">
                  User creates custom collections of newsletters for specific research projects or topics. 
                  Supports drag-and-drop ordering and notes.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Watched Topics</h4>
                <p className="text-sm text-slate-700">
                  Subscribe to specific topics and receive alerts when new relevant content is indexed.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">User Settings</h4>
                <p className="text-sm text-slate-700">
                  Personalization: default landing page, date ranges, preferred sources/topics, notification 
                  preferences, AI verbosity, theme.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Agent System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Agent Architecture</h3>
            <p className="text-sm text-slate-700 mb-3">
              Agents are configured via JSON files in agents/ directory. Each agent has:
            </p>
            <ul className="text-sm text-slate-700 space-y-1 ml-4">
              <li>• Description and instructions</li>
              <li>• Tool access (entity CRUD operations)</li>
              <li>• Optional WhatsApp integration</li>
              <li>• Conversation persistence</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Agent Workflow</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-1">
              <p>1. User creates conversation via base44.agents.createConversation()</p>
              <p>2. User adds message with base44.agents.addMessage()</p>
              <p>3. Agent receives context and available tools</p>
              <p>4. Agent executes tool calls (entity operations)</p>
              <p>5. Results streamed back to UI via subscribeToConversation()</p>
              <p>6. Conversation persists in database</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}