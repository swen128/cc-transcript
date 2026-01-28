#!/usr/bin/env node

import { renderTranscriptFromFile } from "./index.js";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
cc-transcript - Convert Claude Code session files to HTML transcripts

Usage:
  cc-transcript <input-file> [output-dir] [--repo <owner/repo>]

Arguments:
  input-file   Path to session file (.json or .jsonl)
  output-dir   Output directory (default: ./output)

Options:
  --repo       GitHub repo for commit links (e.g., owner/repo)
  --help, -h   Show this help message

Examples:
  cc-transcript session.jsonl
  cc-transcript session.jsonl ./output --repo myorg/myrepo
`);
  process.exit(0);
}

const inputFile = args[0];
if (!inputFile) {
  console.error("Error: Input file is required");
  process.exit(1);
}

let outputDir = "./output";
let githubRepo: string | undefined;

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--repo" && args[i + 1]) {
    githubRepo = args[i + 1];
    i++;
  } else if (!arg?.startsWith("--")) {
    outputDir = arg ?? outputDir;
  }
}

console.log(`Converting: ${inputFile}`);
console.log(`Output dir: ${outputDir}`);
if (githubRepo) {
  console.log(`GitHub repo: ${githubRepo}`);
}

try {
  const output = await renderTranscriptFromFile(inputFile, { githubRepo });

  console.log(`\nGenerated ${output.files.size} files:`);
  for (const filename of output.files.keys()) {
    console.log(`  - ${filename}`);
  }

  await output.writeTo(outputDir);
  console.log(`\nWritten to ${outputDir}/`);
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
