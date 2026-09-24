#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const gameJs = read("js/game.js");
const gameHtml = read("game.html");
const indexHtml = read("index.html");
const pkg = JSON.parse(read("package.json"));

assert.ok(gameJs.includes("SAVE_KEY"), "missing SAVE_KEY");
assert.ok(gameJs.includes("voidshatterecho_save_v1"), "missing save schema key");
assert.ok(gameJs.includes("game_over"), "missing game_over phase");
assert.ok(gameJs.includes("victory"), "missing victory phase");
assert.ok(gameJs.includes("localStorage"), "missing localStorage persistence");
assert.ok(gameJs.includes("data-travel"), "missing travel hooks");
assert.ok(gameJs.includes("data-new-game"), "missing restart hooks");
assert.ok(gameJs.includes("renderInventory"), "missing inventory UI");
assert.ok(gameJs.includes("bossGateMissing"), "missing boss checklist");
assert.ok(gameJs.includes('case "discover_secrets"'), "missing discover_secrets handler");
assert.ok(gameJs.includes('case "sacrifice_ai"'), "missing sacrifice_ai handler");

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
for (const action of requiredActions) {
  assert.ok(gameJs.includes(`"${action}"`), `missing action ${action}`);
}

assert.ok(gameHtml.includes('id="game-container"'), "game.html missing #game-container");
assert.ok(gameHtml.includes("js/game.js"), "game.html missing game.js");
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

console.log("smoke ok");
