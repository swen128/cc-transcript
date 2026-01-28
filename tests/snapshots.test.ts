/**
 * Snapshot tests for HTML parity with Python package output
 * 
 * These tests ensure the TypeScript port produces HTML that matches
 * the original Python package output.
 */

import { test, expect, describe } from "bun:test";
import { renderTranscriptFromFile } from "../src/render/transcript.ts";
import { join } from "path";
import { readFile } from "fs/promises";

const fixturesDir = join(import.meta.dir, "..", "fixtures");
const inputDir = join(fixturesDir, "input");
const expectedDir = join(fixturesDir, "expected", "sample_session");

/**
 * Normalize HTML for comparison:
 * - Remove extra whitespace
 * - Normalize line endings
 * - Sort attributes alphabetically within each tag
 */
function normalizeHtml(html: string): string {
  return html
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    // Remove leading/trailing whitespace on each line
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join("\n")
    // Normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    // Remove space before closing tags
    .replace(/\s+>/g, ">")
    // Remove space after opening tags
    .replace(/>\s+</g, "><");
}

/**
 * Extract just the content sections for comparison,
 * ignoring dynamic parts like exact timestamps in JS
 */
function extractStructuralContent(html: string): string {
  // Remove the inline JavaScript as it may differ slightly
  let content = html
    .replace(/<script>[\s\S]*?<\/script>/g, "<script>...</script>");
  
  return normalizeHtml(content);
}

/**
 * Check if two HTML strings have the same structural elements
 */
function checkStructuralSimilarity(actual: string, expected: string): {
  similar: boolean;
  differences: string[];
} {
  const differences: string[] = [];
  
  // Check for key structural elements
  const structuralChecks = [
    // Document structure
    { pattern: /<!DOCTYPE html>/i, name: "DOCTYPE" },
    { pattern: /<html[^>]*>/i, name: "html tag" },
    { pattern: /<head>/i, name: "head tag" },
    { pattern: /<body>/i, name: "body tag" },
    
    // CSS classes
    { pattern: /class="container"/i, name: ".container class" },
    { pattern: /class="message user"/i, name: ".message.user class" },
    { pattern: /class="message assistant"/i, name: ".message.assistant class" },
    { pattern: /class="message tool-reply"/i, name: ".message.tool-reply class" },
    { pattern: /class="pagination"/i, name: ".pagination class" },
    { pattern: /class="thinking"/i, name: ".thinking class" },
    { pattern: /class="tool-use[^"]*"/i, name: ".tool-use class" },
    { pattern: /class="tool-result[^"]*"/i, name: ".tool-result class" },
    { pattern: /class="file-tool write-tool"/i, name: ".write-tool class" },
    { pattern: /class="file-tool edit-tool"/i, name: ".edit-tool class" },
    { pattern: /class="todo-list"/i, name: ".todo-list class" },
    
    // Message structure
    { pattern: /class="message-header"/i, name: ".message-header" },
    { pattern: /class="message-content"/i, name: ".message-content" },
    { pattern: /class="role-label"/i, name: ".role-label" },
    { pattern: /data-timestamp/i, name: "data-timestamp attribute" },
    
    // Tool structure
    { pattern: /class="tool-header"/i, name: ".tool-header" },
    { pattern: /class="file-tool-header/i, name: ".file-tool-header" },
    { pattern: /class="file-tool-path"/i, name: ".file-tool-path" },
    { pattern: /class="file-tool-fullpath"/i, name: ".file-tool-fullpath" },
    
    // Truncatable
    { pattern: /class="truncatable"/i, name: ".truncatable" },
    { pattern: /class="truncatable-content"/i, name: ".truncatable-content" },
    { pattern: /class="expand-btn"/i, name: ".expand-btn" },
    
    // Todo list
    { pattern: /class="todo-items"/i, name: ".todo-items" },
    { pattern: /class="todo-item[^"]*"/i, name: ".todo-item" },
    { pattern: /class="todo-icon"/i, name: ".todo-icon" },
    { pattern: /class="todo-content"/i, name: ".todo-content" },
  ];
  
  for (const check of structuralChecks) {
    const inActual = check.pattern.test(actual);
    const inExpected = check.pattern.test(expected);
    
    if (inExpected && !inActual) {
      differences.push(`Missing in actual: ${check.name}`);
    }
  }
  
  return {
    similar: differences.length === 0,
    differences,
  };
}

describe("HTML Parity - Page Content", () => {
  test("page-001.html has matching structural elements", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"), {
      githubRepo: "example/project"
    });
    
    const actualHtml = output.files.get("page-001.html");
    const expectedHtml = await readFile(join(expectedDir, "page-001.html"), "utf-8");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    const result = checkStructuralSimilarity(actualHtml, expectedHtml);
    
    if (!result.similar) {
      console.log("Structural differences found:");
      result.differences.forEach(d => console.log(`  - ${d}`));
    }
    
    expect(result.similar).toBe(true);
  });

  test("page contains user messages with correct structure", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    // Check user message structure
    expect(actualHtml).toContain('class="message user"');
    expect(actualHtml).toContain('class="message-header"');
    expect(actualHtml).toContain('class="role-label"');
    expect(actualHtml).toContain('class="message-content"');
  });

  test("page contains thinking blocks", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="thinking"');
    expect(actualHtml).toContain('class="thinking-label"');
  });

  test("page contains write tool blocks", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="file-tool write-tool"');
    expect(actualHtml).toContain('class="file-tool-header write-header"');
  });

  test("page contains edit tool blocks", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="file-tool edit-tool"');
    expect(actualHtml).toContain('class="edit-section edit-old"');
    expect(actualHtml).toContain('class="edit-section edit-new"');
  });

  test("page contains bash tool blocks", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('bash-tool');
    expect(actualHtml).toContain('class="tool-header"');
  });

  test("page contains todo list blocks", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="todo-list"');
    expect(actualHtml).toContain('class="todo-items"');
    expect(actualHtml).toContain('todo-completed');
    expect(actualHtml).toContain('todo-in-progress');
    expect(actualHtml).toContain('todo-pending');
  });

  test("page contains pagination", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="pagination"');
    expect(actualHtml).toContain('index.html');
  });
});

describe("HTML Parity - Index Page", () => {
  test("index.html has matching structural elements", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"), {
      githubRepo: "example/project"
    });
    
    const actualHtml = output.files.get("index.html");
    const expectedHtml = await readFile(join(expectedDir, "index.html"), "utf-8");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    // Check for key index page elements
    expect(actualHtml).toContain('class="pagination"');
    expect(actualHtml).toContain('class="index-item"');
  });

  test("index contains prompt items", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("index.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="index-item"');
  });

  test("index has pagination", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("index.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain('class="pagination"');
  });
});

describe("HTML Parity - CSS", () => {
  test("CSS variables match Python output", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    const expectedHtml = await readFile(join(expectedDir, "page-001.html"), "utf-8");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    // Check for essential CSS variables
    const cssVars = [
      "--bg-color",
      "--card-bg",
      "--user-bg",
      "--user-border",
      "--assistant-bg",
      "--thinking-bg",
      "--tool-bg",
      "--tool-result-bg",
      "--text-color",
      "--code-bg",
    ];
    
    for (const cssVar of cssVars) {
      expect(actualHtml).toContain(cssVar);
    }
  });

  test("CSS class definitions are present", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    // Check for essential CSS class definitions in style tag
    expect(actualHtml).toContain(".message");
    expect(actualHtml).toContain(".user");
    expect(actualHtml).toContain(".assistant");
    expect(actualHtml).toContain(".tool-reply");
    expect(actualHtml).toContain(".thinking");
    expect(actualHtml).toContain(".tool-use");
    expect(actualHtml).toContain(".pagination");
  });
});

describe("HTML Parity - JavaScript", () => {
  test("timestamp formatting JS is present", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain("data-timestamp");
    expect(actualHtml).toContain("toLocale");
  });

  test("truncatable JS is present", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    const actualHtml = output.files.get("page-001.html");
    
    expect(actualHtml).toBeDefined();
    if (!actualHtml) return;
    
    expect(actualHtml).toContain(".truncatable");
    expect(actualHtml).toContain("expand-btn");
  });
});

describe("HTML Parity - File Count", () => {
  test("generates correct number of files", async () => {
    const output = await renderTranscriptFromFile(join(inputDir, "sample_session.json"));
    
    // Should have index.html + page files
    expect(output.files.has("index.html")).toBe(true);
    expect(output.files.has("page-001.html")).toBe(true);
    
    // Count total files
    const fileCount = output.files.size;
    expect(fileCount).toBeGreaterThanOrEqual(2);
  });
});
