// Accept: text/markdown content negotiation shared by middleware.js (Vercel)
// and server.mjs (local dev). Runs on the Edge runtime, so no Node imports.

import { MARKDOWN_PAGES, NOT_FOUND_MARKDOWN } from "./markdown-pages.mjs";
import { NON_PAGE_PREFIXES, findRoute } from "./site-routes.mjs";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

const MARKDOWN_SUBTYPES = new Set(["markdown", "x-markdown"]);
const FILE_EXTENSION = /\/[^/]*\.[a-z0-9]+$/i;

// Parses an Accept header into media ranges with their q weights (RFC 9110
// section 12.5.1). Malformed ranges are skipped.
export function parseAccept(header) {
  if (typeof header !== "string" || !header.trim()) return [];

  const ranges = [];
  for (const part of header.split(",")) {
    const [mediaRange, ...params] = part.split(";");
    const [type, subtype] = mediaRange.trim().toLowerCase().split("/");
    if (!type || !subtype) continue;

    let q = 1;
    for (const param of params) {
      const [name, value] = param.split("=").map((piece) => piece.trim());
      if (name.toLowerCase() !== "q") continue;
      const weight = Number(value);
      q = Number.isFinite(weight) ? Math.min(Math.max(weight, 0), 1) : 1;
    }

    ranges.push({ type, subtype, q });
  }

  return ranges;
}

// q for a media type, taken from the most specific matching range.
function qualityFor(ranges, type, subtype) {
  let best = { q: 0, specificity: -1 };

  for (const range of ranges) {
    let specificity = -1;
    if (range.type === type && range.subtype === subtype) specificity = 2;
    else if (range.type === type && range.subtype === "*") specificity = 1;
    else if (range.type === "*" && range.subtype === "*") specificity = 0;

    if (specificity > best.specificity) best = { q: range.q, specificity };
  }

  return best.q;
}

// True when the client names text/markdown and weights it at least as high as
// text/html. Wildcards alone (*/*, text/*) keep the HTML default, so browsers
// and plain curl still get HTML.
export function prefersMarkdown(acceptHeader) {
  const ranges = parseAccept(acceptHeader);
  const markdownQ = Math.max(
    0,
    ...ranges
      .filter((range) => range.type === "text" && MARKDOWN_SUBTYPES.has(range.subtype))
      .map((range) => range.q),
  );

  if (markdownQ <= 0) return false;
  return markdownQ >= qualityFor(ranges, "text", "html");
}

export function isPagePath(pathname) {
  return !NON_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function markdownResponse(status, body) {
  return {
    status,
    headers: {
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      Vary: "Accept",
      "Cache-Control": status === 200 ? "public, max-age=0, must-revalidate" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
    body,
  };
}

// Returns { status, headers, body } when the request should get Markdown, or
// null to let the HTML or static file handler answer as usual.
export function negotiateMarkdown({ method = "GET", pathname = "/", accept = "" } = {}) {
  if (method !== "GET" && method !== "HEAD") return null;
  if (!isPagePath(pathname)) return null;
  if (!prefersMarkdown(accept)) return null;

  const route = findRoute(pathname);
  if (route) {
    // Pages without a Markdown version fall back to their HTML.
    return route.markdown ? markdownResponse(200, MARKDOWN_PAGES[route.markdown]) : null;
  }

  // Files such as /llms.txt or /styles.css are served as they are; a missing
  // one gets the platform 404. Unknown .html files and extensionless paths
  // are missing pages, so agents get a Markdown 404.
  if (FILE_EXTENSION.test(pathname) && !pathname.toLowerCase().endsWith(".html")) {
    return null;
  }

  return markdownResponse(404, NOT_FOUND_MARKDOWN);
}
