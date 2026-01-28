/**
 * Unit tests for JSON/JSONL parsing
 */

import { test, expect, describe } from "bun:test";
import { parseSessionFile } from "../src/parse.ts";
import { join } from "path";

const fixturesDir = join(import.meta.dir, "..", "fixtures", "input");

describe("parseSessionFile", () => {
  test("parses JSON file correctly", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    expect(session).toBeDefined();
    expect(session.loglines).toBeDefined();
    expect(Array.isArray(session.loglines)).toBe(true);
    expect(session.loglines.length).toBeGreaterThan(0);
  });

  test("parses JSONL file correctly", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.jsonl"));
    
    expect(session).toBeDefined();
    expect(session.loglines).toBeDefined();
    expect(Array.isArray(session.loglines)).toBe(true);
    expect(session.loglines.length).toBeGreaterThan(0);
  });

  test("JSON file contains expected loglines", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    // Check first user message
    const firstLogline = session.loglines[0];
    expect(firstLogline).toBeDefined();
    if (firstLogline) {
      expect(firstLogline.type).toBe("user");
      expect(firstLogline.timestamp).toBeDefined();
      expect(firstLogline.message).toBeDefined();
    }
  });

  test("JSON file has correct structure for various block types", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    // Find an assistant message with content blocks
    const assistantLogline = session.loglines.find(l => l.type === "assistant");
    expect(assistantLogline).toBeDefined();
    expect(assistantLogline?.message).toBeDefined();
    
    const content = assistantLogline?.message?.content;
    expect(Array.isArray(content)).toBe(true);
  });

  test("throws error for non-existent file", async () => {
    await expect(
      parseSessionFile(join(fixturesDir, "non_existent.json"))
    ).rejects.toThrow();
  });

  test("filters loglines correctly for user and assistant types", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    // All loglines should be user or assistant (summary is filtered out in JSONL)
    for (const logline of session.loglines) {
      expect(["user", "assistant", "summary"]).toContain(logline.type);
    }
  });
});

describe("parseSessionFile content validation", () => {
  test("tool_use blocks have required fields", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    for (const logline of session.loglines) {
      if (!logline.message?.content || !Array.isArray(logline.message.content)) continue;
      
      for (const block of logline.message.content) {
        if (typeof block === 'object' && block !== null && 'type' in block && block.type === "tool_use") {
          expect(block).toHaveProperty("id");
          expect(block).toHaveProperty("name");
          expect(block).toHaveProperty("input");
        }
      }
    }
  });

  test("tool_result blocks have required fields", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    for (const logline of session.loglines) {
      if (!logline.message?.content || !Array.isArray(logline.message.content)) continue;
      
      for (const block of logline.message.content) {
        if (typeof block === 'object' && block !== null && 'type' in block && block.type === "tool_result") {
          expect(block).toHaveProperty("content");
        }
      }
    }
  });

  test("thinking blocks have thinking field", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    
    for (const logline of session.loglines) {
      if (!logline.message?.content || !Array.isArray(logline.message.content)) continue;
      
      for (const block of logline.message.content) {
        if (typeof block === 'object' && block !== null && 'type' in block && block.type === "thinking") {
          expect(block).toHaveProperty("thinking");
        }
      }
    }
  });
});
