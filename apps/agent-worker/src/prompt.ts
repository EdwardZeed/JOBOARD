import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pulls the "## Prompt" fenced code block out of docs/routine-prompt.md so
 * that document stays the single source of truth for the pipeline's
 * instructions — this file just extracts it, it doesn't duplicate it.
 */
export function loadRoutinePrompt(): string {
  const docPath = join(__dirname, '../../../docs/routine-prompt.md');
  const doc = readFileSync(docPath, 'utf-8');
  const match = doc.match(/## Prompt\s*\n```\s*\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error(`Could not find a "## Prompt" fenced code block in ${docPath}`);
  }
  return match[1];
}
