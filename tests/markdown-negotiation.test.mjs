import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MARKDOWN_CONTENT_TYPE,
  negotiateMarkdown,
  parseAccept,
  prefersMarkdown,
} from "../lib/markdown-negotiation.mjs";
import { MARKDOWN_PAGES, NOT_FOUND_MARKDOWN } from "../lib/markdown-pages.mjs";

describe("parseAccept", () => {
  it("reads media ranges and q weights", () => {
    assert.deepEqual(parseAccept("text/markdown;q=0.8, Text/HTML, */*;q=0.1"), [
      { type: "text", subtype: "markdown", q: 0.8 },
      { type: "text", subtype: "html", q: 1 },
      { type: "*", subtype: "*", q: 0.1 },
    ]);
  });

  it("skips malformed ranges and clamps weights", () => {
    assert.deepEqual(parseAccept("garbage, text/markdown;q=7, text/html;q=-1"), [
      { type: "text", subtype: "markdown", q: 1 },
      { type: "text", subtype: "html", q: 0 },
    ]);
    assert.deepEqual(parseAccept(""), []);
    assert.deepEqual(parseAccept(undefined), []);
  });
});

describe("prefersMarkdown", () => {
  const cases = [
    ["text/markdown", true],
    ["text/markdown, text/html", true],
    ["text/html;q=0.9, text/markdown", true],
    ["text/markdown;q=0.5, */*;q=0.1", true],
    ["text/x-markdown", true],
    ["text/markdown, text/plain;q=0.8, */*;q=0.5", true],
    ["text/html", false],
    ["text/html, text/markdown;q=0.5", false],
    ["text/markdown;q=0", false],
    ["*/*", false],
    ["text/*", false],
    ["text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", false],
    ["", false],
  ];

  for (const [accept, expected] of cases) {
    it(`${expected ? "prefers" : "does not prefer"} Markdown for "${accept}"`, () => {
      assert.equal(prefersMarkdown(accept), expected);
    });
  }
});

describe("negotiateMarkdown", () => {
  it("serves the homepage as Markdown with Vary: Accept", () => {
    const result = negotiateMarkdown({ pathname: "/", accept: "text/markdown" });
    assert.equal(result.status, 200);
    assert.equal(result.headers["Content-Type"], MARKDOWN_CONTENT_TYPE);
    assert.equal(result.headers.Vary, "Accept");
    assert.equal(result.body, MARKDOWN_PAGES.home);
  });

  it("accepts the URL variants Vercel serves for a page", () => {
    for (const pathname of ["/index.html", "/booking/", "/booking/index.html", "/support"]) {
      assert.equal(negotiateMarkdown({ pathname, accept: "text/markdown" })?.status, 200, pathname);
    }
  });

  it("returns a Markdown 404 for unknown pages", () => {
    for (const pathname of ["/__ora-404-probe-7qaet3qk", "/booking/extra", "/missing.html", "/lib"]) {
      const result = negotiateMarkdown({ pathname, accept: "text/markdown" });
      assert.equal(result?.status, 404, pathname);
      assert.equal(result.headers["Content-Type"], MARKDOWN_CONTENT_TYPE);
      assert.equal(result.headers.Vary, "Accept");
      assert.equal(result.body, NOT_FOUND_MARKDOWN);
    }
  });

  it("leaves HTML requests, other methods, and non-page paths alone", () => {
    assert.equal(negotiateMarkdown({ pathname: "/", accept: "text/html" }), null);
    assert.equal(negotiateMarkdown({ pathname: "/missing", accept: "*/*" }), null);
    assert.equal(negotiateMarkdown({ method: "POST", pathname: "/", accept: "text/markdown" }), null);
    assert.equal(negotiateMarkdown({ pathname: "/api/runtime-config", accept: "text/markdown" }), null);
    assert.equal(negotiateMarkdown({ pathname: "/assets/missing", accept: "text/markdown" }), null);
  });

  it("answers HEAD like GET", () => {
    assert.equal(negotiateMarkdown({ method: "HEAD", pathname: "/", accept: "text/markdown" })?.status, 200);
  });

  it("falls back to HTML for pages without a Markdown version", () => {
    assert.equal(negotiateMarkdown({ pathname: "/privacy-policy", accept: "text/markdown" }), null);
    assert.equal(negotiateMarkdown({ pathname: "/carousel.html", accept: "text/markdown" }), null);
  });

  it("passes static files through to the file server", () => {
    for (const pathname of ["/llms.txt", "/sitemap.xml", "/robots.txt", "/styles.css", "/nope.txt"]) {
      assert.equal(negotiateMarkdown({ pathname, accept: "text/markdown" }), null, pathname);
    }
  });
});
