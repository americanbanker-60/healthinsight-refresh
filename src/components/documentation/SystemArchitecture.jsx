import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Database, Cloud, Zap } from "lucide-react";

export default function SystemArchitecture() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            High-Level System Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Platform Overview</h3>
            <p className="text-slate-700 leading-relaxed">
              HealthInsight is a healthcare intelligence aggregation and analysis platform built on the Base44 
              backend-as-a-service infrastructure. The system ingests healthcare newsletters from multiple sources, 
              processes them using AI, and provides executive-level intelligence summaries, trend analysis, and 
              meeting preparation tools.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Core Design Principles</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Separation of Concerns:</strong> Sources (publishers) vs Newsletters (articles)</li>
              <li><strong>Role-Based Access:</strong> Admin, Power User, and User tiers with distinct permissions</li>
              <li><strong>AI-First Processing:</strong> LLM-powered content extraction, summarization, and analysis</li>
              <li><strong>Asynchronous Workflows:</strong> Content scraping and analysis decoupled from user interaction</li>
              <li><strong>User-Scoped Data:</strong> Personal libraries, saved searches, and custom collections</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Entity Model</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Content Entities</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li><Badge variant="outline">Source</Badge> - Publisher metadata</li>
                  <li><Badge variant="outline">Newsletter</Badge> - Article content</li>
                  <li><Badge variant="outline">Topic</Badge> - Curated categories</li>
                  <li><Badge variant="outline">Company</Badge> - Healthcare organizations</li>
                </ul>
              </div>
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">User Entities</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li><Badge variant="outline">SavedSearch</Badge> - User search filters</li>
                  <li><Badge variant="outline">SavedSummary</Badge> - Generated summaries</li>
                  <li><Badge variant="outline">UserCustomPack</Badge> - Research collections</li>
                  <li><Badge variant="outline">WatchedTopic</Badge> - Topic subscriptions</li>
                </ul>
              </div>
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Operational Entities</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li><Badge variant="outline">ScrapeJob</Badge> - Source scraping status</li>
                  <li><Badge variant="outline">ScheduledScrape</Badge> - Automated jobs</li>
                  <li><Badge variant="outline">AITrendSuggestion</Badge> - AI-detected trends</li>
                </ul>
              </div>
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Analytics Entities</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li><Badge variant="outline">UserSearchActivity</Badge> - Search patterns</li>
                  <li><Badge variant="outline">AIContentPreference</Badge> - AI usage</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Data Relationships</h3>
            <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
{`Source (1) ────────→ (N) Newsletter
  │                      │
  │                      ├──→ Themes (extracted)
  │                      ├──→ Key Players (companies)
  │                      ├──→ M&A Activities
  │                      └──→ Funding Rounds

User (1) ──→ (N) SavedSearch
         ├──→ (N) SavedSummary
         ├──→ (N) UserCustomPack
         │            └──→ (N) UserCustomPackItem ──→ Newsletter
         ├──→ (N) WatchedTopic ──→ Topic
         └──→ (N) UserSearchActivity`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Frontend</h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>React 18</li>
                <li>React Router DOM</li>
                <li>TanStack React Query</li>
                <li>Tailwind CSS</li>
                <li>Shadcn/ui Components</li>
                <li>Framer Motion</li>
                <li>React Markdown</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Backend</h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>Base44 Platform</li>
                <li>Deno Runtime</li>
                <li>PostgreSQL (via Base44)</li>
                <li>Row Level Security</li>
                <li>Serverless Functions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">AI & Integrations</h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>Core.InvokeLLM</li>
                <li>Core.GenerateImage</li>
                <li>Core.UploadFile</li>
                <li>Core.ExtractDataFromUploadedFile</li>
                <li>AI Agents (4 configured)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Core Module Interactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold mb-1">Content Ingestion Flow</h4>
              <p className="text-sm text-slate-700">
                Admin creates Source → Source Scraper extracts URLs → analyzeNewsletterUrl function processes content 
                → LLM extracts structured data → Newsletter entity created with metadata
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold mb-1">User Discovery Flow</h4>
              <p className="text-sm text-slate-700">
                User browses Dashboard/Explore → Applies filters (topics, companies, dates) → Views newsletter details 
                → Saves search or generates summary → Activity logged for insights
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold mb-1">AI Agent Flow</h4>
              <p className="text-sm text-slate-700">
                User creates conversation → Agent receives context and tools → Agent executes entity CRUD operations 
                → Results streamed back to user → Conversation persisted
              </p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-semibold mb-1">Trend Discovery Flow</h4>
              <p className="text-sm text-slate-700">
                System analyzes recent newsletters → LLM identifies patterns → AITrendSuggestion entities created 
                → Admin reviews suggestions → Approved trends become Topics or prompts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}