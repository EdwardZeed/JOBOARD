import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServiceClient } from '@joboard/db';
import { createMcpServer } from '@joboard/mcp-tools';

export const runtime = 'nodejs';

// Network-reachable MCP endpoint for the cloud-scheduled agentic loop (it
// can't reach the local stdio server in apps/mcp-server). Same tool set,
// served over the MCP Streamable HTTP transport. Bearer-token gated — this
// is independent of any future dashboard login: that protects browser
// sessions, this protects machine-to-machine calls, and both are needed.
function isAuthorized(request: Request): boolean {
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) {
    throw new Error('MCP_AUTH_TOKEN is not set — refusing to serve the MCP endpoint unauthenticated.');
  }
  const authHeader = request.headers.get('authorization') ?? '';
  const [scheme, presented] = authHeader.split(' ');
  return scheme === 'Bearer' && presented === token;
}

function unauthorized(): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null },
    { status: 401 }
  );
}

async function handle(request: Request): Promise<Response> {
  try {
    if (!isAuthorized(request)) return unauthorized();
  } catch (error) {
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32000, message: (error as Error).message }, id: null },
      { status: 500 }
    );
  }

  // Fresh server + transport per request (stateless mode) — matches the
  // request-scoped lifecycle of a serverless function, no session to leak
  // across invocations.
  const db = createServiceClient();
  const server = createMcpServer(db);
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
