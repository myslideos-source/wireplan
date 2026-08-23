// Node's native test runner (node --test) doesn't understand the "@/*"
// path alias from tsconfig.json, nor the extensionless/directory-index
// imports Next.js's bundler resolves automatically (moduleResolution:
// "bundler") — plain Node ESM requires exact file extensions and has no
// directory-to-index-file fallback. This loader replicates just enough of
// that resolution so unit tests can import the app's real modules
// (including their real "@/..." and extensionless imports) unmodified.
// Registered via scripts/test-setup.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC_DIR = path.resolve(process.cwd(), "src");
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function existingFileUrl(absolutePathNoExt) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = absolutePathNoExt + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = existingFileUrl(path.join(SRC_DIR, specifier.slice(2)));
    if (resolved) return nextResolve(resolved, context);
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = fileURLToPath(context.parentURL);
    const absolute = path.resolve(path.dirname(parentPath), specifier);
    const resolved = existingFileUrl(absolute);
    if (resolved) return nextResolve(resolved, context);
  }
  return nextResolve(specifier, context);
}
