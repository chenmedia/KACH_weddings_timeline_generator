import { generateClerkProtectedResourceMetadata } from '@clerk/mcp-tools/server';
import { getClerkPublishableKey, MCP_REQUIRED_SCOPES, MCP_RESOURCE_URL } from './_lib/mcp-auth.js';
import { withErrorCapture } from './_lib/observability.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const publishableKey = getClerkPublishableKey();
  if (!publishableKey) return res.status(503).json({ error: 'clerk_not_configured' });
  return res.status(200).json(
    generateClerkProtectedResourceMetadata({
      publishableKey,
      resourceUrl: MCP_RESOURCE_URL,
      properties: {
        scopes_supported: MCP_REQUIRED_SCOPES,
        service_documentation: 'https://tools.kachweddings.no',
      },
    }),
  );
}

export default withErrorCapture(handler);
