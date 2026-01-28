/**
 * Parse Claude Code session files (JSON and JSONL formats)
 */

import { SessionDataSchema, LoglineSchema, type SessionData, type Logline } from "./schemas.ts";

/**
 * Parse a session file and return validated session data
 *
 * Supports both JSON and JSONL formats.
 * - JSON files should have a `loglines` array at the root
 * - JSONL files have one JSON object per line
 */
export async function parseSessionFile(filePath: string): Promise<SessionData> {
  const file = Bun.file(filePath);
  const content = await file.text();

  // Detect format based on file extension or content
  if (filePath.endsWith(".jsonl") || isJsonl(content)) {
    return parseJsonl(content);
  } else {
    return parseJson(content);
  }
}

/**
 * Check if content appears to be JSONL format
 */
function isJsonl(content: string): boolean {
  const firstLine = content.split("\n")[0]?.trim() ?? "";
  if (!firstLine) return false;

  // JSONL files typically don't start with { "loglines":
  try {
    const parsed = JSON.parse(firstLine);
    // If first line parses and doesn't have loglines, it's JSONL
    return !("loglines" in parsed);
  } catch {
    return false;
  }
}

/**
 * Parse JSON format session file
 */
function parseJson(content: string): SessionData {
  const data = JSON.parse(content);
  return SessionDataSchema.parse(data);
}

/**
 * Parse JSONL format session file
 */
function parseJsonl(content: string): SessionData {
  const lines = content.split("\n");
  const loglines: Logline[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const obj = JSON.parse(trimmed);
      const parsed = LoglineSchema.safeParse(obj);

      if (parsed.success) {
        // Only include user and assistant messages
        if (parsed.data.type === "user" || parsed.data.type === "assistant") {
          loglines.push(parsed.data);
        }
      }
    } catch {
      // Skip invalid lines
      continue;
    }
  }

  return { loglines };
}

/**
 * Extract plain text from message content
 *
 * Handles both string content (older format) and array content (newer format)
 */
export function extractTextFromContent(content: string | unknown[]): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        texts.push(block.text);
      }
    }
    return texts.join(" ").trim();
  }

  return "";
}
