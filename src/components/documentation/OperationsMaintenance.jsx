import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, AlertTriangle, Wrench, GitBranch } from "lucide-react";

export default function OperationsMaintenance() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Environment Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Pre-Populated Environment Variables</h3>
            <div className="bg-slate-50 p-3 rounded text-xs">
              <p className="mb-2">Automatically available in all environments:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li><code>BASE44_APP_ID</code> - Application identifier</li>
              </ul>
              <p className="mt-3 text-amber-700">
                <strong>Note:</strong> Never request BASE44_SERVICE_TOKEN or BASE44_SERVICE_ROLE_KEY from users. 
                Use createClientFromRequest(req) for auth.
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Required API Keys (Set via Dashboard)</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p>No external API keys required. All AI features use Base44 Core integrations.</p>
              <p className="text-xs text-slate-600">
                If integrating external services in the future, set environment variables via Dashboard → Settings → Environment Variables
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Deployment</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-2">
              <p><strong>Platform:</strong> Base44 (automatic deployment)</p>
              <p><strong>Frontend:</strong> React SPA served via CDN</p>
              <p><strong>Backend:</strong> Deno functions on serverless infrastructure</p>
              <p><strong>Database:</strong> PostgreSQL managed by Base44</p>
              <p><strong>Assets:</strong> Supabase storage for uploaded files</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Maintenance Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Content Management Tasks</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="font-semibold text-sm">Adding New Sources</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Two-step process: Create source record → Run scraper to fetch newsletters
                </p>
                <ol className="text-xs text-slate-700 space-y-1 ml-4 list-decimal">
                  <li>Navigate to Manage Sources (Admin only)</li>
                  <li>Use "Add Source", "Paste URLs", or "CSV Upload"</li>
                  <li>Assign appropriate category</li>
                  <li>Go to Admin Dashboard → Source Scraper</li>
                  <li>Select source and run scraper</li>
                  <li>Monitor ScrapeJob status</li>
                </ol>
              </div>

              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-semibold text-sm">Content Cleanup</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Removing duplicate or invalid newsletters:
                </p>
                <ol className="text-xs text-slate-700 space-y-1 ml-4 list-decimal">
                  <li>Navigate to Cleanup page (Admin only)</li>
                  <li>Review newsletters flagged for cleanup</li>
                  <li>Bulk delete or individual removal</li>
                  <li>Note: No soft delete for newsletters (permanent removal)</li>
                </ol>
              </div>

              <div className="border-l-4 border-purple-500 pl-3">
                <h4 className="font-semibold text-sm">Publication Date Migration</h4>
                <p className="text-xs text-slate-700 mb-1">
                  Updating publication dates for existing newsletters:
                </p>
                <ol className="text-xs text-slate-700 space-y-1 ml-4 list-decimal">
                  <li>Navigate to PublicationDateMigration page</li>
                  <li>Run migration to extract dates from existing content</li>
                  <li>Review confidence scores</li>
                  <li>Update low-confidence entries manually if needed</li>
                </ol>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">User Management</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-2">
              <p><strong>Inviting Users:</strong></p>
              <pre>{`await base44.users.inviteUser("email@example.com", "user|power|admin")`}</pre>
              <p className="mt-2"><strong>Role Constraints:</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Admin can invite any role</li>
                <li>Power and User can only invite "user" role</li>
                <li>Users receive email invitation to set password</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Database Maintenance</h3>
            <div className="text-sm text-slate-700 space-y-2">
              <p><strong>Source Database Fix:</strong> Diagnostic tool for RLS issues (components/admin/SourceDatabaseFix)</p>
              <p><strong>Entity Management:</strong> All CRUD operations via Base44 SDK</p>
              <p><strong>Backups:</strong> Managed by Base44 platform (automatic)</p>
              <p><strong>Migrations:</strong> Entity schema changes auto-migrate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Extensibility Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Adding New Entities</h3>
            <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
              <li>Create JSON schema in <code>entities/EntityName.json</code></li>
              <li>Define properties, types, and required fields</li>
              <li>Add RLS policies if needed</li>
              <li>Entity automatically available via <code>base44.entities.EntityName</code></li>
              <li>Create UI components for CRUD operations</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Adding New AI Agents</h3>
            <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
              <li>Create JSON config in <code>agents/agent_name.json</code></li>
              <li>Define description, instructions, and tool_configs</li>
              <li>Specify entity access (CRUD operations)</li>
              <li>Add to AgentWorkspace UI</li>
              <li>Optional: Configure WhatsApp greeting</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Adding Backend Functions</h3>
            <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
              <li>Create function file in <code>functions/functionName.js</code></li>
              <li>Use Deno.serve() wrapper</li>
              <li>Import Base44 SDK: <code>npm:@base44/sdk@0.8.6</code></li>
              <li>Implement createClientFromRequest() pattern</li>
              <li>Function automatically deployed and accessible</li>
              <li>Call from frontend: <code>base44.functions.invoke('functionName', params)</code></li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Integrating External Services</h3>
            <div className="bg-slate-50 p-3 rounded text-xs space-y-2">
              <p><strong>Method 1: Backend Functions with API Keys</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Set API key via Dashboard → Settings → Environment Variables</li>
                <li>Access in function: <code>Deno.env.get("API_KEY_NAME")</code></li>
                <li>Make external API calls from backend function</li>
              </ul>
              <p className="mt-2"><strong>Method 2: App Connectors (OAuth)</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Request OAuth via request_oauth_authorization tool</li>
                <li>User authorizes with their account</li>
                <li>Access token available via <code>base44.asServiceRole.connectors.getAccessToken()</code></li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Custom Components</h3>
            <div className="text-sm text-slate-700 space-y-2">
              <p>Component creation guidelines:</p>
              <ul className="ml-4 list-disc text-xs space-y-1">
                <li>Keep components under 400 lines</li>
                <li>Extract complex logic into utility functions</li>
                <li>Use shadcn/ui for consistent styling</li>
                <li>Implement responsive design by default</li>
                <li>Add loading and error states</li>
                <li>Use React Query for server state</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Known Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Performance</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Client-side filtering becomes slow with 1000+ newsletters</li>
              <li>No pagination UI (relies on query limits)</li>
              <li>All results loaded at once (no lazy loading)</li>
              <li>Filter persistence limited to single device (localStorage)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-1">Content Ingestion</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>No automatic duplicate URL detection</li>
              <li>Manual two-step process (create source → scrape content)</li>
              <li>No real-time monitoring or webhooks</li>
              <li>Scheduled scraping configured but not active</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-1">User Experience</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>No email notifications for watched topics</li>
              <li>TopicAlert entities created but not delivered</li>
              <li>No collaborative features (sharing packs)</li>
              <li>No user annotations or comments</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-1">Data Quality</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Publication date extraction may have low confidence</li>
              <li>Depends on source website structure</li>
              <li>Manual cleanup required for problematic content</li>
              <li>No content moderation or approval workflow</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Troubleshooting Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Sources not appearing in sidebar</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Check RLS policies on Source entity</li>
              <li>Use SourceDatabaseFix component for diagnosis</li>
              <li>Verify is_deleted flag is false</li>
              <li>Confirm query uses list() not filter({})</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Newsletters not displaying</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Verify newsletters were created (check database)</li>
              <li>Check filter state (may be filtering out all results)</li>
              <li>Clear localStorage filters</li>
              <li>Verify publication_date field populated</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Newsletter analysis failing</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Check URL accessibility (paywall, login required)</li>
              <li>Review backend function logs</li>
              <li>Verify LLM integration is operational</li>
              <li>Test with simple public URL first</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Agent not responding</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Verify agent configuration exists in agents/ folder</li>
              <li>Check tool_configs grant necessary entity access</li>
              <li>Review conversation subscription</li>
              <li>Check browser console for errors</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Role permissions not working</h4>
            <ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">
              <li>Verify user.role field in User entity</li>
              <li>Check RoleGuard implementation on page</li>
              <li>Confirm entity RLS policies match role</li>
              <li>Verify base44.auth.me() returns user with role</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}