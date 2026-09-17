#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServiceClient } from '@joboard/db';
import { createMcpServer } from '@joboard/mcp-tools';

const db = createServiceClient();
const server = createMcpServer(db);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('joboard-mcp failed to start:', error);
  process.exit(1);
});
