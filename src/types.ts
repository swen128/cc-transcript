/**
 * TypeScript type definitions for cc-transcript
 */

// Re-export Zod-inferred types
export type {
  TextBlock,
  ThinkingBlock,
  ImageBlock,
  ToolUseBlock,
  ToolResultBlock,
  ContentBlock,
  Message,
  Logline,
  SessionData,
} from "./schemas.js";

/**
 * Options for rendering a transcript
 */
export interface RenderOptions {
  /** GitHub repository (owner/name) for commit links */
  githubRepo?: string;
}

/**
 * Output from rendering a transcript
 */
export interface TranscriptOutput {
  /** Map of filename to HTML content */
  files: Map<string, string>;

  /** Write all files to a directory */
  writeTo(dir: string): Promise<void>;
}

/**
 * Statistics about tool usage in a conversation
 */
export interface ToolCounts {
  [toolName: string]: number;
}

/**
 * Information about a git commit found in tool output
 */
export interface CommitInfo {
  hash: string;
  message: string;
  timestamp: string;
}

/**
 * Stats extracted from analyzing a conversation
 */
export interface ConversationStats {
  toolCounts: ToolCounts;
  longTexts: string[];
  commits: CommitInfo[];
}

/**
 * Grouped conversation (user prompt + assistant responses)
 */
export interface Conversation {
  userText: string;
  timestamp: string;
  messages: Array<{
    type: "user" | "assistant";
    messageJson: string;
    timestamp: string;
  }>;
  isContinuation: boolean;
}

/**
 * Data for a single page in the transcript
 */
export interface PageData {
  pageNum: number;
  totalPages: number;
  conversations: Conversation[];
}

/**
 * Constants
 */
export const PROMPTS_PER_PAGE = 5;
export const LONG_TEXT_THRESHOLD = 300;
