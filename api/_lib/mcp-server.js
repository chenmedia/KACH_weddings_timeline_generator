import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import {
  applyFoclImportSession,
  FoclImportError,
  listKachWeddings,
  previewFoclImport,
} from './focl-import.js';

const changeSchema = z.object({
  field: z.string(),
  label: z.string(),
  before: z.unknown(),
  after: z.unknown(),
});

const countSchema = z.object({
  partners: z.number(),
  vendors: z.number(),
  timelineItems: z.number(),
  shots: z.number(),
  documents: z.number(),
  checklistItems: z.number(),
});

function result(data, message) {
  return {
    structuredContent: data,
    content: [{ type: 'text', text: message }],
  };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : 'Unknown MCP error';
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

export function createKachMcpServer({ db, schema, ownerId }) {
  const server = new McpServer(
    { name: 'kach-weddings', version: '1.0.0' },
    { capabilities: { tools: {} }, maxToolInputElements: 2500 },
  );

  server.registerTool(
    'list_kach_weddings',
    {
      title: 'List KACH weddings',
      description:
        'Lists the authenticated photographer’s KACH wedding projects and FOCL sync status. Use this first to identify the exact KACH timelineId before importing FOCL data.',
      inputSchema: {},
      outputSchema: {
        weddings: z.array(
          z.object({
            id: z.string(),
            couple: z.string(),
            weddingDate: z.string(),
            location: z.string().nullable(),
            status: z.string().nullable(),
            projectVersion: z.number(),
            profileVersion: z.number(),
            foclSourceId: z.string().nullable(),
            syncStatus: z.string(),
            lastSyncedAt: z.string().nullable(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const weddings = await listKachWeddings(db, schema, ownerId);
        return result({ weddings }, `Found ${weddings.length} KACH wedding projects.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'preview_focl_import',
    {
      title: 'Preview FOCL import',
      description:
        'Prepares a safe, expiring preview of FOCL wedding data against one KACH project. Obtain the wedding data from the connected FOCL Wedding Planner first. This does not change the client card or timeline. Show the returned changes to the user before applying them.',
      inputSchema: {
        timelineId: z.string().uuid().describe('Exact KACH wedding id from list_kach_weddings'),
        foclWedding: z
          .record(z.string(), z.unknown())
          .describe('Wedding data returned by the connected FOCL Wedding Planner'),
      },
      outputSchema: {
        sessionId: z.string().uuid(),
        expiresAt: z.string(),
        wedding: z.object({
          id: z.string(),
          couple: z.string(),
          weddingDate: z.string(),
        }),
        changes: z.array(changeSchema),
        counts: countSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ timelineId, foclWedding }) => {
      try {
        const preview = await previewFoclImport(db, schema, {
          ownerId,
          timelineId,
          payload: foclWedding,
        });
        const message = preview.changes.length
          ? `Preview ready with ${preview.changes.length} changes. Ask the user to approve before applying session ${preview.sessionId}.`
          : 'Preview ready. FOCL and KACH already match; no data changes were found.';
        return result(preview, message);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'apply_focl_import',
    {
      title: 'Apply approved FOCL import',
      description:
        'Applies one previously previewed FOCL import to KACH. Call only after the user explicitly approves the displayed preview. The operation creates a restorable version and activity entry, rejects stale previews, and can never permanently delete data.',
      inputSchema: {
        sessionId: z.string().uuid().describe('Session id returned by preview_focl_import'),
      },
      outputSchema: {
        sessionId: z.string().uuid(),
        timelineId: z.string().uuid(),
        profileVersion: z.number(),
        project: z.object({
          couple: z.string(),
          wdate: z.string(),
          bdate: z.string().nullable(),
          place: z.string().nullable(),
          projectVersion: z.number(),
        }),
        imported: countSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ sessionId }) => {
      try {
        const applied = await applyFoclImportSession(db, schema, { ownerId, sessionId });
        return result(
          {
            sessionId: applied.sessionId,
            timelineId: applied.timelineId,
            profileVersion: applied.profileVersion,
            project: applied.project,
            imported: applied.imported,
          },
          `FOCL data is now synced to ${applied.project.couple}. A restorable KACH version was saved first.`,
        );
      } catch (error) {
        if (error instanceof FoclImportError) return errorResult(error);
        return errorResult(error);
      }
    },
  );

  return server;
}
