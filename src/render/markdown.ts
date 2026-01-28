/**
 * Markdown rendering with marked
 */

import { marked } from "marked";

// Configure marked with GFM (fenced code, tables)
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: false, // Don't convert \n to <br>
});

/**
 * Render markdown text to HTML
 *
 * @param text - Markdown text to render
 * @returns HTML string
 */
export function renderMarkdown(text: string | null | undefined): string {
  if (!text) {
    return "";
  }

  // marked.parse returns string synchronously when async is false (default)
  return marked.parse(text) as string;
}

/**
 * Check if a string looks like JSON
 *
 * @param text - String to check
 * @returns true if the string appears to be JSON
 */
export function isJsonLike(text: string | null | undefined): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const trimmed = text.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

/**
 * Format a value as pretty-printed JSON HTML
 *
 * @param value - Value to format (string or object)
 * @returns HTML string with formatted JSON in a pre tag
 */
export function formatJson(value: unknown): string {
  try {
    let obj = value;
    if (typeof value === "string") {
      obj = JSON.parse(value);
    }
    const formatted = JSON.stringify(obj, null, 2);
    return `<pre class="json">${escapeHtml(formatted)}</pre>`;
  } catch {
    return `<pre>${escapeHtml(String(value))}</pre>`;
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
