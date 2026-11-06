import { createClerkClient } from '@clerk/backend';

export const MCP_RESOURCE_URL = process.env.KACH_MCP_RESOURCE_URL || 'https://tools.kachweddings.no/mcp';
export const MCP_REQUIRED_SCOPES = ['profile'];
export const MCP_RESOURCE_METADATA_URL = new URL(
  '/.well-known/oauth-protected-resource/mcp',
  MCP_RESOURCE_URL,
).href;

function clerkClient() {
  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.CLERK_API_URL,
  });
}

/**
 * Verify only Clerk OAuth access tokens issued for this exact MCP resource.
 * Session JWTs from the browser and tokens meant for other audiences fail.
 */
export async function authenticateMcpRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  try {
    const state = await clerkClient().authenticateRequest(
      new Request(MCP_RESOURCE_URL, { headers: { authorization: header } }),
      { acceptsToken: 'oauth_token', audience: MCP_RESOURCE_URL },
    );
    if (!state.isAuthenticated) return null;
    const auth = state.toAuth();
    if (!auth.userId || !auth.clientId || !auth.scopes) return null;
    return {
      ownerId: auth.userId,
      authInfo: {
        token,
        clientId: auth.clientId,
        scopes: auth.scopes,
        extra: { userId: auth.userId, verifiedBy: 'clerk' },
      },
    };
  } catch {
    return null;
  }
}
