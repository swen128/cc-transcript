import { renderTranscriptFromFile } from "./src/index.ts";

const inputFile = process.argv[2] || "./fixtures/input/sample_session.json";
const outputDir = process.argv[3] || "./output";

console.log(`Converting: ${inputFile}`);
console.log(`Output dir: ${outputDir}`);

const output = await renderTranscriptFromFile(inputFile, {
  githubRepo: "example/project",
});

console.log(`\nGenerated ${output.files.size} files:`);
for (const filename of output.files.keys()) {
  console.log(`  - ${filename}`);
}

await output.writeTo(outputDir);
console.log(`\nWritten to ${outputDir}/`);
