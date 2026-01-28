import { h } from "preact";
import { escapeHtml } from "./markdown.js";
import type { Logline, ContentBlock, ToolUseBlock, ToolResultBlock } from "../schemas.js";

// ============================================
// Components
// ============================================

interface IndexItemProps {
  promptNum: number;
  pageNum: number;
  timestamp: string;
  contentPreview: string;
  toolStats?: string;
  assistantPreviewHtml?: string | null;
}

export function IndexItem({
  promptNum,
  pageNum,
  timestamp,
  contentPreview,
  toolStats,
  assistantPreviewHtml,
}: IndexItemProps) {
  const pageFile = `page-${String(pageNum).padStart(3, "0")}.html`;
  const msgId = `msg-${timestamp.replace(/[:.]/g, "-")}`;
  
  return (
    <div class="index-item">
      <a href={`${pageFile}#${msgId}`}>
        <div class="index-item-header">
          <span class="index-item-number">#{promptNum}</span>
          <time datetime={timestamp} data-timestamp={timestamp}>
            {timestamp}
          </time>
        </div>
        <div class="index-item-content">
          <p>{contentPreview}</p>
        </div>
      </a>
      {(toolStats || assistantPreviewHtml) && (
        <div class="index-item-stats">
          {toolStats && <span>{toolStats}</span>}
          {assistantPreviewHtml && (
            <IndexItemLongText htmlContent={assistantPreviewHtml} />
          )}
        </div>
      )}
    </div>
  );
}

interface IndexCommitProps {
  hash: string;           // Short commit hash (7 chars)
  message: string;        // Commit message (first line)
  timestamp: string;      // ISO timestamp
  githubRepo?: string;    // Optional: "owner/repo" for GitHub link
}

export function IndexCommit({
  hash,
  message,
  timestamp,
  githubRepo,
}: IndexCommitProps) {
  const content = (
    <>
      <div class="index-commit-header">
        <span class="index-commit-hash">{hash}</span>
        <time datetime={timestamp} data-timestamp={timestamp}>
          {timestamp}
        </time>
      </div>
      <div class="index-commit-msg">{message}</div>
    </>
  );

  return (
    <div class="index-commit">
      {githubRepo ? (
        <a href={`https://github.com/${githubRepo}/commit/${hash}`}>
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

interface IndexSummaryProps {
  promptCount: number;
  messageCount: number;
  toolCallCount: number;
  commitCount: number;
  pageCount: number;
}

export function IndexSummary({
  promptCount,
  messageCount,
  toolCallCount,
  commitCount,
  pageCount,
}: IndexSummaryProps) {
  const parts = [
    `${promptCount} prompt${promptCount !== 1 ? 's' : ''}`,
    `${messageCount} message${messageCount !== 1 ? 's' : ''}`,
    `${toolCallCount} tool call${toolCallCount !== 1 ? 's' : ''}`,
    `${commitCount} commit${commitCount !== 1 ? 's' : ''}`,
    `${pageCount} page${pageCount !== 1 ? 's' : ''}`,
  ];
  return (
    <p style="color: var(--text-muted); margin-bottom: 24px;">
      {parts.join(' · ')}
    </p>
  );
}



interface IndexItemLongTextProps {
  htmlContent: string;
}

export function IndexItemLongText({
  htmlContent,
}: IndexItemLongTextProps) {
  // Structure matches Python output:
  // <div class="index-item-long-text">
  //   <div class="truncatable">
  //     <div class="truncatable-content">
  //       <div class="index-item-long-text-content">
  //         {content}
  //       </div>
  //     </div>
  //     <button class="expand-btn">Show more</button>
  //   </div>
  // </div>
  return (
    <div class="index-item-long-text">
      <div class="truncatable">
        <div class="truncatable-content">
          <div 
            class="index-item-long-text-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
        <button class="expand-btn">Show more</button>
      </div>
    </div>
  );
}

// ============================================
// Analysis Functions
// ============================================

interface ConversationAnalysis {
  toolCounts: Map<string, number>;
  longTexts: Array<{ type: string; preview: string; full: string; timestamp: string }>;
  commits: Array<{ hash: string; message: string; timestamp: string }>;
}

export function analyzeConversation(loglines: Logline[]): ConversationAnalysis {
  const toolCounts = new Map<string, number>();
  const longTexts: ConversationAnalysis["longTexts"] = [];
  const commits: ConversationAnalysis["commits"] = [];

  for (const logline of loglines) {
    if (!logline.message || !logline.message.content) continue;

    const timestamp = logline.timestamp || "";
    const content = logline.message.content;
    const blocks = Array.isArray(content) ? content : [{ type: "text", text: content } as any];

    for (const block of blocks) {
      // Count tool usage
      if (block.type === "tool_use") {
        const toolBlock = block as ToolUseBlock;
        const name = toolBlock.name;
        toolCounts.set(name, (toolCounts.get(name) || 0) + 1);

        // Check for long text in tool inputs
        // Common tools with long content: write, edit, replace
        // We check specific fields known to contain code/text
        const input = toolBlock.input || {};
        let textToCheck = "";
        
        if (typeof input.content === "string") {
          textToCheck = input.content;
        } else if (typeof input.newString === "string") {
          textToCheck = input.newString;
        } else if (typeof input.replacement === "string") {
          textToCheck = input.replacement;
        }

        if (textToCheck.length > 500) {
          longTexts.push({
            type: name,
            preview: textToCheck.slice(0, 200) + "...",
            full: textToCheck,
            timestamp
          });
        }
      }

      // Check for long thinking
      if (block.type === "thinking") {
        const thinkingBlock = block as any; // Cast to access thinking property
        const text = thinkingBlock.thinking || "";
        if (text.length > 500) {
          longTexts.push({
            type: "thinking",
            preview: text.slice(0, 200) + "...",
            full: text,
            timestamp
          });
        }
      }

      // Detect commits in tool results (bash output)
      if (block.type === "tool_result") {
        const resultBlock = block as ToolResultBlock;
        const contentStr = typeof resultBlock.content === "string" 
          ? resultBlock.content 
          : JSON.stringify(resultBlock.content);
        
        // Regex to match standard git commit output: [branch hash] message
        // e.g. [main 1a2b3c4] Fix bug
        const commitMatch = contentStr.match(/\[(?<branch>[^\]]+)\s+(?<hash>[0-9a-f]{7,})\]\s+(?<message>.*)/);
        
        if (commitMatch && commitMatch.groups) {
          const groups = commitMatch.groups;
          if (groups.hash && groups.message) {
            commits.push({
              hash: groups.hash,
              message: groups.message.trim(),
              timestamp
            });
          }
        }
      }
    }
  }

  return { toolCounts, longTexts, commits };
}

export function formatToolStats(toolCounts: Map<string, number>): string {
  // Sort by count descending
  const sorted = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
  
  return sorted
    .map(([name, count]) => {
      // Normalize names if needed, but usually we just use the tool name
      // The prompt example shows "bash:5 write:3"
      return `${name}:${count}`;
    })
    .join(" ");
}
