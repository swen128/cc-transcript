/**
 * Pagination component
 */

import type { VNode } from "preact";
import { renderToHtml } from "./jsx.js";
import { PROMPTS_PER_PAGE } from "../types.js";

/**
 * Format page number as 3-digit string
 */
export function formatPageNum(pageNum: number): string {
  return String(pageNum).padStart(3, "0");
}

/**
 * Get page filename
 */
export function getPageFilename(pageNum: number): string {
  return `page-${formatPageNum(pageNum)}.html`;
}

/**
 * Props for Pagination component
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

/**
 * Pagination component for regular pages
 */
export function Pagination({ currentPage, totalPages }: PaginationProps): VNode {
  if (totalPages <= 1) {
    return (
      <div class="pagination">
        <a href="index.html" class="index-link">
          Index
        </a>
      </div>
    );
  }

  const pageLinks: VNode[] = [];
  for (let page = 1; page <= totalPages; page++) {
    if (page === currentPage) {
      pageLinks.push(<span class="current">{page}</span>);
    } else {
      pageLinks.push(<a href={getPageFilename(page)}>{page}</a>);
    }
  }

  return (
    <div class="pagination">
      <a href="index.html" class="index-link">
        Index
      </a>
      {currentPage > 1 ? (
        <a href={getPageFilename(currentPage - 1)}>&larr; Prev</a>
      ) : (
        <span class="disabled">&larr; Prev</span>
      )}
      {pageLinks}
      {currentPage < totalPages ? (
        <a href={getPageFilename(currentPage + 1)}>Next &rarr;</a>
      ) : (
        <span class="disabled">Next &rarr;</span>
      )}
    </div>
  );
}

/**
 * Props for IndexPagination component
 */
interface IndexPaginationProps {
  totalPages: number;
}

/**
 * Pagination component for index page
 */
export function IndexPagination({ totalPages }: IndexPaginationProps): VNode {
  if (totalPages < 1) {
    return (
      <div class="pagination">
        <span class="current">Index</span>
      </div>
    );
  }

  const pageLinks: VNode[] = [];
  for (let page = 1; page <= totalPages; page++) {
    pageLinks.push(<a href={getPageFilename(page)}>{page}</a>);
  }

  return (
    <div class="pagination">
      <span class="current">Index</span>
      <span class="disabled">&larr; Prev</span>
      {pageLinks}
      {totalPages >= 1 ? (
        <a href={getPageFilename(1)}>Next &rarr;</a>
      ) : (
        <span class="disabled">Next &rarr;</span>
      )}
    </div>
  );
}

/**
 * Render pagination to HTML string
 */
export function renderPagination(currentPage: number, totalPages: number): string {
  return renderToHtml(<Pagination currentPage={currentPage} totalPages={totalPages} />);
}

/**
 * Render index pagination to HTML string
 */
export function renderIndexPagination(totalPages: number): string {
  return renderToHtml(<IndexPagination totalPages={totalPages} />);
}

/**
 * Group loglines into conversations
 *
 * A conversation starts with a non-empty user message (that is not a tool result)
 * and includes all subsequent messages until the next user prompt.
 */
export interface ConversationMessage {
  type: "user" | "assistant";
  messageJson: string;
  timestamp: string;
}

export interface Conversation {
  userText: string;
  timestamp: string;
  messages: ConversationMessage[];
  isContinuation: boolean;
}

/**
 * Paginate conversations into pages
 *
 * @param conversations - Array of conversations
 * @param promptsPerPage - Number of prompts per page (default: 5)
 * @returns Array of pages, each containing an array of conversations
 */
export function paginateConversations(
  conversations: Conversation[],
  promptsPerPage: number = PROMPTS_PER_PAGE
): Conversation[][] {
  const pages: Conversation[][] = [];
  let currentPage: Conversation[] = [];

  for (const conv of conversations) {
    currentPage.push(conv);

    if (currentPage.length >= promptsPerPage) {
      pages.push(currentPage);
      currentPage = [];
    }
  }

  // Add remaining conversations
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Calculate total number of pages
 */
export function calculateTotalPages(
  totalConversations: number,
  promptsPerPage: number = PROMPTS_PER_PAGE
): number {
  if (totalConversations === 0) {
    return 0;
  }
  return Math.ceil(totalConversations / promptsPerPage);
}
