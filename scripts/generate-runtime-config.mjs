import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "assets/js/runtime-config.generated.js");

const leadsApiBaseUrl = process.env.LEADS_API_BASE_URL || "";

if (!leadsApiBaseUrl) {
  throw new Error("LEADS_API_BASE_URL is not set.");
}

const output = `window.__ESSENCE_RUNTIME_CONFIG__ = ${JSON.stringify({
  leadsApiBaseUrl,
}, null, 2)};
`;

await fs.writeFile(outputPath, output, "utf8");
console.log(`[runtime-config] wrote ${outputPath}`);
