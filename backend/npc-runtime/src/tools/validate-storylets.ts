// Storylet data validation, run as part of `bun run check`.
// Loads and validates every compiled storylet against the zod schema + the
// structural integrity rules (Korean strings, safety gradient, route citation).

import { readdirSync } from "node:fs";
import { parseStorylet, storyletDataDir } from "../runtime/storylet.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const dir = storyletDataDir();
  const files = readdirSync(dir).filter(name => name.endsWith(".json"));
  if (files.length === 0) {
    console.error(`no storylet data found in ${dir}`);
    process.exit(1);
  }
  const problems: string[] = [];
  for (const file of files) {
    const path = resolve(dir, file);
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8"));
      const storylet = parseStorylet(raw);
      console.log(`ok: ${file} (${storylet.storyletId}, ${storylet.beats.length} beats)`);
    } catch (error) {
      problems.push(`${file}: ${(error as Error).message}`);
    }
  }
  if (problems.length > 0) {
    console.error(`storylet validation failed:\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log(`validated ${files.length} storylet file(s)`);
}

main();
