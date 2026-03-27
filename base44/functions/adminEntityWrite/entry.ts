/**
 * adminEntityWrite — Backend function for admin-only entity mutations.
 * Routes create/update operations for Source, Company, Topic, LearningPack,
 * and AITrendSuggestion through asServiceRole to bypass RLS silent failures.
 *
 * Payload: { entity, operation, id?, data }
 *   entity    : "Source" | "Company" | "Topic" | "LearningPack" | "AITrendSuggestion"
 *   operation : "create" | "update"
 *   id        : string (required for update)
 *   data      : object
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ALLOWED_ENTITIES = ["Source", "Company", "Topic", "LearningPack", "AITrendSuggestion"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { entity, operation, id, data } = await req.json();

    if (!ALLOWED_ENTITIES.includes(entity)) {
      return Response.json({ error: `Entity "${entity}" is not allowed via this function` }, { status: 400 });
    }

    if (!['create', 'update'].includes(operation)) {
      return Response.json({ error: `Operation "${operation}" is not supported` }, { status: 400 });
    }

    if (operation === 'update' && !id) {
      return Response.json({ error: 'id is required for update operation' }, { status: 400 });
    }

    const entityStore = base44.asServiceRole.entities[entity];

    let result;
    if (operation === 'create') {
      result = await entityStore.create(data);
    } else {
      result = await entityStore.update(id, data);
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('adminEntityWrite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});