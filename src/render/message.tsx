/**
 * Message renderer component
 */

import type { VNode } from "preact";
import type { Message, ContentBlock } from "../schemas.ts";
import { renderToHtml } from "./jsx.tsx";

/**
 * Props for the Message component
 */
interface MessageProps {
  roleClass: "user" | "assistant" | "tool-reply";
  roleLabel: string;
  msgId: string;
  timestamp: string;
  contentHtml: string;
}

/**
 * Message component
 *
 * Renders a message with role-based styling
 */
export function MessageComponent({
  roleClass,
  roleLabel,
  msgId,
  timestamp,
  contentHtml,
}: MessageProps): VNode {
  return (
    <div class={`message ${roleClass}`} id={msgId}>
      <div class="message-header">
        <span class="role-label">{roleLabel}</span>
        <a href={`#${msgId}`} class="timestamp-link">
          <time datetime={timestamp} data-timestamp={timestamp}>
            {timestamp}
          </time>
        </a>
      </div>
      <div
        class="message-content"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}

/**
 * Check if a message contains only tool_result blocks
 */
export function isToolResultMessage(message: Message): boolean {
  const content = message.content;

  if (!Array.isArray(content)) {
    return false;
  }

  if (content.length === 0) {
    return false;
  }

  return content.every(
    (block) =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "tool_result"
  );
}

/**
 * Generate a message ID from a timestamp
 */
export function makeMsgId(timestamp: string): string {
  return `msg-${timestamp.replace(/:/g, "-").replace(/\./g, "-")}`;
}

/**
 * Render a message to HTML string
 *
 * @param logType - "user" or "assistant"
 * @param messageJson - JSON string of the message
 * @param timestamp - ISO timestamp
 * @param renderContentBlock - Function to render content blocks
 * @returns HTML string or empty string if message should be skipped
 */
export function renderMessage(
  logType: "user" | "assistant",
  messageJson: string,
  timestamp: string,
  renderContentBlock: (block: ContentBlock) => string,
  renderUserContent: (message: Message) => string
): string {
  if (!messageJson) {
    return "";
  }

  let messageData: Message;
  try {
    messageData = JSON.parse(messageJson);
  } catch {
    return "";
  }

  let contentHtml: string;
  let roleClass: "user" | "assistant" | "tool-reply";
  let roleLabel: string;

  if (logType === "user") {
    contentHtml = renderUserContent(messageData);

    // Check if this is a tool result message
    if (isToolResultMessage(messageData)) {
      roleClass = "tool-reply";
      roleLabel = "Tool reply";
    } else {
      roleClass = "user";
      roleLabel = "User";
    }
  } else {
    // Assistant message
    contentHtml = renderAssistantMessage(messageData, renderContentBlock);
    roleClass = "assistant";
    roleLabel = "Assistant";
  }

  if (!contentHtml.trim()) {
    return "";
  }

  const msgId = makeMsgId(timestamp);

  return renderToHtml(
    <MessageComponent
      roleClass={roleClass}
      roleLabel={roleLabel}
      msgId={msgId}
      timestamp={timestamp}
      contentHtml={contentHtml}
    />
  );
}

/**
 * Render assistant message content
 */
function renderAssistantMessage(
  message: Message,
  renderContentBlock: (block: ContentBlock) => string
): string {
  const content = message.content;

  if (!Array.isArray(content)) {
    // String content (shouldn't happen for assistant, but handle it)
    return `<p>${String(content)}</p>`;
  }

  return content.map((block) => renderContentBlock(block as ContentBlock)).join("");
}
