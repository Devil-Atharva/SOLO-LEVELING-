#!/usr/bin/env node
// Enforces U-14 / D-036: the student app ships no AI vendor SDK and contacts no AI host.
// 1) No AI SDK anywhere in the app's dependency tree (package-lock.json).
// 2) If a production build exists, no AI host names or GEMINI_ variables in .next/static or .next/server.
// Offline drafting lives in tools/content-drafting/ with its own package.json and is not scanned here.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_PACKAGES = [/^@google\/genai$/, /^@google\/generative-ai$/, /^@google-cloud\/vertexai$/, /^openai$/, /^@anthropic-ai\//, /^@ai-sdk\//, /^ai$/, /^cohere-ai$/, /^@mistralai\//, /^groq-sdk$/];
const FORBIDDEN_STRINGS = ["generativelanguage.googleapis.com", "aiplatform.googleapis.com", "api.openai.com", "api.anthropic.com", "GEMINI_API_KEY", "GEMINI_"];
const problems = [];

const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
for (const key of Object.keys(lock.packages ?? {})) {
  const name = key.replace(/^.*node_modules\//, "");
  if (name && FORBIDDEN_PACKAGES.some((re) => re.test(name))) problems.push(`AI SDK in dependency tree: ${key}`);
}

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|html|json|txt|rsc)$/.test(f) && s.size < 8_000_000) out.push(p);
  }
  return out;
};
const built = existsSync(join(root, ".next"));
let scanned = 0;
if (built) {
  for (const file of [...walk(join(root, ".next", "static")), ...walk(join(root, ".next", "server"))]) {
    scanned++;
    const text = readFileSync(file, "utf8");
    for (const s of FORBIDDEN_STRINGS) if (text.includes(s)) problems.push(`"${s}" found in ${file.slice(root.length + 1)}`);
  }
}

if (problems.length) {
  for (const p of problems) console.error("ERROR", p);
  process.exit(1);
}
console.log(`No AI SDK in the app's dependency tree (${Object.keys(lock.packages ?? {}).length} packages checked).` +
  (built ? ` No AI hosts or GEMINI_ variables in the production build (${scanned} files scanned).` : " No production build to scan yet (run npm run build first)."));
