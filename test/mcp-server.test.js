import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createKachMcpServer } from '../api/_lib/mcp-server.js';

describe('KACH MCP server', () => {
  let client;
  let server;

  afterEach(async () => {
    await client?.close();
    await server?.close();
  });

  it('publishes the safe FOCL preview and apply workflow', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createKachMcpServer({ db: {}, schema: {}, ownerId: 'user_test' });
    client = new Client({ name: 'kach-test', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual([
      'list_kach_weddings',
      'preview_focl_import',
      'apply_focl_import',
    ]);
    expect(tools.find((tool) => tool.name === 'list_kach_weddings').annotations.readOnlyHint).toBe(true);
    expect(tools.find((tool) => tool.name === 'apply_focl_import').annotations.destructiveHint).toBe(false);
    expect(
      tools.find((tool) => tool.name === 'preview_focl_import').inputSchema.properties.timelineId.format,
    ).toBe('uuid');
  });
});
