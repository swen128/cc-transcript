# CLAUDE.md

This file provides guidance when working with code in this repository.

## Project Overview

cc-transcript is a TypeScript library that converts Claude Code session files (JSON/JSONL) to paginated HTML transcripts.

## Commands

```bash
bun run src/index.ts # Run the library
bun test             # Run tests
```

## Architecture

### Data Flow

Session file (JSON/JSONL) → Parse → Group into conversations → Paginate → Render HTML pages

### Key Modules

- **`src/schemas.ts`** - Zod schemas for Claude Code session data (content blocks, messages, loglines)
- **`src/parse.ts`** - Parses JSON and JSONL session files, auto-detects format
- **`src/render/transcript.ts`** - Main orchestrator: groups loglines into conversations, paginates, renders index + pages
- **`src/render/content-blocks.tsx`** - Renders content blocks (text, thinking, tool_use, tool_result, image)
- **`src/render/tool-renderers.tsx`** - Specialized renderers for Write, Edit, Bash, and TodoWrite tools
- **`src/render/jsx.tsx`** - Preact SSR utilities, document wrapper, Truncatable component
- **`src/assets/`** - Embedded CSS and JS for the generated HTML

### Content Block Types

The library handles these Claude message content block types:
- `text` - Regular assistant text (rendered as Markdown)
- `thinking` - Internal reasoning blocks
- `tool_use` - Tool invocations with JSON input
- `tool_result` - Tool execution results
- `image` - Base64-encoded images

### Output Structure

`renderTranscript()` returns a `TranscriptOutput` with:
- `files: Map<string, string>` - HTML files (index.html, page-1.html, page-2.html, ...)
- `writeTo(dir)` - Writes all files to a directory

## Tech Stack

- **Package manager**: Bun
- **Rendering**: Preact + preact-render-to-string (server-side)
- **Validation**: Zod v4
- **Markdown**: marked
- **JSX**: `jsxImportSource: "preact"` in tsconfig.json
