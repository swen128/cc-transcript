/**
 * Basic setup tests
 */

import { test, expect, describe } from "bun:test";
import { SessionDataSchema, ContentBlockSchema } from "../src/schemas.ts";

describe("Project Setup", () => {
  test("Zod is imported correctly", () => {
    expect(SessionDataSchema).toBeDefined();
    expect(ContentBlockSchema).toBeDefined();
  });

  test("SessionDataSchema validates sample data", () => {
    const sampleData = {
      loglines: [
        {
          type: "user",
          timestamp: "2025-12-24T10:00:00.000Z",
          message: {
            content: "Hello world",
            role: "user",
          },
        },
      ],
    };

    const result = SessionDataSchema.safeParse(sampleData);
    expect(result.success).toBe(true);
  });

  test("ContentBlockSchema validates text block", () => {
    const textBlock = {
      type: "text",
      text: "Hello world",
    };

    const result = ContentBlockSchema.safeParse(textBlock);
    expect(result.success).toBe(true);
  });

  test("ContentBlockSchema validates tool_use block", () => {
    const toolUseBlock = {
      type: "tool_use",
      id: "toolu_001",
      name: "Write",
      input: {
        file_path: "/test.txt",
        content: "test content",
      },
    };

    const result = ContentBlockSchema.safeParse(toolUseBlock);
    expect(result.success).toBe(true);
  });
});
