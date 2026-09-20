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

// Public Mux playback ID only — never include Mux API secrets in client config.
const vslPlaybackId =
  process.env.NEXT_PUBLIC_VSL_PLAYBACK_ID ||
  process.env.VSL_PLAYBACK_ID ||
  "";

const output = `window.__ESSENCE_RUNTIME_CONFIG__ = ${JSON.stringify(
  {
    leadsApiBaseUrl,
    vslPlaybackId,
  },
  null,
  2
)};
`;

await fs.writeFile(outputPath, output, "utf8");
console.log(`[runtime-config] wrote ${outputPath}`);
