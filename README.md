# cc-transcript

TypeScript library that converts Claude Code session files (JSON/JSONL) to paginated HTML transcripts.

## Installation

```bash
npm install cc-transcript
```

## Usage

### CLI

```bash
npx cc-transcript <input-file> [output-dir] [--repo <owner/repo>]
```

Example:

```bash
npx cc-transcript ~/.claude/projects/myproject/session.jsonl ./output
npx cc-transcript session.jsonl ./output --repo myorg/myrepo
```

### Programmatic API

```typescript
import { renderTranscriptFromFile } from "cc-transcript";

const output = await renderTranscriptFromFile("session.jsonl", {
  githubRepo: "owner/repo", // optional: enables commit links
});

await output.writeTo("./output");
```

## Output

Generates:
- `index.html` - Index page with prompts, tool stats, and assistant previews
- `page-001.html`, `page-002.html`, ... - Paginated transcript pages

## Acknowledgements

Ported from [simonw/claude-code-transcripts](https://github.com/simonw/claude-code-transcripts).
