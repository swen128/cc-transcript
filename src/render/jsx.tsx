/**
 * JSX rendering utilities with Preact
 */

import { render } from "preact-render-to-string";
import type { VNode, ComponentChildren } from "preact";
import { CSS } from "../assets/styles.js";
import { JS, getSearchJS } from "../assets/scripts.js";

/**
 * Render a Preact VNode to an HTML string
 */
export function renderToHtml(vnode: VNode): string {
  return render(vnode);
}

/**
 * Props for the base HTML document
 */
interface BaseDocumentProps {
  title: string;
  children: ComponentChildren;
  /** Include search JS (for index page) */
  includeSearchJS?: boolean;
  /** Total pages (required if includeSearchJS is true) */
  totalPages?: number;
}

/**
 * Base HTML document component
 *
 * Renders a complete HTML5 document with embedded CSS and JS
 */
export function BaseDocument({
  title,
  children,
  includeSearchJS = false,
  totalPages = 0,
}: BaseDocumentProps): VNode {
  const searchJS = includeSearchJS ? getSearchJS(totalPages) : "";

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <div class="container">{children}</div>
        <script dangerouslySetInnerHTML={{ __html: JS }} />
        {includeSearchJS && (
          <script dangerouslySetInnerHTML={{ __html: searchJS }} />
        )}
      </body>
    </html>
  );
}

/**
 * Render a full HTML document to string
 */
export function renderDocument(props: BaseDocumentProps): string {
  // Add DOCTYPE manually since Preact doesn't render it
  return "<!DOCTYPE html>\n" + renderToHtml(<BaseDocument {...props} />);
}

/**
 * Truncatable wrapper component
 *
 * Wraps content that may be truncated with expand/collapse functionality
 */
interface TruncatableProps {
  children: ComponentChildren;
}

export function Truncatable({ children }: TruncatableProps): VNode {
  return (
    <div class="truncatable">
      <div class="truncatable-content">{children}</div>
      <button class="expand-btn">Show more</button>
    </div>
  );
}
