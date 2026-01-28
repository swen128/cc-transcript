/**
 * Zod schemas for Claude Code session data validation
 */

import { z } from "zod";

// ============================================
// Content Block Schemas
// ============================================

/**
 * Text content block - regular assistant text
 */
export const TextBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

/**
 * Thinking content block - internal reasoning
 */
export const ThinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
});

/**
 * Image content block - base64 encoded image
 */
export const ImageSourceSchema = z.object({
  type: z.literal("base64").optional(),
  media_type: z.string(),
  data: z.string(),
});

export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  source: ImageSourceSchema,
});

/**
 * Tool use content block - Claude calling a tool
 */
export const ToolInputSchema = z.record(z.string(), z.unknown());

export const ToolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: ToolInputSchema,
});

/**
 * Tool result content block - result of a tool call
 */
export const ToolResultBlockSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string().optional(),
  content: z.union([z.string(), z.array(z.unknown())]),
  is_error: z.boolean().optional(),
});

/**
 * Union of all content block types
 */
export const ContentBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  ThinkingBlockSchema,
  ImageBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
]);

// ============================================
// Message Schemas
// ============================================

/**
 * Message content - can be string or array of content blocks
 */
export const MessageContentSchema = z.union([
  z.string(),
  z.array(ContentBlockSchema),
]);

/**
 * Message structure
 */
export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]).optional(),
  content: MessageContentSchema,
});

// ============================================
// Logline Schemas
// ============================================

/**
 * Single logline entry in a session
 * Supports two formats:
 * - Legacy: { type, message: { content } }
 * - Current: { type, content }
 */
export const LoglineSchema = z.object({
  type: z.enum(["user", "assistant", "summary", "tool_use", "tool_result"]),
  timestamp: z.string().optional(),
  message: MessageSchema.optional(),
  content: MessageContentSchema.optional(),
  isCompactSummary: z.boolean().optional(),
  sessionId: z.string().optional(),
  cwd: z.string().optional(),
  gitBranch: z.string().optional(),
  uuid: z.string().optional(),
  summary: z.string().optional(),
  leafUuid: z.string().optional(),
  isMeta: z.boolean().optional(),
  toolName: z.string().optional(),
  toolUseId: z.string().optional(),
  toolInput: z.unknown().optional(),
  isError: z.boolean().optional(),
});

/**
 * Complete session data structure (JSON format)
 */
export const SessionDataSchema = z.object({
  loglines: z.array(LoglineSchema),
});

// ============================================
// Type Exports
// ============================================

export type TextBlock = z.infer<typeof TextBlockSchema>;
export type ThinkingBlock = z.infer<typeof ThinkingBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;
export type ToolUseBlock = z.infer<typeof ToolUseBlockSchema>;
export type ToolResultBlock = z.infer<typeof ToolResultBlockSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Logline = z.infer<typeof LoglineSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
