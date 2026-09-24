#!/usr/bin/env node
/**
 * Lightweight local/CI secret + hygiene scan (no third-party deps).
 * Intentionally conservative: high-signal patterns only.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const self = fileURLToPath(import.meta.url);

const SKIP_DIRS = new Set([".git", "node_modules", "assets"]);
const TEXT_EXT = new Set([".js", ".mjs", ".json", ".md", ".html", ".css", ".yml", ".yaml", ".webmanifest"]);

const SECRET_PATTERNS = [
  { name: "private key block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "aws access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "github token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "stripe live key", re: /\bsk_live_[0-9a-zA-Z]{20,}\b/ },
  {
    name: "generic api assignment",
    re: /(?:api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{32,}['"]/i,
  },
];

const errors = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (TEXT_EXT.has(ext(name))) scanFile(full);
  }
}

function ext(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i);
}

function scanFile(file) {
  if (file === self) return;
  const rel = file.slice(root.length + 1);
  const text = readFileSync(file, "utf8");

  for (const p of SECRET_PATTERNS) {
    if (p.re.test(text)) {
      errors.push(`${rel}: possible ${p.name}`);
    }
  }

  // Gameplay/browser ESM under js/ must stay free of CJS require and eval.
  // e2e may createRequire for optional Playwright resolution.
  const isGameJs =
    (file.endsWith(".js") || file.endsWith(".mjs")) &&
    (rel.startsWith("js/") || rel.startsWith("content/"));
  if (isGameJs) {
    if (/\brequire\s*\(/.test(text)) {
      errors.push(`${rel}: require() in ESM path`);
    }
    if (new RegExp("\\be" + "val\\s*\\(").test(text)) {
      errors.push(`${rel}: eval not allowed`);
    }
  }
}

walk(root);

if (errors.length) {
  console.error("security-scan failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("security-scan ok");
