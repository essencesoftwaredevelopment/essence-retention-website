import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function readRepoFile(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function htmlToText(html) {
  return collapseWhitespace(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity] ?? entity),
  );
}

// Visible text blocks (headings, paragraphs, list items, quotes) from the
// <main> element, or the whole <body> when a page has no <main>.
export function visibleTextBlocks(html, tags = ["h1", "h2", "h3", "h4", "h5", "p", "li", "blockquote"]) {
  const scope =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html;

  const cleaned = scope
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<span class="material-symbols-rounded[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");

  const pattern = new RegExp(`<(${tags.join("|")})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, "gi");
  const blocks = [];
  for (const match of cleaned.matchAll(pattern)) {
    const text = htmlToText(match[2]).replace(/:$/, "");
    if (text && !/^[★\s]+$/.test(text)) blocks.push(text);
  }
  return blocks;
}

// Markdown reduced to its readable text: link labels kept, markup dropped.
export function markdownToText(markdown) {
  return collapseWhitespace(
    markdown
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/\\\n/g, "\n")
      .replace(/^\s*(?:#{1,6}|>|-|\d+\.)\s+/gm, ""),
  );
}

export function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]),
  );
}
