import type { VNode } from "preact";
import { Truncatable } from "./jsx";

// Extract filename from path
function getFilename(filePath: string): string {
  return filePath.includes('/') ? filePath.split('/').pop()! : filePath;
}

interface WriteToolProps {
  filePath: string;
  content: string;
  toolId: string;
}

export function WriteToolBlock({ filePath, content, toolId }: WriteToolProps): VNode {
  const filename = getFilename(filePath);
  return (
    <div class="file-tool write-tool" data-tool-id={toolId}>
      <div class="file-tool-header write-header">
        <span class="file-tool-icon">📝</span> Write <span class="file-tool-path">{filename}</span>
      </div>
      <div class="file-tool-fullpath">{filePath}</div>
      <Truncatable><pre class="file-content">{content}</pre></Truncatable>
    </div>
  );
}

interface EditToolProps {
  filePath: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
  toolId: string;
}

export function EditToolBlock({ filePath, oldString, newString, replaceAll, toolId }: EditToolProps): VNode {
  const filename = getFilename(filePath);
  return (
    <div class="file-tool edit-tool" data-tool-id={toolId}>
      <div class="file-tool-header edit-header">
        <span class="file-tool-icon">✏️</span> Edit <span class="file-tool-path">{filename}</span>
        {replaceAll && <span class="edit-replace-all">(replace all)</span>}
      </div>
      <div class="file-tool-fullpath">{filePath}</div>
      <Truncatable>
        <div class="edit-section edit-old">
          <div class="edit-label">−</div>
          <pre class="edit-content">{oldString}</pre>
        </div>
        <div class="edit-section edit-new">
          <div class="edit-label">+</div>
          <pre class="edit-content">{newString}</pre>
        </div>
      </Truncatable>
    </div>
  );
}

interface BashToolProps {
  command: string;
  description?: string;
  toolId: string;
}

export function BashToolBlock({ command, description, toolId }: BashToolProps): VNode {
  return (
    <div class="tool-use bash-tool" data-tool-id={toolId}>
      <div class="tool-header"><span class="tool-icon">$</span> Bash</div>
      {description && <div class="tool-description">{description}</div>}
      <Truncatable><pre class="bash-command">{command}</pre></Truncatable>
    </div>
  );
}

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TodoWriteProps {
  todos: Todo[];
  toolId: string;
}

export function TodoWriteBlock({ todos, toolId }: TodoWriteProps): VNode {
  const getIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '→';
      case 'pending': return '○';
      default: return '○';
    }
  };

  return (
    <div class="todo-list" data-tool-id={toolId}>
      <div class="todo-header"><span class="todo-header-icon">☰</span> Task List</div>
      <ul class="todo-items">
        {todos.map(todo => (
          <li class={`todo-item todo-${todo.status}`}>
            <span class="todo-icon">{getIcon(todo.status)}</span>
            <span class="todo-content">{todo.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
