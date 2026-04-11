module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  return res.status(200).json({
    leadsApiBaseUrl: process.env.LEADS_API_BASE_URL || "https://essence-ai-ten.vercel.app",
  });
};
