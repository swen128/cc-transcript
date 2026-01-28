/**
 * Unit tests for Zod schemas
 */

import { test, expect, describe } from "bun:test";
import {
  SessionDataSchema,
  ContentBlockSchema,
  TextBlockSchema,
  ThinkingBlockSchema,
  ImageBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
  MessageSchema,
  LoglineSchema,
} from "../src/schemas.ts";

describe("ContentBlockSchema", () => {
  test("validates text block", () => {
    const block = { type: "text", text: "Hello world" };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("text");
    }
  });

  test("validates thinking block", () => {
    const block = { type: "thinking", thinking: "I should analyze this..." };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("thinking");
    }
  });

  test("validates image block", () => {
    const block = {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("image");
    }
  });

  test("validates tool_use block", () => {
    const block = {
      type: "tool_use",
      id: "toolu_001",
      name: "Write",
      input: { file_path: "/test.txt", content: "hello" },
    };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("tool_use");
    }
  });

  test("validates tool_result block", () => {
    const block = {
      type: "tool_result",
      tool_use_id: "toolu_001",
      content: "File written successfully",
      is_error: false,
    };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("tool_result");
    }
  });

  test("validates tool_result with error", () => {
    const block = {
      type: "tool_result",
      tool_use_id: "toolu_001",
      content: "Permission denied",
      is_error: true,
    };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "tool_result") {
      expect(result.data.is_error).toBe(true);
    }
  });

  test("rejects invalid block type", () => {
    const block = { type: "invalid_type", data: "something" };
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(false);
  });

  test("rejects block missing required fields", () => {
    const block = { type: "text" }; // missing 'text' field
    const result = ContentBlockSchema.safeParse(block);
    expect(result.success).toBe(false);
  });
});

describe("MessageSchema", () => {
  test("validates message with string content", () => {
    const message = { role: "user", content: "Hello world" };
    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  test("validates message with array content", () => {
    const message = {
      role: "assistant",
      content: [
        { type: "text", text: "Here's my response" },
        { type: "tool_use", id: "tool1", name: "Write", input: {} },
      ],
    };
    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  test("validates message without role", () => {
    const message = { content: "Hello" };
    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });
});

describe("LoglineSchema", () => {
  test("validates user logline", () => {
    const logline = {
      type: "user",
      timestamp: "2025-12-24T10:00:00.000Z",
      message: { content: "Hello", role: "user" },
    };
    const result = LoglineSchema.safeParse(logline);
    expect(result.success).toBe(true);
  });

  test("validates assistant logline", () => {
    const logline = {
      type: "assistant",
      timestamp: "2025-12-24T10:00:05.000Z",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Hello!" }],
      },
    };
    const result = LoglineSchema.safeParse(logline);
    expect(result.success).toBe(true);
  });

  test("validates summary logline", () => {
    const logline = {
      type: "summary",
      summary: "Session summary here",
    };
    const result = LoglineSchema.safeParse(logline);
    expect(result.success).toBe(true);
  });

  test("validates logline with optional fields", () => {
    const logline = {
      type: "user",
      timestamp: "2025-12-24T10:00:00.000Z",
      message: { content: "Hello" },
      sessionId: "session_123",
      cwd: "/project",
      gitBranch: "main",
      isCompactSummary: true,
    };
    const result = LoglineSchema.safeParse(logline);
    expect(result.success).toBe(true);
  });

  test("rejects invalid logline type", () => {
    const logline = { type: "invalid", message: {} };
    const result = LoglineSchema.safeParse(logline);
    expect(result.success).toBe(false);
  });
});

describe("SessionDataSchema", () => {
  test("validates complete session", () => {
    const session = {
      loglines: [
        {
          type: "user",
          timestamp: "2025-12-24T10:00:00.000Z",
          message: { content: "Hello", role: "user" },
        },
        {
          type: "assistant",
          timestamp: "2025-12-24T10:00:05.000Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Hi there!" }],
          },
        },
      ],
    };
    const result = SessionDataSchema.safeParse(session);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.loglines).toHaveLength(2);
    }
  });

  test("validates empty session", () => {
    const session = { loglines: [] };
    const result = SessionDataSchema.safeParse(session);
    expect(result.success).toBe(true);
  });

  test("rejects session without loglines", () => {
    const session = {};
    const result = SessionDataSchema.safeParse(session);
    expect(result.success).toBe(false);
  });
});
