// Writes sitemap.xml from the indexable pages in lib/site-routes.mjs.
// lastmod is the date of the last commit that touched the page's HTML file,
// or today when the file has uncommitted changes. Run after editing a page:
//   npm run generate:sitemap

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ROUTES, absoluteUrl } from "../lib/site-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const outputPath = path.join(rootDir, "sitemap.xml");

function git(args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

function lastModified(file) {
  const today = new Date().toISOString().slice(0, 10);
  if (git(["status", "--porcelain", "--", file])) return today;
  return git(["log", "-1", "--format=%cs", "--", file]) || today;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const entries = SITE_ROUTES.filter((route) => route.indexable).map(
  (route) => `  <url>
    <loc>${escapeXml(absoluteUrl(route.path))}</loc>
    <lastmod>${lastModified(route.file)}</lastmod>
  </url>`,
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

await fs.writeFile(outputPath, xml, "utf8");
console.log(`[sitemap] wrote ${entries.length} URLs to ${outputPath}`);
