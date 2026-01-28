/**
 * Integration tests for renderTranscript
 */

import { test, expect, describe, beforeAll } from "bun:test";
import { renderTranscript, renderTranscriptFromFile } from "../src/render/transcript.ts";
import { parseSessionFile } from "../src/parse.ts";
import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp, rm, readdir, readFile } from "fs/promises";

const fixturesDir = join(import.meta.dir, "..", "fixtures", "input");

describe("renderTranscript", () => {
  test("returns TranscriptOutput with files Map", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    expect(output).toBeDefined();
    expect(output.files).toBeInstanceOf(Map);
    expect(typeof output.writeTo).toBe("function");
  });

  test("generates index.html", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    expect(output.files.has("index.html")).toBe(true);
    const indexHtml = output.files.get("index.html");
    expect(indexHtml).toBeDefined();
    expect(indexHtml).toContain("<!DOCTYPE html>");
  });

  test("generates page files", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    // Should have at least one page file
    const pageFiles = Array.from(output.files.keys()).filter(f => f.startsWith("page-"));
    expect(pageFiles.length).toBeGreaterThan(0);
    
    // First page should be page-001.html
    expect(output.files.has("page-001.html")).toBe(true);
  });

  test("page filenames follow 3-digit format", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const pageFiles = Array.from(output.files.keys()).filter(f => f.startsWith("page-"));
    for (const filename of pageFiles) {
      expect(filename).toMatch(/^page-\d{3}\.html$/);
    }
  });

  test("HTML contains proper structure", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      // Check for essential HTML elements
      expect(page).toContain("<html");
      expect(page).toContain("<head>");
      expect(page).toContain("<body>");
      expect(page).toContain("<style>");
      expect(page).toContain("</html>");
    }
  });

  test("includes CSS in output", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      // Check for CSS variables (from original Python package)
      expect(page).toContain("--bg-color");
      expect(page).toContain("--user-bg");
      expect(page).toContain(".message");
    }
  });

  test("includes JavaScript in output", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      expect(page).toContain("<script>");
      expect(page).toContain("data-timestamp");
    }
  });
});

describe("renderTranscript with options", () => {
  test("accepts githubRepo option", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session, { githubRepo: "owner/repo" });
    
    expect(output.files.has("index.html")).toBe(true);
  });
});

describe("renderTranscriptFromFile", () => {
  test("renders from JSON file", async () => {
    const output = await renderTranscriptFromFile(join(fixturesDir, "sample_session.json"));
    
    expect(output.files.has("index.html")).toBe(true);
    expect(output.files.has("page-001.html")).toBe(true);
  });

  test("renders from JSONL file", async () => {
    const output = await renderTranscriptFromFile(join(fixturesDir, "sample_session.jsonl"));
    
    expect(output.files.has("index.html")).toBe(true);
  });
});

describe("writeTo method", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "cc-transcript-test-"));
  });

  test("writes files to directory", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const outputDir = join(tempDir, "output1");
    await output.writeTo(outputDir);
    
    // Check files were created
    const files = await readdir(outputDir);
    expect(files).toContain("index.html");
    expect(files.some(f => f.startsWith("page-"))).toBe(true);
  });

  test("creates directory if it doesn't exist", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const outputDir = join(tempDir, "nested", "output2");
    await output.writeTo(outputDir);
    
    const files = await readdir(outputDir);
    expect(files.length).toBeGreaterThan(0);
  });

  test("written files contain valid HTML", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const outputDir = join(tempDir, "output3");
    await output.writeTo(outputDir);
    
    const indexContent = await readFile(join(outputDir, "index.html"), "utf-8");
    expect(indexContent).toContain("<!DOCTYPE html>");
  });
});

describe("index page assistant response preview", () => {
  test("index items include assistant response preview with truncatable content", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const indexHtml = output.files.get("index.html");
    expect(indexHtml).toBeDefined();
    if (indexHtml) {
      expect(indexHtml).toContain('<div class="index-item-long-text">');
      expect(indexHtml).toContain('<div class="truncatable">');
      expect(indexHtml).toContain('<div class="truncatable-content">');
      expect(indexHtml).toContain('<button class="expand-btn">');
    }
  });

  test("index items show assistant text content preview", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const indexHtml = output.files.get("index.html");
    expect(indexHtml).toBeDefined();
    if (indexHtml) {
      expect(indexHtml).toContain('<div class="index-item-long-text-content">');
    }
  });
});

describe("renderTranscript content", () => {
  test("renders user messages", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      expect(page).toContain("class=\"message user\"");
      expect(page).toContain("role-label");
    }
  });

  test("renders assistant messages", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      expect(page).toContain("class=\"message assistant\"");
    }
  });

  test("renders tool-reply messages", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      expect(page).toContain("class=\"message tool-reply\"");
    }
  });

  test("renders pagination", async () => {
    const session = await parseSessionFile(join(fixturesDir, "sample_session.json"));
    const output = renderTranscript(session);
    
    const page = output.files.get("page-001.html");
    expect(page).toBeDefined();
    if (page) {
      expect(page).toContain("class=\"pagination\"");
      expect(page).toContain("index.html");
    }
  });
});
