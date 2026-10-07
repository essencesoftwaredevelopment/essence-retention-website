import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_ORIGIN, SITE_ROUTES, absoluteUrl, findRoute } from "../lib/site-routes.mjs";
import { extractJsonLd, readRepoFile, visibleTextBlocks } from "./helpers.mjs";

const ROOT_FILES = new Set(["/llms.txt", "/sitemap.xml", "/robots.txt"]);
const LINK_ITEM = /^- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:: (.+))?$/;

function assertSiteLinkResolves(url) {
  const parsed = new URL(url);
  if (parsed.origin !== SITE_ORIGIN) return;
  assert.ok(
    findRoute(parsed.pathname) || ROOT_FILES.has(parsed.pathname),
    `${url} does not match a page in lib/site-routes.mjs`,
  );
}

describe("llms.txt", async () => {
  const text = await readRepoFile("llms.txt");
  const lines = text.split("\n");
  const firstH2 = lines.findIndex((line) => line.startsWith("## "));

  it("opens with an H1 and a blockquote summary", () => {
    assert.match(lines[0], /^# ESSENCE Retention$/);
    const next = lines.slice(1).find((line) => line.trim());
    assert.match(next, /^> \S/);
  });

  it("has no headings in the details block and only H2 sections after it", () => {
    const headings = lines.slice(1).filter((line) => /^#{1,6} /.test(line));
    assert.ok(headings.length > 0);
    for (const heading of headings) assert.match(heading, /^## \S/);
    assert.ok(firstH2 > 0);
  });

  it("uses file lists of links with notes in every H2 section", () => {
    for (const line of lines.slice(firstH2)) {
      if (!line.trim() || line.startsWith("## ")) continue;
      const match = line.match(LINK_ITEM);
      assert.ok(match, `not a file list item: ${line}`);
      assertSiteLinkResolves(match[2]);
    }
  });

  it("has a when-to-use section with specific use cases", () => {
    const start = lines.findIndex((line) => /^## When to use\b/i.test(line));
    assert.ok(start > 0, "missing '## When to use' section");
    const items = [];
    for (const line of lines.slice(start + 1)) {
      if (line.startsWith("## ")) break;
      if (line.trim()) items.push(line.match(LINK_ITEM));
    }
    assert.ok(items.length >= 3);
    for (const item of items) assert.ok(item?.[3]?.length > 40, "each use case needs a note");
  });

  it("tells agents how to book and where to get support", () => {
    assert.ok(text.includes("https://essenceretention.com/booking"));
    assert.ok(text.includes("https://essenceretention.com/support"));
    assert.ok(text.includes("Accept: text/markdown"));
  });

  it("names an Optional section last", () => {
    const sections = lines.filter((line) => line.startsWith("## "));
    assert.equal(sections.at(-1), "## Optional");
  });
});

describe("sitemap.xml", async () => {
  const xml = await readRepoFile("sitemap.xml");
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);

  it("is a sitemaps.org urlset", () => {
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n/);
    assert.match(xml, /<\/urlset>\n$/);
    const outside = xml
      .replace(/^<\?xml[^>]*\?>/, "")
      .replace(/<urlset[^>]*>|<\/urlset>/g, "")
      .replace(/<url>[\s\S]*?<\/url>/g, "");
    assert.equal(outside.trim(), "");
    assert.ok(Buffer.byteLength(xml) < 50 * 1024 * 1024);
    assert.ok(urls.length <= 50000);
  });

  it("lists every indexable page once, with a W3C date lastmod", () => {
    const locs = [];
    for (const url of urls) {
      const loc = url.match(/^\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*$/);
      assert.ok(loc, `bad <url> entry: ${url}`);
      assert.ok(!Number.isNaN(Date.parse(loc[2])), loc[2]);
      locs.push(loc[1]);
    }

    const expected = SITE_ROUTES.filter((route) => route.indexable).map((route) => absoluteUrl(route.path));
    assert.deepEqual(locs, expected, "run npm run generate:sitemap");
  });
});

describe("robots.txt", async () => {
  const text = await readRepoFile("robots.txt");

  it("points crawlers at the sitemap and blocks nothing", () => {
    assert.match(text, /^User-agent: \*$/m);
    assert.match(text, /^Sitemap: https:\/\/essenceretention\.com\/sitemap\.xml$/m);
    assert.doesNotMatch(text, /^Disallow: \/\s*$/m);
  });
});

describe("homepage JSON-LD", async () => {
  const html = await readRepoFile("index.html");
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const graph = extractJsonLd(head).flatMap((data) => data["@graph"] ?? [data]);
  const organization = graph.find((node) => node["@type"] === "Organization");
  const website = graph.find((node) => node["@type"] === "WebSite");

  it("describes the company as a schema.org Organization", () => {
    assert.ok(organization, "missing Organization");
    assert.equal(organization.name, "ESSENCE Retention");
    assert.equal(organization.url, "https://essenceretention.com/");
    assert.ok(organization.description.length > 50);
    assert.equal(organization.email, "jacques@essenceretention.com");
    assert.equal(organization.address["@type"], "PostalAddress");
    assert.equal(organization.founder["@type"], "Person");
  });

  it("references images that exist in the repo", async () => {
    for (const url of [organization.logo, organization.image]) {
      const { pathname } = new URL(url);
      await assert.doesNotReject(readRepoFile(pathname.slice(1)), url);
    }
  });

  it("offers the service tiers shown on the page", () => {
    const tiers = visibleTextBlocks(html, ["h3"]).filter((title) => title.startsWith("ESSENCE "));
    const offered = organization.makesOffer.map((offer) => offer.itemOffered.name);
    assert.deepEqual(offered, tiers);
    for (const offer of organization.makesOffer) {
      assert.equal(offer["@type"], "Offer");
      assert.equal(offer.itemOffered["@type"], "Service");
      assert.ok(html.includes(offer.itemOffered.description), offer.itemOffered.description);
    }
  });

  it("links the WebSite to the Organization", () => {
    assert.ok(website, "missing WebSite");
    assert.equal(website.publisher["@id"], organization["@id"]);
  });
});
