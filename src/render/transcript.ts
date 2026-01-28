/**
 * Main transcript rendering function
 */

import { h } from "preact";
import type { VNode } from "preact";
import type { SessionData, Logline, Message, ContentBlock } from "../schemas.ts";
import type { RenderOptions, TranscriptOutput } from "../types.ts";
import { PROMPTS_PER_PAGE } from "../types.ts";
import { parseSessionFile } from "../parse.ts";
import { renderDocument, renderToHtml } from "./jsx.tsx";
import { renderContentBlock, UserContent } from "./content-blocks.tsx";
import { renderMessage, isToolResultMessage } from "./message.tsx";
import {
  Pagination,
  IndexPagination,
  paginateConversations,
  getPageFilename,
  type Conversation,
} from "./pagination.tsx";
import {
  IndexItem,
  IndexCommit,
  IndexSummary,
  IndexItemLongText,
  analyzeConversation,
} from "./index-page.tsx";
import { renderMarkdown } from "./markdown.ts";

function getUserTextPreview(message: Message): string {
  const content = message.content;
  let preview = "";

  if (typeof content === "string") {
    preview = content;
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        preview = block.text;
        break;
      }
    }

    if (!preview && content.length > 0) {
      const firstBlock = content[0] as { type?: string } | undefined;
      if (firstBlock?.type) {
        preview = `[${firstBlock.type}]`;
      }
    }
  }

  const normalized = preview.replace(/\s+/g, " ").trim();
  if (normalized.length > 100) {
    return normalized.slice(0, 100) + "...";
  }
  return normalized;
}

function getMessageFromLogline(logline: Logline): Message | null {
  if (logline.message) {
    return logline.message;
  }
  if (logline.content !== undefined) {
    return { content: logline.content };
  }
  return null;
}

function groupLoglinesToConversations(loglines: Logline[]): Conversation[] {
  const conversations: Conversation[] = [];
  let current: Conversation | null = null;

  for (const logline of loglines) {
    if (logline.type !== "user" && logline.type !== "assistant") {
      continue;
    }

    const message = getMessageFromLogline(logline);
    if (!message) {
      continue;
    }

    const timestamp = logline.timestamp ?? "";
    const messageJson = JSON.stringify(message);

    if (logline.type === "user") {
      const startsConversation = !isToolResultMessage(message);

      if (startsConversation) {
        current = {
          userText: getUserTextPreview(message),
          timestamp,
          messages: [],
          isContinuation: Boolean(logline.isCompactSummary),
        };
        conversations.push(current);
      }

      if (current) {
        current.messages.push({
          type: "user",
          messageJson,
          timestamp,
        });
      }

      continue;
    }

    if (!current) {
      continue;
    }

    current.messages.push({
      type: "assistant",
      messageJson,
      timestamp,
    });
  }

  return conversations;
}

function renderPage(
  conversations: Conversation[],
  pageNum: number,
  totalPages: number,
  options: RenderOptions
): string {
  const renderBlock = (block: ContentBlock) =>
    renderContentBlock(block, options.githubRepo);

  const renderUserContent = (message: Message) =>
    renderToHtml(h(UserContent, { content: message.content }) as VNode);

  const messageHtml: string[] = [];
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      const html = renderMessage(
        message.type,
        message.messageJson,
        message.timestamp,
        renderBlock,
        renderUserContent
      );
      if (html) {
        messageHtml.push(html);
      }
    }
  }

  const paginationTop = renderToHtml(
    h(Pagination, { currentPage: pageNum, totalPages }) as VNode
  );
  const paginationBottom = renderToHtml(
    h(Pagination, { currentPage: pageNum, totalPages }) as VNode
  );

  const pageHtml = [paginationTop, ...messageHtml, paginationBottom].join("\n");

  return renderDocument({
    title: `Transcript - Page ${pageNum}`,
    children: h("div", { dangerouslySetInnerHTML: { __html: pageHtml } }) as VNode,
  });
}

function getFirstAssistantText(messages: Conversation["messages"]): string | null {
  for (const msg of messages) {
    if (msg.type !== "assistant") continue;
    
    try {
      const parsed = JSON.parse(msg.messageJson);
      const content = parsed.content;
      if (!Array.isArray(content)) continue;
      
      for (const block of content) {
        if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
          return block.text;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeToolName(name: string): string {
  const normalized = name.toLowerCase().replace(/^mcp_/, "");
  const toolNameMap: Record<string, string> = {
    todowrite: "todo",
    todoread: "todo",
    bash: "bash",
    write: "write",
    edit: "edit",
    read: "read",
    glob: "glob",
    grep: "grep",
  };
  return toolNameMap[normalized] || normalized;
}

function formatConversationToolStats(messages: Conversation["messages"]): string {
  const toolCounts = new Map<string, number>();
  
  for (const msg of messages) {
    if (msg.type !== "assistant") continue;
    
    try {
      const parsed = JSON.parse(msg.messageJson);
      const content = parsed.content;
      if (!Array.isArray(content)) continue;
      
      for (const block of content) {
        if (block?.type === "tool_use" && block.name) {
          const name = normalizeToolName(block.name);
          toolCounts.set(name, (toolCounts.get(name) || 0) + 1);
        }
      }
    } catch {
      continue;
    }
  }
  
  if (toolCounts.size === 0) return "";
  
  const sorted = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.map(([name, count]) => `${count} ${name}`).join(" · ");
}

function findConversationCommits(
  messages: Conversation["messages"],
  githubRepo?: string
): Array<{ hash: string; message: string; timestamp: string }> {
  const commits: Array<{ hash: string; message: string; timestamp: string }> = [];
  
  for (const msg of messages) {
    try {
      const parsed = JSON.parse(msg.messageJson);
      const content = parsed.content;
      if (!Array.isArray(content)) continue;
      
      for (const block of content) {
        if (block?.type !== "tool_result") continue;
        
        const resultContent = typeof block.content === "string" 
          ? block.content 
          : JSON.stringify(block.content);
        
        const commitMatch = resultContent.match(
          /\[(?<branch>[^\]]+)\s+(?<hash>[0-9a-f]{7,})\]\s+(?<message>.*)/
        );
        
        if (commitMatch?.groups?.hash && commitMatch.groups.message) {
          commits.push({
            hash: commitMatch.groups.hash,
            message: commitMatch.groups.message.trim(),
            timestamp: msg.timestamp,
          });
        }
      }
    } catch {
      continue;
    }
  }
  
  return commits;
}

function renderIndexPage(
  conversations: Conversation[],
  loglines: Logline[],
  totalPages: number,
  options: RenderOptions
): string {
  const analysis = analyzeConversation(loglines);
  
  const totalMessages = loglines.filter(
    (l) => l.type === "user" || l.type === "assistant"
  ).length;
  const totalToolCalls = Array.from(analysis.toolCounts.values()).reduce(
    (a, b) => a + b,
    0
  );

  const paginationHtml = renderToHtml(
    h(IndexPagination, { totalPages }) as VNode
  );

  const summaryHtml = renderToHtml(
    h(IndexSummary, {
      promptCount: conversations.length,
      messageCount: totalMessages,
      toolCallCount: totalToolCalls,
      commitCount: analysis.commits.length,
      pageCount: totalPages,
    }) as VNode
  );

  const itemsWithCommitsHtml = conversations
    .map((conversation, index) => {
      const promptNum = index + 1;
      const pageNum = Math.floor(index / PROMPTS_PER_PAGE) + 1;
      const toolStats = formatConversationToolStats(conversation.messages);
      const commits = findConversationCommits(conversation.messages, options.githubRepo);
      const assistantText = getFirstAssistantText(conversation.messages);
      const assistantPreviewHtml = assistantText ? renderMarkdown(assistantText) : null;
      
      const itemHtml = renderToHtml(
        h(IndexItem, {
          promptNum,
          pageNum,
          timestamp: conversation.timestamp,
          contentPreview: conversation.userText,
          toolStats,
          assistantPreviewHtml,
        }) as VNode
      );
      
      const commitsHtml = commits
        .map((commit) =>
          renderToHtml(
            h(IndexCommit, {
              hash: commit.hash.slice(0, 7),
              message: commit.message,
              timestamp: commit.timestamp,
              githubRepo: options.githubRepo,
            }) as VNode
          )
        )
        .join("\n");
      
      return itemHtml + (commitsHtml ? "\n" + commitsHtml : "");
    })
    .join("\n");

  const indexHtml = [paginationHtml, summaryHtml, itemsWithCommitsHtml]
    .filter(Boolean)
    .join("\n");

  return renderDocument({
    title: "Transcript Index",
    includeSearchJS: true,
    totalPages,
    children: h("div", { dangerouslySetInnerHTML: { __html: indexHtml } }) as VNode,
  });
}

/**
 * Render a session to HTML pages
 *
 * @param session - Parsed session data
 * @param options - Render options (e.g., GitHub repo for commit links)
 * @returns TranscriptOutput with files Map and writeTo method
 */
export function renderTranscript(
  session: SessionData,
  options: RenderOptions = {}
): TranscriptOutput {
  const loglines = session.loglines;
  const conversations = groupLoglinesToConversations(loglines);
  const pages = paginateConversations(conversations);
  const totalPages = pages.length;
  const files = new Map<string, string>();

  files.set(
    "index.html",
    renderIndexPage(conversations, loglines, totalPages, options)
  );

  pages.forEach((pageConversations, index) => {
    const pageNum = index + 1;
    files.set(
      getPageFilename(pageNum),
      renderPage(pageConversations, pageNum, totalPages, options)
    );
  });

  return {
    files,
    async writeTo(dir: string): Promise<void> {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(dir, { recursive: true });

      for (const [filename, content] of files) {
        const file = Bun.file(`${dir}/${filename}`);
        await Bun.write(file, content);
      }
    },
  };
}

/**
 * Parse a session file and render to HTML
 *
 * @param filePath - Path to JSON or JSONL session file
 * @param options - Render options
 * @returns TranscriptOutput with files Map and writeTo method
 */
export async function renderTranscriptFromFile(
  filePath: string,
  options: RenderOptions = {}
): Promise<TranscriptOutput> {
  const session = await parseSessionFile(filePath);
  return renderTranscript(session, options);
}
