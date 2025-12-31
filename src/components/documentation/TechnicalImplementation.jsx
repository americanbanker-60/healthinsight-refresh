import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Database, Lock, Zap } from "lucide-react";

export default function TechnicalImplementation() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Models & Schemas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Critical Entities</h3>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded">
                <h4 className="font-semibold text-sm mb-2">Source</h4>
                <pre className="text-xs overflow-x-auto">{`{
  "name": "string",                    // Publisher name
  "description": "string",             // Brief description
  "url": "string",                     // Source website
  "category": "enum",                  // Investment Banking, Tech, Finance, etc.
  "is_deleted": "boolean"              // Soft delete flag
}`}</pre>
              </div>

              <div className="bg-slate-50 p-3 rounded">
                <h4 className="font-semibold text-sm mb-2">Newsletter</h4>
                <pre className="text-xs overflow-x-auto">{`{
  "title": "string",
  "source_name": "string",
  "source_url": "string",
  "publication_date": "date",          // Extracted actual pub date
  "date_added_to_app": "datetime",     // When added to system
  "publication_date_confidence": "enum", // high/medium/low/unknown
  "publication_date_source": "string", // Where extracted from
  "tldr": "string",                    // 2-3 sentence summary
  "key_takeaways": ["string"],
  "key_statistics": [{
    "figure": "string",
    "context": "string"
  }],
  "recommended_actions": ["string"],
  "themes": [{
    "theme": "string",
    "description": "string"
  }],
  "ma_activities": [{
    "acquirer": "string",
    "target": "string",
    "deal_value": "string",
    "description": "string"
  }],
  "funding_rounds": [{
    "company": "string",
    "amount": "string",
    "round_type": "string",
    "description": "string"
  }],
  "key_players": ["string"],           // Companies mentioned
  "summary": "string",                 // Executive summary
  "sentiment": "enum"                  // positive/neutral/negative/mixed
}`}</pre>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Row Level Security Patterns</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-2">
              <p><strong>User-Scoped Entities:</strong></p>
              <pre>{`"rls": {
  "create": { "created_by": "{{user.email}}" },
  "read": { "created_by": "{{user.email}}" },
  "update": { "created_by": "{{user.email}}" },
  "delete": { "created_by": "{{user.email}}" }
}`}</pre>
              <p className="mt-2"><strong>Role-Based Entities:</strong></p>
              <pre>{`"rls": {
  "create": { "user_condition": { "role": "admin" } },
  "read": { "user_condition": { "role": { "$in": ["admin", "power", "user"] } } },
  "update": { "user_condition": { "role": "admin" } },
  "delete": { "user_condition": { "role": "admin" } }
}`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Backend Functions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Core Functions</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="font-semibold text-sm">analyzeNewsletterUrl</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Primary content ingestion function. Fetches URL, extracts structured data via LLM, creates Newsletter entity.
                </p>
                <div className="bg-slate-50 p-2 rounded text-xs mt-2">
                  <p><strong>Input:</strong> {"{ url: string, source_name?: string }"}</p>
                  <p><strong>Output:</strong> {"{ newsletter_id: string, status: string }"}</p>
                  <p><strong>LLM Schema:</strong> Enforces Newsletter entity schema for consistent extraction</p>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-semibold text-sm">scrapeSource</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Discovers newsletter URLs from source website, creates ScrapeJob record, processes each URL.
                </p>
                <div className="bg-slate-50 p-2 rounded text-xs mt-2">
                  <p><strong>Input:</strong> {"{ source_id: string }"}</p>
                  <p><strong>Output:</strong> {"{ job_id: string, newsletters_found: number }"}</p>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-3">
                <h4 className="font-semibold text-sm">extractPublicationDate</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Standalone date extraction with confidence scoring and source attribution.
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-3">
                <h4 className="font-semibold text-sm">exportNewsletterPDF</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Generates PDF from newsletter content using jsPDF. Returns binary response.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Function Development Pattern</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-2">
              <pre>{`import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // User-scoped operations
    const data = await base44.entities.SomeEntity.list();

    // Service-scoped operations (admin privileges)
    const adminData = await base44.asServiceRole.entities.SomeEntity.list();

    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">LLM Integration Patterns</h3>
            <div className="bg-slate-50 p-3 rounded text-xs">
              <pre>{`const result = await base44.integrations.Core.InvokeLLM({
  prompt: "Extract key information from this healthcare newsletter...",
  add_context_from_internet: false,
  response_json_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      themes: { 
        type: "array", 
        items: { 
          type: "object",
          properties: {
            theme: { type: "string" },
            description: { type: "string" }
          }
        }
      }
    }
  }
});`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Frontend Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Component Organization</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-2">
              <p><strong>pages/</strong> - Top-level routable pages (flat structure, no nesting)</p>
              <p><strong>components/</strong> - Reusable components (can have subfolders)</p>
              <p className="ml-4">• admin/ - Admin-only components</p>
              <p className="ml-4">• auth/ - Authentication utilities</p>
              <p className="ml-4">• common/ - Shared UI components</p>
              <p className="ml-4">• dashboard/ - Dashboard-specific components</p>
              <p className="ml-4">• documentation/ - Documentation sections</p>
              <p className="ml-4">• explore/ - Search and filter components</p>
              <p className="ml-4">• library/ - User workspace components</p>
              <p className="ml-4">• trends/ - Trend analysis components</p>
              <p><strong>Layout.js</strong> - App-wide layout wrapper</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">State Management</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p><strong>React Query:</strong> Server state, caching, cache invalidation</p>
              <p><strong>useState:</strong> Local component state</p>
              <p><strong>localStorage:</strong> Filter persistence, user preferences</p>
              <p><strong>URL Parameters:</strong> Page-specific state (search terms, IDs)</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Data Fetching Pattern</h3>
            <div className="bg-slate-50 p-3 rounded text-xs">
              <pre>{`const { data: newsletters = [], isLoading } = useQuery({
  queryKey: ['newsletters'],
  queryFn: () => base44.entities.Newsletter.list("-publication_date", 500),
  initialData: [],
});

const createMutation = useMutation({
  mutationFn: (data) => base44.entities.Newsletter.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    toast.success("Created successfully");
  },
});`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Component Decomposition Guidelines</h3>
            <ul className="text-sm text-slate-700 space-y-1 ml-4 list-disc">
              <li>Files over 400 lines should be split</li>
              <li>Extract upload logic into dedicated managers</li>
              <li>Separate CRUD operations into list/editor components</li>
              <li>Create focused components for complex features</li>
              <li>Use composition over prop drilling</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security Implementation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Authentication Flow</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-1">
              <p>1. User authenticates via Base44 auth system</p>
              <p>2. JWT token stored in httpOnly cookie</p>
              <p>3. Frontend calls base44.auth.me() to get user context</p>
              <p>4. RoleGuard component enforces role-based page access</p>
              <p>5. Backend functions validate user via createClientFromRequest(req)</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">RLS Policy Enforcement</h3>
            <div className="text-sm text-slate-700 space-y-2">
              <p>User entity has built-in security rules:</p>
              <ul className="ml-4 list-disc text-xs">
                <li>Only admin users can list, update, or delete other users</li>
                <li>Regular users can only view and update their own record</li>
                <li>Cannot be overridden</li>
              </ul>
              <p className="mt-2">Custom entities use RLS JSON schema to define access:</p>
              <ul className="ml-4 list-disc text-xs">
                <li>User-scoped: created_by matches current user email</li>
                <li>Role-based: user_condition checks role field</li>
                <li>Combined: Both conditions can be used together</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Admin-Only Function Pattern</h3>
            <div className="bg-slate-50 p-3 rounded text-xs">
              <pre>{`const base44 = createClientFromRequest(req);
const user = await base44.auth.me();

if (user?.role !== 'admin') {
  return Response.json(
    { error: 'Forbidden: Admin access required' }, 
    { status: 403 }
  );
}

// Proceed with admin-only operations`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}