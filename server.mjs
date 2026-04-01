import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import leadUrlValidation from "./lib/lead-url-validation.cjs";
import dotenv from "dotenv";
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const port = Number(process.env.PORT || 4173);
const leadsApiBaseUrl = process.env.LEADS_API_BASE_URL || "https://essence-ai-ten.vercel.app";
const { validateLeadUrl } = leadUrlValidation;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function handleLeadBrandAssets(req, res, url) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.writeHead(405);
    res.end();
    return;
  }

  const rawUrl = url.searchParams.get("url") || "";

  let normalizedUrl;
  try {
    normalizedUrl = await validateLeadUrl(rawUrl);
  } catch (error) {
    return sendJson(res, 400, {
      error: "Invalid url",
      message: error instanceof Error ? error.message : "Provide a valid website url or domain.",
    });
  }

  try {
    const upstream = new URL("/api/leads/brandAssets", leadsApiBaseUrl);
    upstream.searchParams.set("url", normalizedUrl);

    const upstreamResponse = await fetch(upstream, { method: "GET" });
    const text = await upstreamResponse.text();
    const payload = text ? JSON.parse(text) : null;

    if (!upstreamResponse.ok) {
      const message = payload && typeof payload.message === "string"
        ? payload.message
        : "fetch failed";
      return sendJson(res, 502, {
        error: "Failed to fetch brand assets",
        message,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      data: payload?.data ?? {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return sendJson(res, 502, {
      error: "Failed to fetch brand assets",
      message,
    });
  }
}

async function handleLeadBrandProducts(req, res, url) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.writeHead(405);
    res.end();
    return;
  }

  const rawUrl = url.searchParams.get("url") || "";

  let normalizedUrl;
  try {
    normalizedUrl = await validateLeadUrl(rawUrl);
  } catch (error) {
    return sendJson(res, 400, {
      error: "Invalid url",
      message: error instanceof Error ? error.message : "Provide a valid website url or domain.",
    });
  }

  try {
    const upstream = new URL("/api/leads/brandProducts", leadsApiBaseUrl);
    upstream.searchParams.set("url", normalizedUrl);

    const upstreamResponse = await fetch(upstream, { method: "GET" });
    const text = await upstreamResponse.text();
    const payload = text ? JSON.parse(text) : null;

    if (!upstreamResponse.ok) {
      const message = payload && typeof payload.message === "string"
        ? payload.message
        : "fetch failed";
      return sendJson(res, 502, {
        error: "Failed to fetch brand products",
        message,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      data: {
        success: payload?.success === true,
        url: payload?.url ?? normalizedUrl,
        count: typeof payload?.count === "number" ? payload.count : 0,
        products: Array.isArray(payload?.products) ? payload.products : [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return sendJson(res, 502, {
      error: "Failed to fetch brand products",
      message,
    });
  }
}

async function handleLeadGenerateHero(req, res, url) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.writeHead(405);
    res.end();
    return;
  }

  let requestBody;
  try {
    requestBody = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, {
      error: "Invalid body",
      message: error instanceof Error ? error.message : "Provide a valid JSON body.",
    });
  }

  const rawUrl = typeof requestBody?.url === "string" ? requestBody.url : "";

  let normalizedUrl;
  try {
    normalizedUrl = await validateLeadUrl(rawUrl);
  } catch (error) {
    return sendJson(res, 400, {
      error: "Invalid url",
      message: error instanceof Error ? error.message : "Provide a valid website url or domain.",
    });
  }

  try {
    const upstream = new URL("/api/leads/generateHero", leadsApiBaseUrl);
    const emailIndex = url.searchParams.get("emailIndex");
    if (emailIndex) {
      upstream.searchParams.set("emailIndex", emailIndex);
    }

    const upstreamResponse = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ url: normalizedUrl }),
    });
    const text = await upstreamResponse.text();
    const payload = text ? JSON.parse(text) : null;

    if (!upstreamResponse.ok) {
      const message = payload && typeof payload.message === "string"
        ? payload.message
        : "fetch failed";
      return sendJson(res, 502, {
        error: "Failed to generate hero",
        message,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      data: payload ?? {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return sendJson(res, 502, {
      error: "Failed to generate hero",
      message,
    });
  }
}

function handleLeadBrandFonts(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.writeHead(405);
    res.end();
    return;
  }

  res.writeHead(200);
  res.end();
}

function resolveFilePath(urlPathname) {
  const pathname = decodeURIComponent(urlPathname);
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const absolutePath = path.normalize(path.join(rootDir, cleanPath));

  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  return absolutePath;
}

async function serveStatic(res, filePath) {
  try {
    const stat = await fs.stat(filePath);
    const resolvedPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const data = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${port}`;
  const url = new URL(req.url || "/", `http://${host}`);

  if (url.pathname === "/api/leads/brandAssets") {
    await handleLeadBrandAssets(req, res, url);
    return;
  }

  if (url.pathname === "/api/leads/brandProducts") {
    await handleLeadBrandProducts(req, res, url);
    return;
  }

  if (url.pathname === "/api/leads/generateHero") {
    await handleLeadGenerateHero(req, res, url);
    return;
  }

  if (url.pathname === "/api/leads/brandFonts") {
    handleLeadBrandFonts(req, res);
    return;
  }

  const filePath = resolveFilePath(url.pathname);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  await serveStatic(res, filePath);
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});
