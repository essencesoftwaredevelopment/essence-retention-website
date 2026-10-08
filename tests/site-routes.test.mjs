import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { MARKDOWN_PAGES } from "../lib/markdown-pages.mjs";
import { SITE_ROUTES, findRoute, normalizePagePath } from "../lib/site-routes.mjs";
import { readRepoFile, rootDir } from "./helpers.mjs";

const SKIPPED_DIRS = new Set([".git", "node_modules", "assets", ".vercel"]);

async function htmlFilesInRepo(dir = rootDir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...(await htmlFilesInRepo(path.join(dir, entry.name))));
    } else if (entry.name.endsWith(".html")) {
      files.push(path.relative(rootDir, path.join(dir, entry.name)).split(path.sep).join("/"));
    }
  }
  return files;
}

describe("site routes", () => {
  it("registers every HTML page in the repo, and only those", async () => {
    const onDisk = (await htmlFilesInRepo()).sort();
    const registered = SITE_ROUTES.map((route) => route.file).sort();
    assert.deepEqual(registered, onDisk, "add new pages to lib/site-routes.mjs");
  });

  it("maps each path to its file", () => {
    for (const route of SITE_ROUTES) {
      const expected = route.path === "/" ? "index.html" : route.path.endsWith(".html")
        ? route.path.slice(1)
        : `${route.path.slice(1)}/index.html`;
      assert.equal(route.file, expected, route.path);
    }
  });

  it("keeps noindex pages out of the sitemap", async () => {
    for (const route of SITE_ROUTES) {
      const html = await readRepoFile(route.file);
      if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
        assert.equal(route.indexable, false, `${route.path} is noindex`);
      }
    }
  });

  it("points every markdown key at a Markdown page", () => {
    for (const route of SITE_ROUTES.filter((entry) => entry.markdown)) {
      assert.equal(typeof MARKDOWN_PAGES[route.markdown], "string", route.path);
    }
  });

  it("normalizes the URL variants of a page", () => {
    assert.equal(normalizePagePath("/"), "/");
    assert.equal(normalizePagePath("/index.html"), "/");
    assert.equal(normalizePagePath("/booking/"), "/booking");
    assert.equal(normalizePagePath("/booking/index.html"), "/booking");
    assert.equal(normalizePagePath("/essence-ai/privacy/"), "/essence-ai/privacy");
    assert.equal(findRoute("/support/")?.file, "support/index.html");
    assert.equal(findRoute("/nope"), null);
  });
});
