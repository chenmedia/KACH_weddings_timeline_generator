import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getDb, schema } from './_lib/db.js';
import { authenticateMcpRequest, MCP_REQUIRED_SCOPES, MCP_RESOURCE_METADATA_URL } from './_lib/mcp-auth.js';
import { createKachMcpServer } from './_lib/mcp-server.js';
import { withErrorCapture } from './_lib/observability.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, WWW-Authenticate');
}

function setAuthChallenge(res, options = {}) {
  const parameters = [
    `resource_metadata="${MCP_RESOURCE_METADATA_URL}"`,
    `scope="${MCP_REQUIRED_SCOPES.join(' ')}"`,
  ];
  if (options.error) parameters.push(`error="${options.error}"`);
  res.setHeader('WWW-Authenticate', `Bearer ${parameters.join(', ')}`);
}

async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    setAuthChallenge(res);
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST for this stateless MCP.' },
      id: null,
    });
  }

  const auth = await authenticateMcpRequest(req);
  if (!auth) {
    setAuthChallenge(res);
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    });
  }
  const missingScopes = MCP_REQUIRED_SCOPES.filter((scope) => !auth.authInfo.scopes.includes(scope));
  if (missingScopes.length) {
    setAuthChallenge(res, { error: 'insufficient_scope' });
    return res.status(403).json({
      jsonrpc: '2.0',
      error: { code: -32003, message: 'Insufficient OAuth scope' },
      id: null,
    });
  }
  req.auth = auth.authInfo;

  const server = createKachMcpServer({ db: getDb(), schema, ownerId: auth.ownerId });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } finally {
    await transport.close();
    await server.close();
  }
}

export default withErrorCapture(handler);
