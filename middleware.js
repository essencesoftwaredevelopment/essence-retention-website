// Vercel Routing Middleware. Serves Markdown to clients that send
// Accept: text/markdown, including a Markdown 404 for unknown pages.
// Returning nothing lets Vercel serve the static file or HTML page as usual.

import { negotiateMarkdown } from "./lib/markdown-negotiation.mjs";

export const config = {
  runtime: "nodejs",
  // Skip /api/ and /assets/ (lib/site-routes.mjs NON_PAGE_PREFIXES).
  matcher: "/((?!api/|assets/).*)",
};

export default function middleware(request) {
  const { pathname } = new URL(request.url);
  const markdown = negotiateMarkdown({
    method: request.method,
    pathname,
    accept: request.headers.get("accept") || "",
  });

  if (!markdown) return undefined;

  return new Response(request.method === "HEAD" ? null : markdown.body, {
    status: markdown.status,
    headers: markdown.headers,
  });
}
