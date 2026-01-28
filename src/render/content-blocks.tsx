import { h, Fragment } from "preact";
import type { VNode } from "preact";
import { renderToHtml, Truncatable } from "./jsx.js";
import {
  renderMarkdown,
  formatJson,
  escapeHtml,
  isJsonLike,
} from "./markdown.js";
import type {
  ContentBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
  ImageBlock,
  TextBlock,
} from "../schemas.js";
import {
  WriteToolBlock,
  EditToolBlock,
  BashToolBlock,
  TodoWriteBlock,
} from "./tool-renderers.js";

// ============================================
// Components
// ============================================

/**
 * Renders thinking/reasoning blocks
 */
export function ThinkingBlock({ block }: { block: ThinkingBlock }) {
  const html = renderMarkdown(block.thinking);
  return (
    <div class="thinking">
      <div class="thinking-label">Thinking</div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Renders assistant text with markdown
 */
export function AssistantText({ text }: { text: string }) {
  const html = renderMarkdown(text);
  return (
    <div
      class="assistant-text"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Renders generic tool calls with JSON input
 */
export function ToolUse({ block }: { block: ToolUseBlock }) {
  const inputJson = JSON.stringify(block.input, null, 2);
  
  // Note: description is not currently in the schema, but included in requirements
  // We'll check if it exists on the block object (as any) just in case
  const description = (block as any).description;

  return (
    <div class="tool-use" data-tool-id={block.id}>
      <div class="tool-header">
        <span class="tool-icon">⚙</span> {block.name}
      </div>
      {description && <div class="tool-description">{description}</div>}
      <Truncatable>
        <pre class="json">{inputJson}</pre>
      </Truncatable>
    </div>
  );
}

/**
 * Renders base64 images
 */
export function ImageBlock({ block }: { block: ImageBlock }) {
  const { media_type, data } = block.source;
  return (
    <div class="image-block">
      <img
        src={`data:${media_type};base64,${data}`}
        style="max-width: 100%"
        alt="User uploaded image"
      />
    </div>
  );
}

/**
 * Renders tool results
 */
export function ToolResult({
  block,
  githubRepo,
}: {
  block: ToolResultBlock;
  githubRepo?: string;
}) {
  const isError = block.is_error;
  const content = block.content;
  
  // Check if content has images (if it's an array)
  const hasImages = Array.isArray(content) && content.some(
    (item: any) => item.type === 'image'
  );

  let renderedContent: VNode | string;

  if (Array.isArray(content)) {
    // Handle array of blocks
    renderedContent = (
      <Fragment>
        {content.map((item: any, index: number) => {
          if (item.type === 'image') {
            return <ImageBlock key={index} block={item as ImageBlock} />;
          } else if (item.type === 'text') {
            return <div key={index}>{item.text}</div>;
          } else {
            return <div key={index}>{JSON.stringify(item)}</div>;
          }
        })}
      </Fragment>
    );
  } else if (typeof content === 'string') {
    // Handle string content with git commit detection
    const commitRegex = /\[[\w\-/]+ ([a-f0-9]{7,})\] (.+?)(?:\n|$)/g;
    
    // If we have a githubRepo and the content looks like it contains commits
    if (githubRepo && content.match(commitRegex)) {
      const parts = [];
      let lastIndex = 0;
      let match;
      
      // Reset regex state
      commitRegex.lastIndex = 0;
      
      while ((match = commitRegex.exec(content)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(content.slice(lastIndex, match.index));
        }
        
        const fullMatch = match[0];
        const hash = match[1];
        const message = match[2];
        
        if (!hash || !message) continue;

        const shortHash = hash.slice(0, 7);
        
        parts.push(
          <div class="commit-card">
            <a href={`https://github.com/${githubRepo}/commit/${hash}`}>
              <span class="commit-card-hash">{shortHash}</span> {message}
            </a>
          </div>
        );
        
        lastIndex = match.index + fullMatch.length;
      }
      
      // Add remaining text
      if (lastIndex < content.length) {
        parts.push(content.slice(lastIndex));
      }
      
      renderedContent = <Fragment>{parts}</Fragment>;
    } else {
      // Just plain text
      renderedContent = content;
    }
  } else {
    renderedContent = JSON.stringify(content);
  }

  const className = `tool-result${isError ? " tool-error" : ""}`;

  if (hasImages) {
    return (
      <div class={className}>
        {renderedContent}
      </div>
    );
  }

  return (
    <div class={className}>
      <Truncatable>{renderedContent}</Truncatable>
    </div>
  );
}

/**
 * Renders user message content
 */
export function UserContent({ content }: { content: string | ContentBlock[] }) {
  if (Array.isArray(content)) {
    const html = content.map((block) => renderContentBlock(block)).join("");
    return (
      <div 
        class="user-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // String content
  if (isJsonLike(content)) {
    return (
      <div 
        class="user-content"
        dangerouslySetInnerHTML={{ __html: formatJson(content) }}
      />
    );
  }

  return (
    <div 
      class="user-content"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ============================================
// Main Render Function
// ============================================

/**
 * Main function to render any content block
 */
export function renderContentBlock(
  block: ContentBlock,
  githubRepo?: string
): string {
  switch (block.type) {
    case "thinking":
      return renderToHtml(<ThinkingBlock block={block} />);
    
    case "text":
      return renderToHtml(<AssistantText text={block.text} />);
    
    case "tool_use": {
      const toolName = block.name.toLowerCase();
      const input = block.input as Record<string, unknown>;
      
      // Use specialized renderers for known tools
      if (toolName === "write" || toolName === "mcp_write") {
        return renderToHtml(
          <WriteToolBlock
            filePath={String(input.file_path || input.filePath || "")}
            content={String(input.content || "")}
            toolId={block.id}
          />
        );
      }
      
      if (toolName === "edit" || toolName === "mcp_edit") {
        return renderToHtml(
          <EditToolBlock
            filePath={String(input.file_path || input.filePath || "")}
            oldString={String(input.old_string || input.oldString || "")}
            newString={String(input.new_string || input.newString || "")}
            replaceAll={Boolean(input.replace_all || input.replaceAll)}
            toolId={block.id}
          />
        );
      }
      
      if (toolName === "bash" || toolName === "mcp_bash") {
        return renderToHtml(
          <BashToolBlock
            command={String(input.command || "")}
            description={input.description ? String(input.description) : undefined}
            toolId={block.id}
          />
        );
      }
      
      if (toolName === "todowrite" || toolName === "mcp_todowrite") {
        const todos = Array.isArray(input.todos) ? input.todos.map((t: any) => ({
          content: String(t.content || ""),
          status: (t.status as "pending" | "in_progress" | "completed") || "pending",
        })) : [];
        return renderToHtml(
          <TodoWriteBlock
            todos={todos}
            toolId={block.id}
          />
        );
      }
      
      // Default: generic tool use display
      return renderToHtml(<ToolUse block={block} />);
    }
    
    case "tool_result":
      return renderToHtml(<ToolResult block={block} githubRepo={githubRepo} />);
    
    case "image":
      return renderToHtml(<ImageBlock block={block} />);
      
    default:
      // Fallback for unknown block types
      return renderToHtml(
        <div class="unknown-block">
          <pre>{JSON.stringify(block, null, 2)}</pre>
        </div>
      );
  }
}
