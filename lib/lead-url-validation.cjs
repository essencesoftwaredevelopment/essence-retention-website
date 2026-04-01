const { lookup } = require("node:dns/promises");

const HOST_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_PATTERN = /^[a-z]{2,24}$/i;

function buildValidationError(message) {
  const error = new Error(message);
  error.name = "LeadUrlValidationError";
  return error;
}

function normalizeLeadUrl(input) {
  if (typeof input !== "string") {
    throw buildValidationError("Enter a valid website address or domain.");
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw buildValidationError("Enter a valid website address or domain.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw buildValidationError("Enter a valid website address or domain.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw buildValidationError("Only http and https website addresses are supported.");
  }

  if (!parsed.hostname) {
    throw buildValidationError("Enter a valid website address or domain.");
  }

  if (parsed.username || parsed.password) {
    throw buildValidationError("Website addresses cannot include login credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split(".");

  if (labels.length < 2) {
    throw buildValidationError("Enter a full domain like brand.com.");
  }

  if (labels.some((label) => !HOST_LABEL_PATTERN.test(label))) {
    throw buildValidationError("This domain has invalid characters.");
  }

  const tld = labels.at(-1) || "";
  if (!TLD_PATTERN.test(tld)) {
    throw buildValidationError("Enter a domain with a valid top-level domain.");
  }

  parsed.hash = "";
  return parsed.toString();
}

async function assertResolvableLeadUrl(normalizedUrl) {
  let hostname;
  try {
    hostname = new URL(normalizedUrl).hostname;
  } catch {
    throw buildValidationError("Enter a valid website address or domain.");
  }

  try {
    await lookup(hostname);
  } catch {
    throw buildValidationError("That domain does not appear to resolve yet. Check the spelling and try again.");
  }
}

async function validateLeadUrl(input) {
  const normalizedUrl = normalizeLeadUrl(input);
  await assertResolvableLeadUrl(normalizedUrl);
  return normalizedUrl;
}

module.exports = {
  normalizeLeadUrl,
  validateLeadUrl,
};