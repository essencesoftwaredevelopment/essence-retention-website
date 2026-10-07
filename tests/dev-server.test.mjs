// Runs server.mjs and repeats the curl checks from the agent-readiness audit
// against it, so local dev matches what middleware.js does on Vercel.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { rootDir } from "./helpers.mjs";

let server;
let baseUrl;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(rootDir, "server.mjs")], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dev server did not start")), 10000);
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Dev server running")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once("exit", (code) => reject(new Error(`dev server exited with ${code}`)));
  });
});

after(() => server?.kill());

function get(pathname, accept, method = "GET") {
  return fetch(`${baseUrl}${pathname}`, { method, headers: accept ? { Accept: accept } : {} });
}

describe("dev server", () => {
  it("serves Markdown on / for Accept: text/markdown", async () => {
    const response = await get("/", "text/markdown");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.equal(response.headers.get("vary"), "Accept");
    assert.match(await response.text(), /^# ESSENCE Retention\n/);
  });

  it("still serves HTML on / for Accept: text/html", async () => {
    const response = await get("/", "text/html");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(response.headers.get("vary"), "Accept");
    assert.match(await response.text(), /^<!DOCTYPE html>/);
  });

  it("returns a Markdown 404 for a missing page", async () => {
    const response = await get("/__ora-404-probe-7qaet3qk", "text/markdown");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.match(await response.text(), /llms\.txt/);
  });

  it("keeps the plain 404 for browsers", async () => {
    const response = await get("/__ora-404-probe-7qaet3qk", "text/html");
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Not Found");
  });

  it("answers HEAD without a body", async () => {
    const response = await get("/", "text/markdown", "HEAD");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.equal(await response.text(), "");
  });

  it("serves the machine-readable files with their types", async () => {
    const expectations = {
      "/llms.txt": "text/plain; charset=utf-8",
      "/sitemap.xml": "application/xml; charset=utf-8",
      "/robots.txt": "text/plain; charset=utf-8",
    };
    for (const [pathname, type] of Object.entries(expectations)) {
      for (const accept of ["text/markdown", "*/*"]) {
        const response = await get(pathname, accept);
        assert.equal(response.status, 200, `${pathname} (${accept})`);
        assert.equal(response.headers.get("content-type"), type, pathname);
      }
    }
  });

  it("leaves the API routes alone", async () => {
    const response = await get("/api/runtime-config", "text/markdown");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^application\/json/);
  });
});
