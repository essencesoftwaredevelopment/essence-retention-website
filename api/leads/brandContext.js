const { resolveLeadUrlQuery } = require("../../lib/lead-url-validation.cjs");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  let requestTarget;
  try {
    requestTarget = await resolveLeadUrlQuery(req.query);
  } catch (error) {
    return res.status(400).json({
      error: "Invalid url",
      message: error instanceof Error ? error.message : "Provide a valid website url or domain.",
    });
  }

  try {
    const leadsApiBaseUrl = process.env.LEADS_API_BASE_URL || "https://essence-ai-ten.vercel.app";
    const upstream = new URL("/api/leads/brandContext", leadsApiBaseUrl);
    const currentHost = typeof req.headers?.host === "string" ? req.headers.host : "";

    if (currentHost && upstream.host === currentHost) {
      return res.status(502).json({
        error: "Failed to fetch brand context",
        message: "LEADS_API_BASE_URL points to this deployment and would recurse.",
      });
    }

    upstream.searchParams.set(requestTarget.sourceParam, requestTarget.upstreamParamValue);

    const upstreamResponse = await fetch(upstream, { method: "GET" });
    const text = await upstreamResponse.text();
    const payload = text ? JSON.parse(text) : null;

    if (!upstreamResponse.ok) {
      const message = payload && typeof payload.message === "string"
        ? payload.message
        : "fetch failed";
      return res.status(502).json({
        error: "Failed to fetch brand context",
        message,
      });
    }

    return res.status(200).json(payload ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return res.status(502).json({
      error: "Failed to fetch brand context",
      message,
    });
  }
};
