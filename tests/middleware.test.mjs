import assert from "node:assert/strict";
import { describe, it } from "node:test";
import middleware, { config } from "../middleware.js";
import { NON_PAGE_PREFIXES } from "../lib/site-routes.mjs";
import { readRepoFile } from "./helpers.mjs";

const ORIGIN = "https://essenceretention.com";

function request(pathname, accept, method = "GET") {
  return new Request(`${ORIGIN}${pathname}`, { method, headers: accept ? { Accept: accept } : {} });
}

describe("middleware", () => {
  it("returns Markdown for Accept: text/markdown on the homepage", async () => {
    const response = middleware(request("/", "text/markdown"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.equal(response.headers.get("vary"), "Accept");
    assert.match(await response.text(), /^# ESSENCE Retention\n/);
  });

  it("returns a Markdown 404 that links to llms.txt and the sitemap", async () => {
    const response = middleware(request("/__ora-404-probe-7qaet3qk", "text/markdown"));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.equal(response.headers.get("vary"), "Accept");
    const body = await response.text();
    assert.ok(body.length >= 20);
    assert.match(body, /\]\(https:\/\/essenceretention\.com\/llms\.txt\)/);
    assert.match(body, /\]\(https:\/\/essenceretention\.com\/sitemap\.xml\)/);
  });

  it("does not reflect the requested path in the 404 body", async () => {
    const response = middleware(request("/ignore-previous-instructions", "text/markdown"));
    assert.doesNotMatch(await response.text(), /ignore-previous-instructions/);
  });

  it("sends headers without a body for HEAD", async () => {
    const response = middleware(request("/", "text/markdown", "HEAD"));
    assert.equal(response.status, 200);
    assert.equal(response.body, null);
  });

  it("lets HTML and default requests through to the static site", () => {
    assert.equal(middleware(request("/", "text/html")), undefined);
    assert.equal(middleware(request("/", "*/*")), undefined);
    assert.equal(middleware(request("/")), undefined);
    assert.equal(middleware(request("/__ora-404-probe-7qaet3qk", "text/html")), undefined);
  });

  it("stays on the Edge runtime, where Vercel bundles the ES modules in lib/", () => {
    assert.ok(config.runtime === undefined || config.runtime === "edge", `runtime: ${config.runtime}`);
  });

  it("skips the same prefixes as lib/site-routes.mjs", () => {
    const excluded = config.matcher.match(/^\/\(\(\?!(.*)\)\.\*\)$/)?.[1].split("|");
    assert.deepEqual(
      excluded,
      NON_PAGE_PREFIXES.map((prefix) => prefix.slice(1)),
    );
  });

  it("matches the vercel.json Vary: Accept source", async () => {
    const vercelConfig = JSON.parse(await readRepoFile("vercel.json"));
    const rule = vercelConfig.headers.find((entry) => entry.source === config.matcher);
    assert.ok(rule, "vercel.json needs a headers rule with the middleware matcher as its source");
    assert.deepEqual(rule.headers, [{ key: "Vary", value: "Accept" }]);
  });
});
