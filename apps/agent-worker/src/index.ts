import { query } from '@anthropic-ai/claude-agent-sdk';
import { loadRoutinePrompt } from './prompt.js';

const MCP_URL = requireEnv('MCP_URL');
const MCP_TOKEN = requireEnv('MCP_TOKEN');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main() {
  const prompt = loadRoutinePrompt();

  const q = query({
    prompt,
    options: {
      model: 'claude-sonnet-5',
      mcpServers: {
        joboard: {
          type: 'http',
          url: MCP_URL,
          headers: { Authorization: `Bearer ${MCP_TOKEN}` },
        },
      },
      allowedTools: ['mcp__joboard__*', 'WebSearch', 'WebFetch'],
    },
  });

  let mcpFailed = false;
  let sawSuccess = false;

  for await (const message of q) {
    if (message.type === 'system' && message.subtype === 'init') {
      const bad = message.mcp_servers.filter(
        (s) => s.status === 'failed' || s.status === 'needs-auth'
      );
      if (bad.length > 0) {
        console.error('[agent-worker] MCP server unreachable, aborting:', bad);
        mcpFailed = true;
        break;
      }
      console.log('[agent-worker] MCP connected:', message.mcp_servers);
    } else if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') console.log('[think]', block.text);
        else if (block.type === 'tool_use') console.log('[tool]', block.name);
      }
    } else if (message.type === 'result') {
      console.log('[result]', message.subtype);
      sawSuccess = message.subtype === 'success';
    }
  }

  if (mcpFailed || !sawSuccess) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[agent-worker] crashed:', err);
  process.exitCode = 1;
});
