import { fetchClerkAuthorizationServerMetadata } from '@clerk/mcp-tools/server';
import { withErrorCapture } from './_lib/observability.js';

let cachedMetadata;

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
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return res.status(503).json({ error: 'clerk_not_configured' });
  cachedMetadata ||= await fetchClerkAuthorizationServerMetadata({ publishableKey });
  return res.status(200).json(cachedMetadata);
}

export default withErrorCapture(handler);
