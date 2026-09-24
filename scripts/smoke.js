#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const exists = (p) => existsSync(join(root, p));

function listJs(dir) {
  const out = [];
  if (!exists(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listJs(full));
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

const gameHtml = read("game.html");
const indexHtml = read("index.html");
const pkg = JSON.parse(read("package.json"));

assert.ok(gameHtml.includes('id="game-container"'), "game.html missing #game-container");
assert.ok(
  gameHtml.includes('type="module"') && gameHtml.includes("js/game.js"),
  "game.html must load js/game.js as module"
);
assert.ok(indexHtml.includes('href="game.html"'), "index.html missing play link");

assert.ok(
  /bakery-street-project\.github\.io\/voidshatterecho/.test(pkg.homepage),
  "package.json homepage missing Pages URL"
);
assert.ok(
  pkg.repository.url.includes("Bakery-street-project/voidshatterecho"),
  "package.json repository incorrect"
);
assert.ok(
  !pkg.repository.url.includes("bakery-street-projct"),
  "package.json repository still has typo org"
);

const requiredContent = [
  "content/v1/balance.json",
  "content/v1/zones.json",
  "content/v1/items.json",
  "content/v1/dialogue.json",
  "content/v1/encounters.json",
  "js/core/state.js",
  "js/core/save.js",
  "js/core/victory.js",
  "js/core/travel.js",
  "js/core/actions.js",
  "js/core/rng.js",
  "js/core/ai.js",
  "js/core/beats.js",
  "js/core/analytics.js",
  "js/content/loader.js",
  "js/ui/render.js",
  "js/game.js",
  "css/tokens.css",
  "css/game.css",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/hero.jpg",
  "assets/portraits/child-ai.webp",
  "assets/zones/void-entrance.webp",
  "assets/zones/dragon-realm.webp",
  "assets/zones/lattice-void.webp",
  "assets/zones/elohim-chamber.webp",
  "docs/PLAYTEST.md",
  "docs/DESIGN.md",
  "docs/launch/hn.md",
  ".github/ISSUE_TEMPLATE/balance.md",
  ".github/ISSUE_TEMPLATE/crash.md",
  ".github/ISSUE_TEMPLATE/save-corrupt.md",
  "scripts/check-content.js",
  "scripts/balance-sim.js",
  "scripts/security-scan.js",
  ".githooks/pre-push",
];
for (const file of requiredContent) {
  assert.ok(exists(file), `missing ${file}`);
  const text = read(file);
  assert.ok(!text.includes("bakery-street-projct"), `${file} has typo org`);
}

const balance = JSON.parse(read("content/v1/balance.json"));
assert.equal(balance.saveKey, "voidshatterecho_save_v1");
assert.ok(Array.isArray(balance.winGate.requireItems));
assert.ok(balance.winGate.requireItems.includes("dragon_tear"));
assert.ok(balance.winGate.requireItems.includes("lattice_shard"));

const zones = JSON.parse(read("content/v1/zones.json")).zones;
const requiredZones = [
  "void_entrance",
  "dragon_realm",
  "lattice_void",
  "elohim_chamber",
];
for (const z of requiredZones) {
  assert.ok(zones[z], `missing zone ${z}`);
  assert.ok(Array.isArray(zones[z].actions) && zones[z].actions.length > 0, `${z} actions`);
  assert.ok(zones[z].exits, `${z} exits`);
  assert.ok(Array.isArray(zones[z].entryBeats) && zones[z].entryBeats.length > 0, `${z} entryBeats`);
  assert.ok(Array.isArray(zones[z].ambientBeats) && zones[z].ambientBeats.length > 0, `${z} ambientBeats`);
  assert.ok(typeof zones[z].art === "string" && zones[z].art.startsWith("assets/"), `${z} art`);
}

const encounters = JSON.parse(read("content/v1/encounters.json"));
assert.ok(encounters.zoneAmbient, "missing zoneAmbient tables");
for (const z of requiredZones) {
  assert.ok(Array.isArray(encounters.zoneAmbient[z]) && encounters.zoneAmbient[z].length > 0, `ambient ${z}`);
}

const dialogue = JSON.parse(read("content/v1/dialogue.json"));
assert.ok(dialogue.aiByMood && dialogue.aiByLocation && dialogue.aiReactive, "dialogue AI keys");
assert.ok(Array.isArray(dialogue.aiReactive) && dialogue.aiReactive.length >= 3, "reactive rules");

const renderSrcCheck = read("js/ui/render.js");
assert.ok(renderSrcCheck.includes("ai-portrait"), "missing AI portrait hook");
assert.ok(renderSrcCheck.includes("zone-art"), "missing zone art hook");
assert.ok(renderSrcCheck.includes("aiStatusSummary") || renderSrcCheck.includes("ai-memory"), "missing AI memory/mood");

const indexSrc = read("index.html");
assert.ok(indexSrc.includes("assets/hero.jpg"), "index should use optimized hero art");
assert.ok(!indexSrc.includes('src="Ai.png"'), "index should not ship raw multi-MB Ai.png");

const requiredActions = [
  "collect_gold",
  "talk_to_ai",
  "discover_secrets",
  "battle_dragon",
  "collect_tears",
  "upgrade_ai",
  "navigate_void",
  "repair_lattice",
  "face_elohim",
  "claim_victory",
  "sacrifice_ai",
];
const actionsSrc = read("js/core/actions.js");
for (const action of requiredActions) {
  assert.ok(
    actionsSrc.includes(`${action}`) || actionsSrc.includes(`"${action}"`),
    `missing action ${action}`
  );
}

const renderSrc = read("js/ui/render.js");
assert.ok(renderSrc.includes("data-travel"), "missing travel hooks");
assert.ok(renderSrc.includes("data-new-game"), "missing restart hooks");
assert.ok(renderSrc.includes("renderInventory") || renderSrc.includes("Inventory"), "missing inventory UI");
assert.ok(renderSrc.includes("bossGateMissing") || renderSrc.includes("Chamber checklist"), "missing checklist");

const saveSrc = read("js/core/save.js");
assert.ok(saveSrc.includes("voidshatterecho_save_v1"), "missing save key");
assert.ok(saveSrc.includes("serializeState") && saveSrc.includes("parseSave"), "missing save API");

const stateSrc = read("js/core/state.js");
assert.ok(stateSrc.includes("game_over"), "missing game_over");
assert.ok(stateSrc.includes("victory"), "missing victory");

// every js module parses as ESM via dynamic import check is done in tests; here ensure no require(
for (const file of listJs(join(root, "js"))) {
  const text = readFileSync(file, "utf8");
  assert.ok(!/\brequire\s*\(/.test(text), `${file} should be ESM without require()`);
}

const gameSrc = read("js/game.js");
assert.ok(gameSrc.includes("localStorage"), "shell must persist with localStorage");
assert.ok(gameSrc.includes("loadContent"), "shell must load content pack");
assert.ok(gameSrc.includes("run_end") || gameSrc.includes("runEnd"), "shell must emit run_end analytics");
assert.ok(gameSrc.includes("togglePause"), "shell must support pause");
assert.ok(gameSrc.includes("exportSave") && gameSrc.includes("importSave"), "shell must export/import save");

const analyticsSrc = read("js/core/analytics.js");
assert.ok(analyticsSrc.includes("run_end"), "analytics must define run_end");
assert.ok(!/\bemail\b|ipAddress|userId/i.test(analyticsSrc), "analytics must stay privacy-light");

const indexMeta = read("index.html");
assert.ok(indexMeta.includes("og:title"), "index missing OG tags");
assert.ok(indexMeta.includes("manifest.webmanifest"), "index missing manifest");
assert.ok(indexMeta.includes("css/tokens.css"), "index missing CSS tokens");

const renderUx = read("js/ui/render.js");
assert.ok(renderUx.includes("data-pause"), "missing pause hook");
assert.ok(renderUx.includes("data-export-save"), "missing export hook");
assert.ok(renderUx.includes("data-import-save"), "missing import hook");

const saveSrcFull = read("js/core/save.js");
assert.ok(saveSrcFull.includes("migrateSaveData"), "save must expose migration path");
assert.ok(saveSrcFull.includes("SAVE_MIGRATIONS"), "save must define migration table");

const ciYml = read(".github/workflows/ci.yml");
assert.ok(ciYml.includes("code-quality"), "CI must provide code-quality check name");
assert.ok(ciYml.includes("security-scan"), "CI must provide security-scan check name");

const howToWin = [
  "Discover Secrets",
  "Void Key",
  "Dragon",
  "Repair",
  "bond",
  "Victory",
];
for (const token of howToWin) {
  assert.ok(read("README.md").includes(token), `README How to play missing: ${token}`);
}

// Game JS budget: raw under 150 KB (gzip asserted in CI; keep local slack)
let jsBytes = 0;
function walkJs(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full);
    else if (name.endsWith(".js")) jsBytes += statSync(full).size;
  }
}
walkJs(join(root, "js"));
assert.ok(jsBytes < 150 * 1024, `game JS too large: ${jsBytes} bytes`);

console.log("smoke ok");
