const { validateLeadUrl } = require("../../lib/lead-url-validation.cjs");

function readRequestUrl(req) {
  if (typeof req.body?.url === "string") {
    return req.body.url;
  }

  if (typeof req.body === "string") {
    try {
      const parsedBody = JSON.parse(req.body);
      return typeof parsedBody?.url === "string" ? parsedBody.url : "";
    } catch {
      return "";
    }
  }

  return "";
}

function readEmailIndex(req) {
  if (typeof req.query?.emailIndex === "string") {
    return req.query.emailIndex;
  }

  if (typeof req.url === "string") {
    try {
      const parsedUrl = new URL(req.url, "http://localhost");
      return parsedUrl.searchParams.get("emailIndex") || "";
    } catch {
      return "";
    }
  }

  return "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const rawUrl = readRequestUrl(req);
  const emailIndex = readEmailIndex(req);

  let normalizedUrl;
  try {
    normalizedUrl = await validateLeadUrl(rawUrl);
  } catch (error) {
    return res.status(400).json({
      error: "Invalid url",
      message: error instanceof Error ? error.message : "Provide a valid website url or domain.",
    });
  }

  try {
    const leadsApiBaseUrl = process.env.LEADS_API_BASE_URL || "https://essence-ai-ten.vercel.app";
    const upstream = new URL("/api/leads/generateHero", leadsApiBaseUrl);
    if (emailIndex) {
      upstream.searchParams.set("emailIndex", emailIndex);
    }

    const currentHost = typeof req.headers?.host === "string" ? req.headers.host : "";

    if (currentHost && upstream.host === currentHost) {
      return res.status(502).json({
        error: "Failed to generate hero",
        message: "LEADS_API_BASE_URL points to this deployment and would recurse.",
      });
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
      return res.status(502).json({
        error: "Failed to generate hero",
        message,
      });
    }

    return res.status(200).json({
      ok: true,
      data: payload ?? {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return res.status(502).json({
      error: "Failed to generate hero",
      message,
    });
  }
};