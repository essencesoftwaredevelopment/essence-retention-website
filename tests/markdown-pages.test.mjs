import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MARKDOWN_PAGES, NOT_FOUND_MARKDOWN } from "../lib/markdown-pages.mjs";
import { SITE_ROUTES } from "../lib/site-routes.mjs";
import { markdownToText, readRepoFile, visibleTextBlocks } from "./helpers.mjs";

// The booking page is mostly form controls, so only its headings are compared.
const TAGS_BY_PAGE = {
  booking: ["h1", "h2", "h3", "h4", "h5"],
};

function unescapeJsString(value) {
  return value.replace(/\\(['"\\])/g, "$1");
}

async function homepageFaqs() {
  const source = await readRepoFile("assets/js/site-interactions.js");
  const faqBlock = source.match(/const faqData = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const pattern = /question:\s*'((?:\\.|[^'\\])*)',\s*answer:\s*'((?:\\.|[^'\\])*)'/g;
  return [...faqBlock.matchAll(pattern)].map((match) => ({
    question: unescapeJsString(match[1]),
    answer: unescapeJsString(match[2]),
  }));
}

describe("Markdown pages", () => {
  for (const route of SITE_ROUTES.filter((entry) => entry.markdown)) {
    it(`${route.path} Markdown contains the visible text of ${route.file}`, async () => {
      const html = await readRepoFile(route.file);
      const markdownText = markdownToText(MARKDOWN_PAGES[route.markdown]);
      const blocks = visibleTextBlocks(html, TAGS_BY_PAGE[route.markdown]);

      assert.ok(blocks.length > 0, `no text found in ${route.file}`);
      const missing = blocks.filter((block) => !markdownText.includes(block));
      assert.deepEqual(missing, [], `update lib/markdown-pages.mjs to match ${route.file}`);
    });
  }

  it("homepage Markdown contains every FAQ from site-interactions.js", async () => {
    const faqs = await homepageFaqs();
    assert.ok(faqs.length >= 10, "faqData should parse");

    const markdownText = markdownToText(MARKDOWN_PAGES.home);
    for (const { question, answer } of faqs) {
      assert.ok(markdownText.includes(question), `missing FAQ question: ${question}`);
      for (const fragment of answer.split(/<br\s*\/?>/i)) {
        const text = fragment.replace(/^\s*•\s*/, "").trim();
        if (text) assert.ok(markdownText.includes(text), `missing FAQ answer text: ${text}`);
      }
    }
  });

  it("every Markdown page starts with one H1", () => {
    for (const [key, markdown] of Object.entries(MARKDOWN_PAGES)) {
      assert.match(markdown, /^# \S/, key);
      assert.equal(markdown.match(/^# /gm).length, 1, key);
    }
  });

  it("the 404 body explains the error and links to llms.txt and the sitemap", () => {
    assert.match(NOT_FOUND_MARKDOWN, /^# 404 Not Found\n/);
    const explanation = NOT_FOUND_MARKDOWN.split("\n").find((line) => line && !line.startsWith("#"));
    assert.ok(explanation.length >= 20);
    assert.ok(NOT_FOUND_MARKDOWN.includes("(https://essenceretention.com/llms.txt)"));
    assert.ok(NOT_FOUND_MARKDOWN.includes("(https://essenceretention.com/sitemap.xml)"));
  });
});
