// Every HTML page this site serves. Markdown negotiation, sitemap.xml, and the
// tests read this list, so add new pages here when you add them to the repo.
//
// - path: the public URL path (directory pages have no trailing slash).
// - file: the HTML file on disk, relative to the repo root.
// - indexable: listed in sitemap.xml. Keep false for noindex and private pages.
// - markdown: key into MARKDOWN_PAGES for pages with an Accept: text/markdown
//   representation. Pages without one fall back to HTML.

export const SITE_ORIGIN = "https://essenceretention.com";

export const SITE_ROUTES = [
  { path: "/", file: "index.html", indexable: true, markdown: "home" },
  { path: "/booking", file: "booking/index.html", indexable: true, markdown: "booking" },
  { path: "/support", file: "support/index.html", indexable: true, markdown: "support" },
  { path: "/privacy-policy", file: "privacy-policy/index.html", indexable: true },
  {
    path: "/data-deletion-instructions",
    file: "data-deletion-instructions/index.html",
    indexable: true,
  },
  { path: "/essence-ai/privacy", file: "essence-ai/privacy/index.html", indexable: true },
  { path: "/thank-you", file: "thank-you/index.html", indexable: false },
  { path: "/acq-build-offer", file: "acq-build-offer/index.html", indexable: false },
  { path: "/audit-angel-ruche", file: "audit-angel-ruche/index.html", indexable: false },
  {
    path: "/audit-angel-ruche/quiz-demo.html",
    file: "audit-angel-ruche/quiz-demo.html",
    indexable: false,
  },
  { path: "/carousel.html", file: "carousel.html", indexable: false },
];

// Path prefixes that never serve pages. The Vercel middleware matcher skips
// them too, so keep the two lists in sync.
export const NON_PAGE_PREFIXES = ["/api/", "/assets/"];

const routesByPath = new Map(SITE_ROUTES.map((route) => [route.path, route]));

// Maps the URL variants Vercel serves for one page to its registry path:
// "/booking/", "/booking/index.html" and "/booking" all become "/booking".
export function normalizePagePath(pathname) {
  let normalized = pathname || "/";
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;

  if (normalized === "/index.html") return "/";
  if (normalized.endsWith("/index.html")) {
    normalized = normalized.slice(0, -"/index.html".length);
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized || "/";
}

export function findRoute(pathname) {
  return routesByPath.get(normalizePagePath(pathname)) || null;
}

export function absoluteUrl(path) {
  return new URL(path, SITE_ORIGIN).toString();
}
